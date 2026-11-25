import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { currentUser } from "@/server/auth";
import { demoMode } from "@/server/config";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (demoMode() || await currentUser()) redirect("/");
  const { error } = await searchParams;
  return <Shell><main id="main" className="container login">
    <h1>Σύνδεση στο τετράδιο</h1>
    {error && <p className="notice" role="alert">{error === "limit" ? "Πολλές προσπάθειες. Δοκίμασε ξανά σε δεκαπέντε λεπτά." : "Το email ή ο κωδικός δεν είναι σωστά."}</p>}
    {process.env.DATABASE_URL ? <form method="post" action="/api/session/login" className="editor-form">
      <label>Email<input type="email" name="email" autoComplete="username" maxLength={254} required /></label>
      <label>Κωδικός<input type="password" name="password" autoComplete="current-password" maxLength={256} required /></label>
      <button className="primary">Σύνδεση</button>
    </form> : <p className="notice">Πρέπει να ρυθμιστεί η ιδιωτική βάση δεδομένων.</p>}
  </main></Shell>;
}
