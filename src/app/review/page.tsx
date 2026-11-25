import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { issueLabels } from "@/domain/recipe";
import { reviewQueue } from "@/server/archive";
import { canEdit, currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

export const dynamic = "force-dynamic";

export default async function Queue() {
  const user = await currentUser();
  if (!user && !demoMode()) redirect("/login");
  if (!canEdit(user)) notFound();
  const drafts = await reviewQueue();
  return <Shell editor authenticated><main id="main" className="container">
    <div className="title-row"><h1>Προς έλεγχο</h1><Link className="button primary" href="/review/import">Προσθήκη συνταγής</Link></div>
    {user?.role === "owner" && <Link className="text-link" href="/review/accounts">Προσθήκη λογαριασμού</Link>}
    {!drafts.length && <p className="notice">Δεν υπάρχουν προσχέδια προς έλεγχο.</p>}
    <ul className="recipe-grid">{drafts.map(({ id, draft, created_at }) => <li className="recipe-card" key={id}>
      <h3><Link href={`/review/${id}`}>{draft.title}</Link></h3>
      <p>{draft.sources.length} {draft.sources.length === 1 ? "πηγή" : "πηγές"} · {draft.issues.filter((issue) => !issue.resolution).length} εκκρεμότητες</p>
      <p>Εισαγωγή {new Intl.DateTimeFormat("el-GR", { dateStyle: "medium", timeZone: "Europe/Athens" }).format(created_at)}</p>
      {[...new Set(draft.issues.filter((issue) => !issue.resolution).map((issue) => issueLabels[issue.kind]))].map((label) => <p key={label}>{label}</p>)}
      <Link className="text-link" href={`/review/${id}`}>Άνοιξε το προσχέδιο</Link>
    </li>)}</ul>
  </main></Shell>;
}
