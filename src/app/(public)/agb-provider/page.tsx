import Link from 'next/link'

export default function AGBProviderPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          AGB für Anbieter (Provider-EULA)
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 16 }}>Stand: März 2026 · P2B-konform · ChairMatch.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 1 Geltungsbereich
          </h2>
          <p>
            Diese AGB gelten für Anbieter (Provider, Studios, Standortbetreiber), die über ChairMatch Dienstleistungen
            anbieten oder Räume/Stühle vermieten. Sie ergänzen die allgemeinen AGB für Kunden.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 2 Kündigungsfristen
          </h2>
          <p>
            Sie können Ihr Anbieter-Konto mit einer Frist von 14 Tagen zum Monatsende kündigen. Die Kündigung erfolgt
            schriftlich (E-Mail an legal@chairmatch.de). Bei Verstößen gegen diese AGB behalten wir uns eine
            außerordentliche Kündigung vor.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 3 Beschwerdeverfahren
          </h2>
          <p>
            Bei Beschwerden wenden Sie sich zunächst an uns: legal@chairmatch.de. Wir bearbeiten Anfragen innerhalb von
            14 Werktagen. Sie haben das Recht, sich an eine externe Streitbeilegungsstelle zu wenden (z. B. ODR-Plattform
            der EU: https://ec.europa.eu/consumers/odr).
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 4 Ranking-Kriterien
          </h2>
          <p>
            Die Reihenfolge der Suchergebnisse wird u. a. durch Bewertungen, Verfügbarkeit, Relevanz und optional
            bezahlte Sichtbarkeit (Boost) beeinflusst. Die genauen Kriterien werden in den Anbieter-Einstellungen
            transparent dargestellt.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 5 Compliance & Dokumente
          </h2>
          <p>
            Sie stellen sicher, dass alle erforderlichen Nachweise (Gewerbe, Versicherung, Qualifikation) aktuell und
            vollständig sind. ChairMatch kann die Freischaltung von Leistungen von der Verifizierung abhängig machen.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>
            § 6 Schlussbestimmungen
          </h2>
          <p>
            Es gilt deutsches Recht. Gerichtsstand ist Frankfurt am Main, sofern Sie Kaufmann sind. Änderungen werden
            mit 14-tägiger Frist angekündigt.
          </p>

          <p style={{ marginTop: 24 }}>
            <Link href="/agb" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Allgemeine AGB</Link>
            {' · '}
            <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutz</Link>
            {' · '}
            <Link href="/impressum" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Impressum</Link>
          </p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
