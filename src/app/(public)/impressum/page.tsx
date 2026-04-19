// RECHTLICHER HINWEIS: Vor Livegang durch einen Anwalt prüfen lassen.
// {{PLACEHOLDER}} müssen vor Livegang ersetzt werden.

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
            Yusuf Ferhat Demir<br />
            Schillerstraße 31<br />
            60313 Frankfurt am Main<br />
            Deutschland
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Kontakt</h2>
          <p>
            E-Mail: <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a><br />
            Web: <a href="https://chairmatch.de" style={{ color: 'var(--gold2)' }}>chairmatch.de</a>
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Unternehmensform</h2>
          <p>
            {/* Nach GmbH-Eintragung ersetzen: */}
            ChairMatch (Einzelunternehmen / GmbH i. Gr.)<br />
            {/* Handelsregister: {{HANDELSREGISTERGERICHT}}, HRB {{HRB_NUMMER}} */}
            {/* Geschäftsführer: Yusuf Ferhat Demir */}
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Umsatzsteuer</h2>
          <p>
            {/* Kleinunternehmer bis zur USt-Registrierung: */}
            Kleinunternehmer gem. § 19 UStG — derzeit keine Umsatzsteuer-ID.<br />
            {/* Nach Registrierung beim Finanzamt: USt-IdNr.: DE{{UMSATZSTEUER_ID}} */}
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
          <p>
            Yusuf Ferhat Demir<br />
            Schillerstraße 31, 60313 Frankfurt am Main
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Marktplatz-Betreiber (P2B-Verordnung EU 2019/1150)</h2>
          <p>
            ChairMatch betreibt eine Online-Vermittlungsplattform. Beschwerden von gewerblichen Anbietern richten Sie bitte an{' '}
            <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a>.{' '}
            Antwort innerhalb von 14 Werktagen.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>EU-Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit:{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>
              https://ec.europa.eu/consumers/odr
            </a>.<br />
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>Haftungsausschluss</h2>
          <p>
            <strong style={{ color: 'var(--cream)' }}>Haftung für Inhalte:</strong>{' '}
            Die Inhalte wurden mit größter Sorgfalt erstellt. Für Richtigkeit, Vollständigkeit und Aktualität übernehmen wir keine Gewähr.
            Als Diensteanbieter sind wir gem. § 7 Abs. 1 TMG für eigene Inhalte nach allgemeinen Gesetzen verantwortlich.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong style={{ color: 'var(--cream)' }}>Haftung für Links:</strong>{' '}
            Unser Angebot enthält Links zu externen Websites. Für die Inhalte verlinkter Seiten ist stets der jeweilige Anbieter verantwortlich.
          </p>
          <p style={{ marginTop: 12 }}>
            <strong style={{ color: 'var(--cream)' }}>Urheberrecht:</strong>{' '}
            Inhalte und Werke auf dieser Plattform unterliegen dem deutschen Urheberrecht.
            Vervielfältigung bedarf der schriftlichen Zustimmung des Betreibers.
          </p>

        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
