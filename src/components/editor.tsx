"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { categories, issueLabels, type Issue, type Recipe } from "@/domain/recipe";
import type { compareRecipes, Draft } from "@/domain/review";
import { IssueList, Viewer } from "./recipe-view";

type Decision = "save" | "publish" | "link" | "variant" | "new";
type Candidate = { id: string; draft: Draft; similarity: ReturnType<typeof compareRecipes> };
const newId = () => crypto.randomUUID();
const blank: Draft = { title: "", category: "sweets", aliases: [], sources: [], ingredients: [], steps: [], issues: [] };
const maxPhotos = 6;
const allowedImages = [".jpg", ".jpeg", ".png", ".webp"];

function SourceSelect({ sources, value, onChange, label = "Πηγή" }: {
  sources: Draft["sources"]; value: string; onChange: (value: string) => void; label?: string;
}) {
  return <label>{label}<select required value={value} onChange={(event) => onChange(event.target.value)}>
    {sources.map((source, index) => <option value={source.id} key={source.id}>Πρωτότυπο {index + 1}</option>)}
  </select></label>;
}

function QuantityFields({ draft, update }: { draft: Draft; update: (draft: Draft) => void }) {
  const first = draft.sources[0].id;
  return <div className="field-grid">
    <label>Μερίδες όπως αναγράφονται<input placeholder="π.χ. 8 κομμάτια" value={draft.servings?.text ?? ""} maxLength={80} onChange={(event) => {
      const value = event.target.value;
      update({ ...draft, servings: value ? { text: value, sourceId: draft.servings?.sourceId ?? first } : undefined });
    }} /></label>
    {draft.servings && <SourceSelect label="Πηγή μερίδων" sources={draft.sources} value={draft.servings.sourceId}
      onChange={(sourceId) => update({ ...draft, servings: { text: draft.servings!.text, sourceId } })} />}
    <label>Συνολικός χρόνος σε λεπτά<input type="number" min={1} max={1440} value={draft.total?.minutes ?? ""} onChange={(event) => {
      const value = event.target.valueAsNumber;
      update({ ...draft, total: Number.isFinite(value) ? { minutes: value, sourceId: draft.total?.sourceId ?? first } : undefined });
    }} /></label>
    {draft.total && <SourceSelect label="Πηγή συνολικού χρόνου" sources={draft.sources} value={draft.total.sourceId}
      onChange={(sourceId) => update({ ...draft, total: { minutes: draft.total!.minutes, sourceId } })} />}
  </div>;
}

function StructuredFields({ draft, update }: { draft: Draft; update: (draft: Draft) => void }) {
  const first = draft.sources[0].id;
  return <section className="editor-section">
    <h2>Δομημένο προσχέδιο</h2>
    <label>Οικογενειακή σημείωση<textarea rows={2} maxLength={3000} value={draft.note ?? ""} onChange={(event) => update({ ...draft, note: event.target.value })} /></label>
    <QuantityFields draft={draft} update={update} />
    <h3>Υλικά</h3>
    {draft.ingredients.map((ingredient, index) => {
      const change = (next: Partial<typeof ingredient>) => update({ ...draft, ingredients: draft.ingredients.map((item) => item.id === ingredient.id ? { ...item, ...next } : item) });
      return <fieldset key={ingredient.id} className="editor-box">
        <legend>Υλικό {index + 1}</legend>
        <label>Ποσότητα και υλικό<input required maxLength={300} placeholder="π.χ. ένα ποτήρι νερό" value={ingredient.text} onChange={(event) => change({ text: event.target.value })} /></label>
        <SourceSelect sources={draft.sources} value={ingredient.sourceId} onChange={(sourceId) => change({ sourceId })} />
        <label className="check"><input type="checkbox" checked={ingredient.confirmed} onChange={(event) => change({ confirmed: event.target.checked })} /> Επιβεβαιωμένο υλικό και ποσότητα</label>
        <button type="button" onClick={() => update({ ...draft, ingredients: draft.ingredients.filter((item) => item.id !== ingredient.id),
          steps: draft.steps.map((step) => ({ ...step, ingredientIds: step.ingredientIds.filter((id) => id !== ingredient.id) })) })}>Αφαίρεση υλικού</button>
      </fieldset>;
    })}
    <button type="button" onClick={() => update({ ...draft, ingredients: [...draft.ingredients, { id: newId(), text: "", sourceId: first, confirmed: false }] })}>Προσθήκη υλικού</button>
    <h3>Βήματα</h3>
    {draft.steps.map((step, index) => {
      const change = (next: Partial<typeof step>) => update({ ...draft, steps: draft.steps.map((item, position) => position === index ? { ...item, ...next } : item) });
      return <fieldset className="editor-box" key={index}>
        <legend>Βήμα {index + 1}</legend>
        <label>Τίτλος βήματος<input required maxLength={150} value={step.title} onChange={(event) => change({ title: event.target.value })} /></label>
        <label>Οδηγία<textarea required rows={3} maxLength={3000} value={step.text} onChange={(event) => change({ text: event.target.value })} /></label>
        <SourceSelect sources={draft.sources} value={step.sourceId} onChange={(sourceId) => change({ sourceId })} />
        <label>Διάρκεια χρονομέτρου σε λεπτά<input type="number" min={1} max={1440} value={step.minutes ?? ""} onChange={(event) => {
          const value = event.target.valueAsNumber;
          change(Number.isFinite(value) ? { minutes: value, timeSourceId: step.timeSourceId ?? step.sourceId } : { minutes: undefined, timeSourceId: undefined });
        }} /></label>
        {step.minutes !== undefined && <SourceSelect label="Πηγή διάρκειας" sources={draft.sources} value={step.timeSourceId!} onChange={(timeSourceId) => change({ timeSourceId })} />}
        {draft.ingredients.length > 0 && <fieldset><legend>Υλικά για αυτό το βήμα</legend>
          {draft.ingredients.map((ingredient, position) => <label className="check" key={ingredient.id}>
            <input type="checkbox" checked={step.ingredientIds.includes(ingredient.id)} onChange={(event) => change({
              ingredientIds: event.target.checked ? [...step.ingredientIds, ingredient.id] : step.ingredientIds.filter((id) => id !== ingredient.id),
            })} /> {ingredient.text || `Υλικό ${position + 1}`}
          </label>)}
        </fieldset>}
        <button type="button" onClick={() => update({ ...draft, steps: draft.steps.filter((_, position) => position !== index) })}>Αφαίρεση βήματος</button>
      </fieldset>;
    })}
    <button type="button" onClick={() => update({ ...draft, steps: [...draft.steps, { title: "", text: "", sourceId: first, ingredientIds: [] }] })}>Προσθήκη βήματος</button>
  </section>;
}

function ReviewFields({ draft, update, locked }: { draft: Draft; update: (draft: Draft) => void; locked: Set<string> }) {
  return <section className="editor-section">
    <h2>Αβεβαιότητες και διορθώσεις</h2>
    {draft.issues.map((issue, index) => {
      const change = (next: Partial<Issue>) => update({ ...draft, issues: draft.issues.map((item) => item.id === issue.id ? { ...item, ...next } : item) });
      return <fieldset className="editor-box" key={issue.id}>
        <legend>Θέμα {index + 1}</legend>
        <label>Είδος θέματος<select value={issue.kind} onChange={(event) => change({ kind: event.target.value as Issue["kind"] })}>
          {Object.entries(issueLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></label>
        <label>Πεδίο ή σημείωση<input required maxLength={1000} value={issue.text} onChange={(event) => change({ text: event.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={issue.essential} disabled={locked.has(issue.id)} onChange={(event) => change({ essential: event.target.checked })} /> Ουσιώδες για τη δημοσίευση</label>
        {issue.evidence.map((evidence, i) => {
          const replace = (part: typeof evidence) => change({ evidence: issue.evidence.map((item, position) => position === i ? part : item) });
          return <div key={i} className="field-grid evidence">
            <SourceSelect label={`Πηγή αποσπάσματος ${i + 1}`} sources={draft.sources} value={evidence.sourceId} onChange={(sourceId) => replace({ ...evidence, sourceId })} />
            <label>Αυτούσιο απόσπασμα {i + 1}<input required maxLength={1000} value={evidence.quote} onChange={(event) => replace({ ...evidence, quote: event.target.value })} /></label>
            <button type="button" onClick={() => change({ evidence: issue.evidence.filter((_, position) => position !== i) })}>Αφαίρεση αποσπάσματος</button>
          </div>;
        })}
        <button type="button" onClick={() => change({ evidence: [...issue.evidence, { sourceId: draft.sources[issue.evidence.length % draft.sources.length].id, quote: "" }] })}>Προσθήκη αποσπάσματος</button>
        <label>Ανθρώπινη διόρθωση ή επιβεβαίωση<textarea rows={2} maxLength={1000} value={issue.resolution?.text ?? ""} onChange={(event) =>
          change({ resolution: event.target.value ? { text: event.target.value, sourceId: issue.resolution?.sourceId ?? draft.sources[0].id } : undefined })} /></label>
        {issue.resolution && <SourceSelect label="Πηγή διόρθωσης" sources={draft.sources} value={issue.resolution.sourceId} onChange={(sourceId) => change({ resolution: { ...issue.resolution!, sourceId } })} />}
        {!locked.has(issue.id) && <button type="button" onClick={() => update({ ...draft, issues: draft.issues.filter((item) => item.id !== issue.id) })}>Αφαίρεση θέματος από το προσχέδιο</button>}
      </fieldset>;
    })}
    <button type="button" onClick={() => update({ ...draft, issues: [...draft.issues, { id: newId(), kind: "uncertain", text: "", essential: true, evidence: [] }] })}>Προσθήκη θέματος</button>
  </section>;
}

function SourcePanel({ draft, update, urls }: { draft: Draft; update: (draft: Draft) => void; urls: string[] }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const current = Math.min(index, draft.sources.length - 1);
  const source = draft.sources[current];
  const recipe = { ...draft, id: "", sources: draft.sources.map((item, i) => ({ ...item, url: urls[i] })) };
  return <section className="editor-section">
    <h2>Έλεγχος μεταγραφής</h2>
    <div className="source-grid">
      <div className="paper">
        <h3>Πρωτότυπο {current + 1} από {draft.sources.length}</h3>
        {urls[current] && <button type="button" className="preview-image" onClick={() => setOpen(true)} aria-label="Άνοιγμα φωτογραφίας">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urls[current]} referrerPolicy="no-referrer" alt={`Πρωτότυπο ${current + 1}`} />
        </button>}
        <div className="viewer-controls">
          <button type="button" disabled={current === 0} onClick={() => setIndex(current - 1)}>Προηγούμενο</button>
          <button type="button" disabled={current >= draft.sources.length - 1} onClick={() => setIndex(current + 1)}>Επόμενο</button>
        </div>
      </div>
      <div>
        <label>Πιστή μεταγραφή · Πηγή {current + 1}<textarea rows={11} maxLength={30000} value={source.transcription} placeholder="Μετάγραψε ό,τι διαβάζεται. Σημείωσε [δεν διαβάζεται] όπου χρειάζεται."
          onChange={(event) => update({ ...draft, sources: draft.sources.map((item, position) => position === current ? { ...item, transcription: event.target.value } : item) })} /></label>
        <label>Σημείωση για την πηγή<input maxLength={300} value={source.description ?? ""}
          onChange={(event) => update({ ...draft, sources: draft.sources.map((item, position) => position === current ? { ...item, description: event.target.value } : item) })} /></label>
      </div>
    </div>
    {open && <Viewer recipe={recipe} first={current} onClose={() => setOpen(false)} />}
  </section>;
}

function Comparison({ draft, id, candidates, target, setTarget }: {
  draft: Draft; id: string; candidates: Candidate[]; target: string; setTarget: (target: string) => void;
}) {
  const [gallery, setGallery] = useState<Recipe | null>(null);
  if (!candidates.length) return null;
  const selected = candidates.find((candidate) => candidate.id === target);
  const comparable = (item: Draft, key: string) => ({
    ...item, id: key, sources: item.sources.map((source) => ({ ...source, url: `/api/recipes/${key}/sources/${source.id}?review=1` })),
  });
  const percent = (value: number | null) => value === null ? "Χωρίς επαρκή στοιχεία" : `${Math.round(value * 100)}%`;
  return <section className="editor-section">
    <h2>Πιθανά διπλότυπα</h2>
    <label>Συνταγή για σύγκριση<select value={target} onChange={(event) => setTarget(event.target.value)}>
      <option value="">Επίλεξε καταχώριση</option>
      {candidates.map((item) => <option value={item.id} key={item.id}>{item.draft.title} · {item.id.slice(0, 8)}</option>)}
    </select></label>
    {selected && <>
      <dl className="metrics">
        <div><dt>Τίτλος / ονομασίες</dt><dd>{percent(selected.similarity.title)}</dd></div>
        <div><dt>Υλικά</dt><dd>{percent(selected.similarity.ingredients)}</dd></div>
        <div><dt>Αναλογίες</dt><dd>{percent(selected.similarity.proportions)}</dd></div>
        <div><dt>Βήματα</dt><dd>{percent(selected.similarity.steps)}</dd></div>
      </dl>
      <div className="source-grid">{[comparable(draft, id), comparable(selected.draft, selected.id)].map((recipe) => <article className="paper" key={recipe.id}>
        <h3>{recipe.title}</h3>
        {recipe.aliases.length > 0 && <p>{recipe.aliases.join(" · ")}</p>}
        {recipe.ingredients.length > 0 && <p>{recipe.ingredients.map((item) => item.text).join(" · ")}</p>}
        <button type="button" onClick={() => setGallery(recipe)}>Δες τις πηγές · {recipe.sources.length}</button>
      </article>)}</div>
    </>}
    {gallery && <Viewer recipe={gallery} first={0} onClose={() => setGallery(null)} />}
  </section>;
}

export function Editor({ initial = blank, record, candidates = [] }: {
  initial?: Draft; record?: { id: string; revision: number; published: boolean }; candidates?: Candidate[];
}) {
  const router = useRouter();
  const [draft, update] = useState(initial);
  const [selection, setSelection] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [importId, setImportId] = useState("");
  const [target, setTarget] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    return () => previews.forEach((url) => URL.revokeObjectURL(url));
  }, [previews]);

  function pick(files: File[]) {
    setError("");
    if (files.length > maxPhotos || files.some((file) => file.size > 8 * 1024 * 1024 || !allowedImages.some((extension) => file.name.toLowerCase().endsWith(extension)))) {
      setError("Επίλεξε έως έξι φωτογραφίες JPG, PNG ή WebP, έως 8 MB η καθεμία.");
      return;
    }
    setImportId(newId());
    setSelection(files);
    setPreviews(files.map((file) => URL.createObjectURL(file)));
    update({ ...blank, title: draft.title, category: draft.category, aliases: draft.aliases,
      sources: files.map((file) => ({ id: newId(), transcription: "", description: file.name.slice(0, 300) })) });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trigger = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const type = (trigger?.value || "save") as Decision;
    setBusy(true);
    setError("");
    setFeedback("");
    try {
      let result: Response;
      if (record) {
        result = await fetch(`/api/review/${record.id}`, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision: record.revision, type, target: target || undefined, humanConfirmed: confirmed, draft }) });
      } else {
        const body = new FormData();
        body.set("id", importId);
        body.set("draft", JSON.stringify(draft));
        selection.forEach((file) => body.append("photos", file));
        result = await fetch("/api/recipes", { method: "POST", body });
      }
      const data: { id?: string; error?: string } = await result.json();
      if (!result.ok || !data.id) throw new Error(data.error ?? "Η αποθήκευση απέτυχε.");
      setFeedback(type === "publish" ? "Η συνταγή δημοσιεύτηκε." : "Το προσχέδιο αποθηκεύτηκε.");
      router.replace(`/review/${data.id}?saved=${type === "publish" ? "published" : "draft"}`);
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Η αποθήκευση απέτυχε.");
    } finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="editor-form">
    <div className="field-grid">
      <label>Τίτλος συνταγής<input required maxLength={150} value={draft.title} onChange={(event) => update({ ...draft, title: event.target.value })} /></label>
      <label>Κατηγορία<select value={draft.category} onChange={(event) => update({ ...draft, category: event.target.value as Draft["category"] })}>
        {Object.entries(categories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    <label>Εναλλακτικές ονομασίες, μία ανά γραμμή<textarea rows={2} maxLength={3000} defaultValue={initial.aliases.join("\n")} onChange={(event) =>
      update({ ...draft, aliases: event.target.value.split("\n").map((item) => item.trim()).filter(Boolean) })} /></label>
    {!record && <section className="editor-section">
      <h2>Προσθήκη φωτογραφιών</h2>
      <label>Έως 6 φωτογραφίες, JPG, PNG ή WebP<input type="file" accept="image/jpeg,image/png,image/webp" multiple
        disabled={selection.length > 0} onChange={(event) => pick(Array.from(event.target.files ?? []))} /></label>
      {selection.length > 0 && <p>{selection.length} φωτογραφίες επιλέχθηκαν. Για άλλη επιλογή, ξεκίνησε νέα εισαγωγή.</p>}
    </section>}
    {draft.sources.length > 0 && <>
      <SourcePanel draft={draft} update={update} urls={record ? draft.sources.map((source) => `/api/recipes/${record.id}/sources/${source.id}?review=1`) : previews} />
      {record && <IssueList recipe={{ ...draft, sources: draft.sources.map((source) => ({ ...source, url: "" })) }} />}
      <StructuredFields draft={draft} update={update} />
      <ReviewFields draft={draft} update={update} locked={new Set(initial.issues.filter((issue) => issue.essential).map((issue) => issue.id))} />
      {record && <Comparison draft={draft} id={record.id} candidates={candidates} target={target} setTarget={setTarget} />}
      {record && <label className="check"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
        Επιβεβαιώνω ότι έλεγξα τις πηγές, τις ποσότητες και την εκτέλεση.</label>}
      <div className="form-actions">
        <button className="primary" type="submit" value="save" disabled={busy}>{busy ? "Αποθήκευση…" : "Αποθήκευση προσχεδίου"}</button>
        {record && <>
          {candidates.length > 0 && <>
            {!record.published && <button type="submit" value="link" disabled={busy || !target}>Σύνδεση στην υπάρχουσα</button>}
            <button type="submit" value="variant" disabled={busy || !target}>Καταχώριση ως παραλλαγή</button>
            <button type="submit" value="new" disabled={busy}>Νέα συνταγή</button>
          </>}
          <button type="submit" value="publish" disabled={busy || !confirmed}>Δημοσίευση</button>
        </>}
      </div>
    </>}
    {error && <p className="notice" role="alert">{error}</p>}
    {feedback && <p className="notice" role="status">{feedback}</p>}
    <Link className="text-link" href="/review">Πίσω στον έλεγχο</Link>
  </form>;
}
