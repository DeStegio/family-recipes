import { notFound, redirect } from "next/navigation";
import { Editor } from "@/components/editor";
import { Shell } from "@/components/shell";
import { canEdit, currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

export default async function Import() {
  const user = await currentUser();
  if (!user && !demoMode()) redirect("/login");
  if (!canEdit(user)) notFound();
  return <Shell editor authenticated><main id="main" className="container">
    <h1>Εισαγωγή συνταγής</h1>
    <p className="muted">Επίλεξε φωτογραφίες και καταχώρισε την πιστή μεταγραφή κάθε πηγής.</p>
    <Editor />
  </main></Shell>;
}
