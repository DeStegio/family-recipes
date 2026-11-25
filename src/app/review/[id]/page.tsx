import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Editor } from "@/components/editor";
import { Shell } from "@/components/shell";
import { reviewDetail } from "@/server/archive";
import { canEdit, currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

const actions: Record<string, string> = {
  import: "Εισαγωγή", save: "Αποθήκευση προσχεδίου", publish: "Δημοσίευση",
  link: "Σύνδεση πηγών", received: "Προσθήκη συνδεδεμένων πηγών", variant: "Καταχώριση ως παραλλαγή", new: "Απόφαση για νέα συνταγή",
};

export default async function Review({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const user = await currentUser();
  if (!user && !demoMode()) redirect("/login");
  if (!canEdit(user)) notFound();
  const [{ id }, { saved }] = await Promise.all([params, searchParams]);
  const data = await reviewDetail(id);
  if (!data) notFound();
  return <Shell editor authenticated><main id="main" className="container">
    <p className="eyebrow">Έλεγχος συνταγής</p><h1>{data.draft.title}</h1>
    {saved && <p className="notice" role="status">{saved === "published" ? "Η συνταγή δημοσιεύτηκε." : "Το προσχέδιο αποθηκεύτηκε."}</p>}
    {data.row.published && <Link className="text-link" href={`/recipes/${id}`}>Άνοιξε τη δημοσιευμένη συνταγή</Link>}
    {data.row.linked_to ? <Link className="button" href={`/review/${data.row.linked_to}`}>Άνοιξε τη συνδεδεμένη καταχώριση</Link> :
      <Editor key={`${id}-${data.revision}`} initial={data.draft} record={{ id, revision: data.revision, published: !!data.row.published }} candidates={data.duplicates} />}
    <section className="editor-section"><h2>Ιστορικό εκδόσεων</h2>
      <ol className="history">{data.history.map((entry) => {
        const [action, target] = entry.action.split(":");
        return <li key={entry.revision}>Έκδοση {entry.revision} · {actions[action] ?? action} · {new Intl.DateTimeFormat("el-GR", {
          dateStyle: "short", timeStyle: "short", timeZone: "Europe/Athens",
        }).format(entry.created_at)} · {entry.actor} {target && <Link className="text-link" href={`/review/${target}`}>Σχετική καταχώριση</Link>}</li>;
      })}</ol>
    </section>
  </main></Shell>;
}
