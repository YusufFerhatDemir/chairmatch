import Link from 'next/link'

export default function ImpressumPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          Impressum
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8 }}>Angaben gemäß § 5 TMG</h2>
          <p>
            ChairMatch GmbH (i. Gr.)<br />
            Vertreten durch: Yusuf Ferhat Demir, Geschäftsführer<br />
            Deutschland
          </p>
          <p style={{ marginTop: 8, fontSize: 12, color: 'var(--stone2)' }}>
            Handelsregistereintragung in Vorbereitung
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Kontakt</h2>
          <p>
            E-Mail: legal@chairmatch.de<br />
            Web: chairmatch.de
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Umsatzsteuer-ID</h2>
          <p>Kleinunternehmer gem. § 19 UStG — Umsatzsteuer-ID wird nach Handelsregistereintragung beantragt.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
          <p>Yusuf Ferhat Demir<br />ChairMatch GmbH (i. Gr.)</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>EU-Streitschlichtung</h2>
          <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>https://ec.europa.eu/consumers/odr</a>. Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Haftungsausschluss</h2>
          <p><strong style={{ color: 'var(--cream)' }}>Haftung für Inhalte:</strong> Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.</p>
          <p style={{ marginTop: 12 }}><strong style={{ color: 'var(--cream)' }}>Haftung für Links:</strong> Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
