import Link from "next/link";
import { Shell } from "@/components/shell";

export default function NotFound() {
  return <Shell><main id="main" className="container"><h1>Η σελίδα δεν βρέθηκε</h1>
    <Link className="button primary" href="/">Αρχική</Link>
  </main></Shell>;
}
