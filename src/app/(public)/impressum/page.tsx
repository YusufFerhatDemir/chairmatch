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
          <p>ChairMatch Deutschland<br />Yusuf Demir</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Kontakt</h2>
          <p>E-Mail: info@chairmatch.de</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Haftungsausschluss</h2>
          <p>Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.</p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
