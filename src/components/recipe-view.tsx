"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { categories, issueLabels, type Recipe } from "@/domain/recipe";
import { Favorite } from "./favorites";

export function IssueList({ recipe }: { recipe: Pick<Recipe, "issues" | "sources"> }) {
  if (!recipe.issues.length) return null;
  return <section className="issues" aria-label="Εκκρεμότητες ελέγχου">
    <h2>Θέματα προς έλεγχο</h2>
    {recipe.issues.map((issue) => <article className="notice" key={issue.id}>
      <h3>{issueLabels[issue.kind]}{issue.essential && " · Ουσιώδες"}</h3>
      <p>{issue.text}</p>
      {issue.evidence.length > 0 && <ul>{issue.evidence.map((item, index) => <li key={index}>
        <strong>{item.quote}</strong> · Πρωτότυπο {recipe.sources.findIndex((source) => source.id === item.sourceId) + 1}
      </li>)}</ul>}
      {issue.resolution && <p><strong>Ανθρώπινη επιβεβαίωση:</strong> {issue.resolution.text} · Πρωτότυπο {recipe.sources.findIndex((source) => source.id === issue.resolution!.sourceId) + 1}</p>}
    </article>)}
  </section>;
}

export function Viewer({ recipe, first, onClose }: { recipe: Recipe; first: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(first);
  const [tab, setTab] = useState<"photo" | "text">("photo");
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [ratio, setRatio] = useState(3 / 4);
  const source = recipe.sources[index];

  useEffect(() => {
    const node = dialog.current!;
    node.showModal();
    document.body.classList.add("modal-open");
    return () => { node.close(); document.body.classList.remove("modal-open"); };
  }, []);

  function move(next: number) {
    setIndex(next);
    setZoom(1);
    setTurn(0);
    setRatio(3 / 4);
    setExpanded(false);
  }

  return <dialog ref={dialog} className="viewer" aria-labelledby="source-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <div className="viewer-bar">
      <span className="brand">Το οικογενειακό τετράδιο</span>
      <button type="button" autoFocus onClick={onClose}>Κλείσιμο</button>
    </div>
    {recipe.sample && <p className="ribbon">Ενδεικτικές εικόνες · Δοκιμαστικά χειρόγραφα</p>}
    <div className="viewer-content">
      <h2 id="source-title">{recipe.title}</h2>
      <h3 aria-live="polite">Πρωτότυπο {index + 1} από {recipe.sources.length}</h3>
      <div className="viewer-controls">
        <button type="button" disabled={index === 0} onClick={() => move(index - 1)}>Προηγούμενο</button>
        <button type="button" disabled={index === recipe.sources.length - 1} onClick={() => move(index + 1)}>Επόμενο</button>
      </div>
      <div className="viewer-controls" role="group" aria-label="Προβολή πρωτοτύπου">
        <button type="button" aria-pressed={tab === "photo"} className={tab === "photo" ? "primary" : ""} onClick={() => setTab("photo")}>Φωτογραφία</button>
        <button type="button" aria-pressed={tab === "text"} className={tab === "text" ? "primary" : ""} onClick={() => setTab("text")}>Μεταγραφή</button>
      </div>
      {tab === "photo" ? <>
        <div className="viewer-controls tools" role="group" aria-label="Εργαλεία φωτογραφίας">
          <button type="button" disabled={zoom >= 3} onClick={() => setZoom(Math.min(3, zoom + .5))}><ZoomIn aria-hidden size={18} /> Μεγέθυνση</button>
          <button type="button" disabled={zoom <= 1} aria-label="Σμίκρυνση" onClick={() => setZoom(Math.max(1, zoom - .5))}><ZoomOut aria-hidden size={18} /></button>
          <button type="button" aria-label="Περιστροφή" onClick={() => setTurn((turn + 90) % 360)}><RotateCw aria-hidden size={18} /></button>
          <button type="button" aria-label={expanded ? "Επαναφορά προβολής" : "Μεγάλη προβολή"} aria-pressed={expanded} onClick={() => setExpanded(!expanded)}><Maximize2 aria-hidden size={18} /></button>
        </div>
        <div className={`paper ${expanded ? "expanded" : ""}`}>
          <p className="eyebrow">Φωτογραφία · Πηγή {index + 1}</p>
          <div className="photo-scroll" tabIndex={0} role="region" aria-label="Εικόνα χειρογράφου με δυνατότητα κύλισης">
            <button type="button" className="photo-button" aria-label="Άνοιγμα φωτογραφίας σε μεγάλη προβολή"
              onClick={() => { setExpanded(!expanded); setZoom(expanded ? 1 : 1.5); }}
              style={{ width: `${zoom * 100}%`, aspectRatio: turn % 180 ? 1 / ratio : ratio }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={source.id} src={source.url} referrerPolicy="no-referrer" onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalHeight > 0) setRatio(naturalWidth / naturalHeight);
              }} alt={`Σελίδα ${index + 1} για τη συνταγή «${recipe.title}»`}
                style={{ transform: `translate(-50%, -50%) rotate(${turn}deg)`, width: turn % 180 ? `${ratio * 100}%` : "100%", height: turn % 180 ? `${100 / ratio}%` : "100%" }} />
            </button>
          </div>
          {source.description && <p className="muted">{source.description}</p>}
        </div>
      </> : <section className="paper"><h4>Πιστή μεταγραφή · Πηγή {index + 1}</h4>
        <p className="transcription">{source.transcription || "Η μεταγραφή εκκρεμεί."}</p></section>}
    </div>
  </dialog>;
}

function Timer({ minutes }: { minutes: number }) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(minutes * 60);
  useEffect(() => {
    if (!deadline) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) setDeadline(null);
    };
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);
  return <div className="timer">
    <p><strong>{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</strong> · Χρονόμετρο</p>
    {remaining === 0 && <p role="status">Ο χρόνος τελείωσε.</p>}
    <button onClick={() => {
      if (deadline) setDeadline(null);
      else { const seconds = remaining || minutes * 60; setRemaining(seconds); setDeadline(Date.now() + seconds * 1000); }
    }}>{deadline ? "Παύση" : remaining === minutes * 60 || !remaining ? "Έναρξη χρονομέτρου" : "Συνέχεια χρονομέτρου"}</button>
    {remaining !== minutes * 60 && <button onClick={() => { setDeadline(null); setRemaining(minutes * 60); }}>Επαναφορά</button>}
  </div>;
}

export function RecipeView({ recipe, header, editor }: { recipe: Recipe; header: React.ReactNode; editor?: boolean }) {
  const [cooking, setCooking] = useState(false);
  const [index, setIndex] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [awake, setAwake] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const completed = index === recipe.steps.length;
  const step = recipe.steps[index];

  useEffect(() => {
    if (!cooking || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | undefined;
    let pending = false;
    let active = true;
    const acquire = async () => {
      if (pending || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      pending = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (!active) { await next.release(); return; }
        lock = next;
        setAwake(true);
        next.addEventListener("release", () => { if (active) setAwake(false); });
      } catch { if (active) setAwake(false); }
      finally { pending = false; }
    };
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", acquire);
      if (lock) void lock.release();
    };
  }, [cooking]);

  function openSource(event: React.MouseEvent<HTMLButtonElement>, first = 0) {
    opener.current = event.currentTarget;
    setViewer(first);
  }

  function provenance(sourceId: string, label = "Πηγή") {
    const index = recipe.sources.findIndex((source) => source.id === sourceId);
    return index >= 0 && <button className="provenance" onClick={(event) => openSource(event, index)}>{label} {index + 1}</button>;
  }

  function closeSource() {
    setViewer(null);
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  }

  function go(next: number) {
    setIndex(next);
    requestAnimationFrame(() => heading.current?.focus());
  }

  function exit() {
    setCooking(false);
    setAwake(false);
    requestAnimationFrame(() => startButton.current?.focus());
  }

  return <>
    {cooking ? <>
      <header className="cooking-header"><span className="brand">{recipe.title}</span><button onClick={exit}>Έξοδος</button></header>
      {recipe.sample && <p className="ribbon">Δοκιμαστική συνταγή · Δείγμα επίδειξης</p>}
      <main id="main" className="cook">
        <p className="step-count">{completed ? `${recipe.steps.length} βήματα ολοκληρώθηκαν` : `Βήμα ${index + 1} από ${recipe.steps.length}`}</p>
        <div className="segments" aria-hidden>{recipe.steps.map((_, position) => <span key={position} className={position <= index ? "done" : ""} />)}</div>
        <h1 ref={heading} tabIndex={-1}>{completed ? "Καλή απόλαυση!" : step.title}</h1>
        {!completed && <>
          <p className="instruction">{step.text}</p>
          {recipe.ingredients.some((item) => item.confirmed && step.ingredientIds.includes(item.id)) && <div className="needed">
            <h2 className="eyebrow">Θα χρειαστείς</h2>
            <ul>{step.ingredientIds.flatMap((id) => recipe.ingredients.filter((item) => item.confirmed && item.id === id)).map((item) => <li key={item.id}>{item.text}</li>)}</ul>
          </div>}
          {step.minutes && <Timer key={index} minutes={step.minutes} />}
        </>}
        <div className="cook-nav">
          <button disabled={!index} onClick={() => go(index - 1)}>Πίσω</button>
          <button className="primary" onClick={() => completed ? exit() : go(index + 1)}>
            {completed ? "Επιστροφή στη συνταγή" : index === recipe.steps.length - 1 ? "Ολοκλήρωση" : "Επόμενο"}
          </button>
        </div>
        {recipe.sources.length > 0 && <button className="wide" onClick={(event) => openSource(event)}>Δες το χειρόγραφο</button>}
        {awake && <p className="muted">Η οθόνη παραμένει ενεργή.</p>}
      </main>
    </> : <>
      {header}
      <main id="main" className="container recipe">
        <Link className="button back" href="/?view=all">Πίσω στις συνταγές</Link>
        <p className="eyebrow">{categories[recipe.category]}</p>
        <div className="title-row"><h1>{recipe.title}</h1><Favorite id={recipe.id} title={recipe.title} /></div>
        {recipe.note && <p className="recipe-note">{recipe.note}</p>}
        {(recipe.total || recipe.servings) && <div className="recipe-meta">
          {recipe.total && <span>{recipe.total.minutes} λεπτά συνολικά {provenance(recipe.total.sourceId)}</span>}
          {recipe.servings && <span>{recipe.servings.text} {provenance(recipe.servings.sourceId)}</span>}
        </div>}
        <div className={`recipe-actions ${recipe.steps.length && !recipe.archiveOnly ? "with-cooking" : ""}`}>
          {recipe.steps.length > 0 && !recipe.archiveOnly && <button ref={startButton} className="primary" onClick={() => { setIndex(0); setCooking(true); requestAnimationFrame(() => heading.current?.focus()); }}>Έναρξη μαγειρέματος</button>}
          {recipe.sources.length > 0 && <button onClick={(event) => openSource(event)}>Δες το χειρόγραφο</button>}
        </div>
        {editor && <Link className="text-link" href={`/review/${recipe.id}`}>Έλεγχος και ιστορικό</Link>}
        {recipe.sample && <p className="sample">Δοκιμαστική καταχώριση · Ενδεικτικό οικογενειακό τετράδιο</p>}
        {recipe.archiveOnly ? <>
          {recipe.sources.length > 0 ? <section><h2>Πιστές μεταγραφές</h2><div className="source-grid">
            {recipe.sources.map((source, position) => <article className="paper" key={source.id}>
              <h3>Πρωτότυπο {position + 1} από {recipe.sources.length}</h3>
              <p className="transcription">{source.transcription}</p>
              <button onClick={(event) => openSource(event, position)}>Δες την πηγή {position + 1}</button>
            </article>)}
          </div></section> : <p className="notice">Η δοκιμαστική καταχώριση θα συμπληρωθεί όταν υπάρχει πηγή.</p>}
        </> : <div className="recipe-columns">
          <section><h2>Υλικά</h2><p className="muted">Πάτησε όσα έχεις ετοιμάσει.</p>
            <ul className="ingredients">{recipe.ingredients.map((item) => <li key={item.id}>
              <label><input type="checkbox" checked={checked.includes(item.id)} onChange={(event) => {
                setChecked(event.target.checked ? [...checked, item.id] : checked.filter((id) => id !== item.id));
              }} /> {item.text}</label>{provenance(item.sourceId)}
            </li>)}</ul>
          </section>
          <section><h2>Εκτέλεση</h2><ol className="steps">{recipe.steps.map((item, position) => <li key={position}>
            <h3>{String(position + 1).padStart(2, "0")} / {item.title}</h3><p>{item.text}</p>
            {provenance(item.sourceId)}{item.timeSourceId && item.timeSourceId !== item.sourceId && provenance(item.timeSourceId, "Πηγή διάρκειας")}
          </li>)}</ol></section>
        </div>}
        <IssueList recipe={recipe} />
      </main>
    </>}
    {viewer !== null && <Viewer recipe={recipe} first={viewer} onClose={closeSource} />}
  </>;
}
