import "./env";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CreateBucketCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { apple, sout } from "../src/domain/fixtures";
import type { Draft } from "../src/domain/review";
import { createDraft, decide, reviewDetail } from "../src/server/archive";
import { passwordHash, type User } from "../src/server/auth";
import { db } from "../src/server/db";
import { prepareOriginal, storage } from "../src/server/storage";

const samplePassword = "LocalRecipeSample2026!";
const seedIds = ["bb8cb31b-97f8-4ef6-83c4-0f3a7b832ecd", "573be634-9f66-4050-a26a-5adf239722ff"];

async function seed() {
  if (!process.env.DATABASE_URL || !["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname)
    || !process.env.S3_ENDPOINT || !["localhost", "127.0.0.1"].includes(new URL(process.env.S3_ENDPOINT).hostname)) {
    throw new Error("Fixtures are restricted to local PostgreSQL and S3.");
  }
  const { client, bucket } = storage();
  try { await client.send(new HeadBucketCommand({ Bucket: bucket })); }
  catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode !== 404) throw error;
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  }
  const users: User[] = [];
  for (const role of ["owner", "admin", "reader"] as const) {
    const email = `${role}@recipes.test`;
    await db().query("INSERT INTO account VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING",
      [randomUUID(), email, await passwordHash(samplePassword), role]);
    const { rows } = await db().query<User>("SELECT id, email, role FROM account WHERE email = $1", [email]);
    users.push(rows[0]);
  }
  for (const [index, item] of [apple, sout].entries()) {
    const id = seedIds[index];
    if (await reviewDetail(id)) continue;
    const sources = new Map(item.sources.map((source) => [source.id, randomUUID()]));
    const ingredients = new Map(item.ingredients.map((ingredient) => [ingredient.id, randomUUID()]));
    const sourceId = (key: string) => sources.get(key)!;
    const draft: Draft = {
      title: item.title + " · Δείγμα", category: item.category, aliases: item.aliases, note: item.note,
      servings: item.servings && { ...item.servings, sourceId: sourceId(item.servings.sourceId) },
      total: item.total && { ...item.total, sourceId: sourceId(item.total.sourceId) },
      sources: item.sources.map((source) => ({ id: sourceId(source.id), transcription: source.transcription, description: source.description })),
      ingredients: item.ingredients.map((ingredient) => ({ ...ingredient, id: ingredients.get(ingredient.id)!, sourceId: sourceId(ingredient.sourceId) })),
      steps: item.steps.map((step) => ({ ...step, sourceId: sourceId(step.sourceId), timeSourceId: step.timeSourceId && sourceId(step.timeSourceId),
        ingredientIds: step.ingredientIds.map((key) => ingredients.get(key)!) })),
      issues: item.issues.map((issue) => ({ ...issue, id: randomUUID(),
        evidence: issue.evidence.map((part) => ({ ...part, sourceId: sourceId(part.sourceId) })) })),
    };
    const files = await Promise.all(item.sources.map(async (source) => prepareOriginal(await readFile(`fixtures/images/${source.id}.png`))));
    await createDraft(id, users[0], draft, files);
  }
  const complete = await reviewDetail(seedIds[0]);
  if (complete?.revision === 1 && !complete.row.published) {
    await decide(seedIds[0], users[0], { revision: 1, type: "publish", humanConfirmed: true, draft: complete.draft });
  }
  console.log("Local accounts and sample recipes are ready.");
}
seed().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => process.env.DATABASE_URL && db().end());
