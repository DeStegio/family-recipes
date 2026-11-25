import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { db, transaction } from "./db";
import { type User, canEdit } from "./auth";
import { RequestError } from "./http";
import { compareRecipes, type Draft, type decisionSchema } from "@/domain/review";
import { evidenceErrors, publicationErrors, type Recipe } from "@/domain/recipe";
import { putOriginal, type Original, type prepareOriginal } from "./storage";
import type { z } from "zod";

type Queryable = Pool | PoolClient;
type Row = { id: string; head: number; published: number | null; linked_to: string | null; variant_of: string | null; created_at: Date };
type Snapshot = { id: string; draft: Draft; revision: number; action: string };

const sourceUrl = (recipe: string, source: string) => `/api/recipes/${recipe}/sources/${source}`;
export const asRecipe = (id: string, draft: Draft): Recipe => ({
  ...draft, id, sources: draft.sources.map((source) => ({ ...source, url: sourceUrl(id, source.id) })),
});

const versionSql = `
  SELECT v.recipe_id AS id, v.revision, v.action,
    v.document || jsonb_build_object(
      'sources', COALESCE((SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', s.original_id, 'transcription', s.transcription, 'description', s.description)) ORDER BY ro.position)
        FROM source_version s JOIN recipe_original ro ON ro.recipe_id = s.recipe_id AND ro.original_id = s.original_id
        WHERE s.recipe_id = v.recipe_id AND s.revision = v.revision), '[]'::jsonb),
      'issues', COALESCE((SELECT jsonb_agg(i.detail ORDER BY i.issue_id)
        FROM review_issue i WHERE i.recipe_id = v.recipe_id AND i.revision = v.revision), '[]'::jsonb)
    ) AS draft
  FROM recipe_version v JOIN recipe r ON r.id = v.recipe_id`;

export async function publishedRecipes() {
  const { rows } = await db().query<Snapshot>(versionSql + " WHERE v.revision = r.published AND r.linked_to IS NULL ORDER BY r.created_at DESC");
  return rows.map(({ id, draft }) => asRecipe(id, draft));
}

export async function publishedRecipe(id: string) {
  const { rows } = await db().query<Snapshot>(versionSql + " WHERE r.id = $1 AND v.revision = r.published AND r.linked_to IS NULL", [id]);
  return rows[0] ? asRecipe(id, rows[0].draft) : undefined;
}

async function loadHead(client: Queryable, id: string) {
  const { rows } = await client.query<Snapshot>(versionSql + " WHERE r.id = $1 AND v.revision = r.head", [id]);
  return rows[0];
}

export async function reviewQueue() {
  const { rows } = await db().query<Snapshot & { created_at: Date }>(
    `SELECT q.*, r.created_at FROM (${versionSql} WHERE r.linked_to IS NULL AND r.head IS DISTINCT FROM r.published AND v.revision = r.head) q
     JOIN recipe r ON r.id = q.id ORDER BY r.created_at DESC`);
  return rows;
}

async function duplicates(client: Queryable, id: string, draft: Draft) {
  const { rows } = await client.query<Snapshot>(versionSql + " WHERE r.id <> $1 AND r.linked_to IS NULL AND v.revision = r.head ORDER BY r.created_at DESC", [id]);
  return rows.map((item) => ({ ...item, similarity: compareRecipes(draft, item.draft) }))
    .filter(({ similarity }) => similarity.title >= .5 || similarity.score >= .42 || (similarity.ingredients ?? 0) >= .8)
    .sort((a, b) => b.similarity.score - a.similarity.score).slice(0, 5);
}

export async function reviewDetail(id: string) {
  const head = await loadHead(db(), id);
  if (!head) return;
  const { rows } = await db().query<Row>("SELECT * FROM recipe WHERE id = $1", [id]);
  const { rows: history } = await db().query<{ revision: number; action: string; created_at: Date; actor: string }>(
    "SELECT v.revision, v.action, v.created_at, a.email AS actor FROM recipe_version v JOIN account a ON a.id = v.actor_id WHERE v.recipe_id = $1 ORDER BY v.revision DESC", [id]);
  return { ...head, row: rows[0], history, duplicates: rows[0].linked_to ? [] : await duplicates(db(), id, head.draft) };
}

export async function findOriginal(recipeId: string, sourceId: string, user: User, review: boolean) {
  const { rows } = await db().query<{ object_key: string }>(`
    SELECT o.object_key FROM original o JOIN source_version s ON s.original_id = o.id
    JOIN recipe r ON r.id = s.recipe_id
    WHERE r.id = $1 AND o.id::text = $2 AND (
      ($3 AND s.revision = r.head)
      OR (NOT $3 AND r.linked_to IS NULL AND s.revision = r.published)
    )`, [recipeId, sourceId, review && canEdit(user)]);
  return rows[0]?.object_key;
}

function validateDraft(draft: Draft) {
  const recipe = asRecipe("", draft);
  const sourceIds = new Set(draft.sources.map((source) => source.id));
  const idsMatch = (ids: string[]) => new Set(ids).size === ids.length;
  if (!idsMatch(draft.sources.map((item) => item.id)) || !idsMatch(draft.issues.map((item) => item.id))
    || !idsMatch(draft.ingredients.map((item) => item.id))) throw new RequestError(400, "Υπάρχει διπλή καταχώριση πεδίου.");
  const pointers = [draft.servings?.sourceId, draft.total?.sourceId, ...draft.ingredients.map((item) => item.sourceId),
    ...draft.steps.flatMap((item) => [item.sourceId, item.timeSourceId]), ...draft.issues.map((item) => item.resolution?.sourceId)];
  if (pointers.some((id) => id && !sourceIds.has(id))) throw new RequestError(400, "Κάποιο πεδίο αναφέρεται σε άγνωστη πηγή.");
  if (draft.steps.some((step) =>
    step.ingredientIds.some((id) => !draft.ingredients.some((ingredient) => ingredient.id === id)) || !idsMatch(step.ingredientIds)
    || (step.minutes !== undefined) !== (step.timeSourceId !== undefined))) {
    throw new RequestError(400, "Έλεγξε τα υλικά των βημάτων και τις πηγές χρονομέτρησης.");
  }
  const errors = evidenceErrors(recipe);
  if (errors.length) throw new RequestError(400, errors.join(" "));
}

async function writeVersion(client: Queryable, id: string, revision: number, actor: string, action: string, draft: Draft) {
  const { sources, issues, ...document } = draft;
  await client.query("INSERT INTO recipe_version (recipe_id, revision, actor_id, action, document) VALUES ($1,$2,$3,$4,$5)", [id, revision, actor, action, document]);
  for (const source of sources) {
    await client.query("INSERT INTO source_version VALUES ($1,$2,$3,$4,$5)", [id, revision, source.id, source.transcription, source.description ?? null]);
  }
  for (const issue of issues) {
    await client.query("INSERT INTO review_issue VALUES ($1,$2,$3,$4)", [id, revision, issue.id, issue]);
  }
}

async function addOriginals(client: PoolClient, id: string, originals: Original[]) {
  for (const [index, original] of originals.entries()) {
    await client.query("INSERT INTO original (id, object_key, content_type, sha256, size_bytes) VALUES ($1,$2,$3,$4,$5)",
      [original.id, original.objectKey, original.contentType, original.hash, original.size]);
    await client.query("INSERT INTO recipe_original VALUES ($1,$2,$3)", [id, original.id, index + 1]);
  }
}

export async function createDraft(id: string, actor: User, draft: Draft, files: Awaited<ReturnType<typeof prepareOriginal>>[]) {
  if (!canEdit(actor)) throw new RequestError(403, "Η ενέργεια απαιτεί δικαιώματα διαχείρισης.");
  validateDraft(draft);
  return transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [id]);
    const existing = await client.query<{ actor_id: string }>("SELECT actor_id FROM recipe_version WHERE recipe_id = $1 AND revision = 1", [id]);
    if (existing.rowCount) {
      if (existing.rows[0].actor_id !== actor.id) throw new RequestError(409, "Το αναγνωριστικό εισαγωγής χρησιμοποιείται ήδη.");
      return id;
    }
    const originals = [];
    const remap = new Map<string, string>();
    for (const [index, file] of files.entries()) {
      const fresh = randomUUID();
      remap.set(draft.sources[index].id, fresh);
      originals.push(await putOriginal({ ...file, id: fresh, objectKey: `originals/${fresh}` }));
    }
    const replace = (sourceId: string) => remap.get(sourceId)!;
    const imported: Draft = {
      ...draft,
      sources: draft.sources.map((item) => ({ ...item, id: replace(item.id) })),
      ingredients: draft.ingredients.map((item) => ({ ...item, sourceId: replace(item.sourceId) })),
      steps: draft.steps.map((item) => ({ ...item, sourceId: replace(item.sourceId), timeSourceId: item.timeSourceId && replace(item.timeSourceId) })),
      servings: draft.servings && { ...draft.servings, sourceId: replace(draft.servings.sourceId) },
      total: draft.total && { ...draft.total, sourceId: replace(draft.total.sourceId) },
      issues: draft.issues.map((item) => ({
        ...item, evidence: item.evidence.map((part) => ({ ...part, sourceId: replace(part.sourceId) })),
        resolution: item.resolution && { ...item.resolution, sourceId: replace(item.resolution.sourceId) },
      })),
    };
    await client.query("INSERT INTO recipe (id) VALUES ($1)", [id]);
    await addOriginals(client, id, originals);
    await writeVersion(client, id, 1, actor.id, "import", imported);
    return id;
  });
}

export async function decide(id: string, actor: User, input: z.infer<typeof decisionSchema>) {
  if (!canEdit(actor)) throw new RequestError(403, "Η ενέργεια απαιτεί δικαιώματα διαχείρισης.");
  const { type, target, draft } = input;
  const relates = type === "link" || type === "variant";
  if (relates && (!target || target === id)) throw new RequestError(400, "Επίλεξε άλλη καταχώριση.");
  validateDraft(draft);
  return transaction(async (client) => {
    if (relates || type === "new") await client.query("SELECT pg_advisory_xact_lock(548120955)");
    const { rows } = await client.query<Row>("SELECT * FROM recipe WHERE id = ANY($1::text[]) ORDER BY id FOR UPDATE", [relates ? [id, target] : [id]]);
    const row = rows.find((item) => item.id === id);
    if (!row || row.linked_to) throw new RequestError(404, "Το προσχέδιο δεν είναι διαθέσιμο.");
    if (row.head !== input.revision) throw new RequestError(409, "Το προσχέδιο άλλαξε. Ανανέωσε τη σελίδα.");
    const previous = await loadHead(client, id);
    if (previous.draft.sources.map((item) => item.id).join() !== draft.sources.map((item) => item.id).join()) {
      throw new RequestError(400, "Διατήρησε όλα τα πρωτότυπα με την ίδια σειρά.");
    }
    if (previous.draft.issues.some((issue) => issue.essential && !draft.issues.some((current) => current.id === issue.id && current.essential))) {
      throw new RequestError(400, "Διατήρησε τα ουσιώδη θέματα και κατέγραψε ανθρώπινη διόρθωση όταν επιλυθούν.");
    }
    const next = row.head + 1;
    const other = rows.find((item) => item.id === target && item.id !== id);
    if (relates && (!other || other.linked_to)) throw new RequestError(404, "Η καταχώριση σύνδεσης δεν είναι διαθέσιμη.");
    if (type === "publish") {
      const errors = publicationErrors(asRecipe(id, draft), input.humanConfirmed === true);
      const matches = await duplicates(client, id, draft);
      const recorded = await client.query("SELECT 1 FROM recipe_version WHERE recipe_id = $1 AND action = 'new' LIMIT 1", [id]);
      if (matches.length && !row.variant_of && !recorded.rowCount && !row.published) errors.push("Κατέγραψε πρώτα ανθρώπινη απόφαση για το πιθανό διπλότυπο.");
      if (errors.length) throw new RequestError(422, errors.join(" "));
    }
    if (type === "link" && other) {
      if (row.published) throw new RequestError(409, "Η σύνδεση πηγών ξεκινά από αδημοσίευτο προσχέδιο.");
      const destination = await loadHead(client, other.id);
      const existing = new Set(destination.draft.sources.map((item) => item.id));
      const added = draft.sources.filter((item) => !existing.has(item.id));
      if (destination.draft.sources.length + added.length > 60) throw new RequestError(422, "Η καταχώριση μπορεί να έχει έως 60 πρωτότυπα.");
      for (const [index, source] of added.entries()) {
        await client.query("INSERT INTO recipe_original VALUES ($1,$2,$3)", [other.id, source.id, destination.draft.sources.length + index + 1]);
      }
      const incomingIssues = draft.issues.map((issue) => ({ ...issue, id: randomUUID() }));
      await writeVersion(client, other.id, other.head + 1, actor.id, "received:" + id, {
        ...destination.draft, sources: [...destination.draft.sources, ...added],
        issues: [...destination.draft.issues, ...incomingIssues, { id: randomUUID(), kind: "uncertain", text: "Έλεγξε τις νέες πηγές σε σχέση με τη δομημένη συνταγή.", essential: true, evidence: [] }],
      });
      await client.query("UPDATE recipe SET head = head + 1 WHERE id = $1", [other.id]);
      await writeVersion(client, id, next, actor.id, "link:" + other.id, draft);
      await client.query("UPDATE recipe SET head = $2, linked_to = $3 WHERE id = $1", [id, next, other.id]);
      return other.id;
    }
    if (type === "variant" && other) {
      const { rowCount } = await client.query(`
        WITH RECURSIVE lineage(id, variant_of) AS (
          SELECT id, variant_of FROM recipe WHERE id = $1
          UNION SELECT r.id, r.variant_of FROM recipe r JOIN lineage ON r.id = lineage.variant_of
        ) SELECT 1 FROM lineage WHERE id = $2`, [other.id, id]);
      if (rowCount) throw new RequestError(409, "Αυτή η παραλλαγή θα δημιουργούσε κυκλική σύνδεση.");
      await client.query("UPDATE recipe SET variant_of = $2 WHERE id = $1", [id, other.id]);
    }
    if (type === "new") await client.query("UPDATE recipe SET variant_of = NULL WHERE id = $1", [id]);
    await writeVersion(client, id, next, actor.id, type === "variant" ? "variant:" + target : type, draft);
    await client.query("UPDATE recipe SET head = $2, published = CASE WHEN $3 THEN $2 ELSE published END WHERE id = $1",
      [id, next, type === "publish"]);
    return id;
  });
}
