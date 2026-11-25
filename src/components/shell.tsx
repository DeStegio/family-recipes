import Link from "next/link";

export function Shell({ children, demo, editor, authenticated }: {
  children: React.ReactNode; demo?: boolean; editor?: boolean; authenticated?: boolean;
}) {
  return <>
    <header className="site-header">
      <Link className="brand" href="/">Οι Συνταγές της Μαμάς</Link>
      <nav aria-label="Κύρια πλοήγηση">
        <Link className="button mobile-home" href="/">Αρχική</Link>
        <Link className="button desktop-link" href="/?view=all">Συνταγές</Link>
        <Link className="button desktop-link" href="/?view=favorites">Αγαπημένα</Link>
        {editor && <Link className="button" href="/review">Προς έλεγχο</Link>}
        {authenticated && <form className="session-action" method="post" action="/api/session/logout"><button>Έξοδος</button></form>}
      </nav>
    </header>
    {demo && <div className="ribbon">Δοκιμαστικά δεδομένα · Ιδιωτικό οικογενειακό βιβλίο</div>}
    {children}
  </>;
}
