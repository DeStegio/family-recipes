import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

const messages = {
  created: "Ο λογαριασμός δημιουργήθηκε.",
  exists: "Υπάρχει ήδη λογαριασμός με αυτό το email.",
  invalid: "Έλεγξε το email και χρησιμοποίησε κωδικό 14–256 χαρακτήρων.",
};

export default async function Accounts({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await currentUser();
  if (!user && !demoMode()) redirect("/login");
  if (user?.role !== "owner") notFound();
  const { status } = await searchParams;
  const message = status && Object.hasOwn(messages, status) ? messages[status as keyof typeof messages] : undefined;
  return <Shell editor authenticated><main id="main" className="container">
    <h1>Προσθήκη λογαριασμού</h1>
    {message && <p className="notice" role={status === "created" ? "status" : "alert"}>{message}</p>}
    <form method="post" action="/api/accounts" className="editor-form">
      <label>Email<input name="email" type="email" autoComplete="off" maxLength={254} required /></label>
      <label>Προσωπικός κωδικός<input name="password" type="password" autoComplete="new-password" minLength={14} maxLength={256} required /></label>
      <label>Δικαιώματα<select name="role" defaultValue="reader">
        <option value="reader">Οικογενειακός αναγνώστης</option>
        <option value="admin">Διαχειριστής συνταγών</option>
      </select></label>
      <button className="primary">Δημιουργία λογαριασμού</button>
    </form>
    <Link href="/review" className="text-link">Πίσω στον έλεγχο</Link>
  </main></Shell>;
}
