import Link from 'next/link'

export default function AGBPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          Allgemeine Geschäftsbedingungen (AGB)
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <p style={{ marginBottom: 16 }}>Stand: März 2026 · ChairMatch — Dein Beauty-Partner in ganz Deutschland.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 1 Geltungsbereich</h2>
          <p>Diese AGB gelten für die Nutzung der Plattform ChairMatch (Webseite und Dienste). Anbieter von Leistungen (Salons, Barbershops, Kosmetikstudios etc.) und Nutzer, die Termine buchen oder Räume/Stühle mieten, akzeptieren diese Bedingungen mit der Registrierung bzw. Nutzung.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 2 Leistungsbeschreibung</h2>
          <p>ChairMatch ist eine Vermittlungsplattform für Beauty- und Wellness-Dienstleistungen sowie für die Vermietung von Stühlen, Liegen und Räumen. Wir vermitteln Verträge zwischen Kunden und Anbietern; der eigentliche Vertrag kommt zwischen Kunde und Anbieter zustande. ChairMatch ist nicht Partei des Buchungs- oder Mietvertrags.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 3 Registrierung und Konto</h2>
          <p>Zur Nutzung bestimmter Funktionen ist eine Registrierung erforderlich. Sie stellen wahrheitsgemäße Angaben bereit und halten Ihre Zugangsdaten geheim. Ein Konto ist nicht übertragbar.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 4 Buchungen und Vermietungen</h2>
          <p>Buchungen und Mietanfragen erfolgen über die Plattform. Bestätigung, Preise und Leistungsumfang vereinbaren Sie direkt mit dem Anbieter.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 4a Storno-Policy (Standard)</h2>
          <p>Sofern der Anbieter keine abweichenden Bedingungen festlegt, gilt: Kostenlose Stornierung bis 24 Stunden vor dem Termin. Bei Stornierung weniger als 24 Stunden vorher: 50 % Gebühr. Bei No-Show (Nichterscheinen): 100 % des Betrags. Die genaue Storno-Policy wird im Buchungs-Flow (Schritt 3) angezeigt.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 5 Preise und Zahlung</h2>
          <p>Preise und Zahlungsmodalitäten ergeben sich aus der Vereinbarung zwischen Ihnen und dem Anbieter. ChairMatch kann für die Vermittlung eigene Gebühren erheben; diese werden transparent ausgewiesen.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 6 Haftung</h2>
          <p>ChairMatch haftet nur für Vorsatz und grobe Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit nicht wesentliche Vertragspflichten verletzt werden. Für Schäden aus der Nutzung von Anbieterleistungen (z. B. Behandlung, Miete) ist der Anbieter verantwortlich.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 7 Nutzungsregeln</h2>
          <p>Sie nutzen die Plattform rechtmäßig und verletzen keine Rechte Dritter. Unzulässig sind u. a. irreführende Angaben, Spam, missbräuchliche Bewertungen und die Umgehung unserer Systeme.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 8 Kündigung und Sperrung</h2>
          <p>Sie können Ihr Konto jederzeit löschen. Wir können Konten bei Verstößen gegen diese AGB oder bei berechtigtem Anlass sperren oder löschen.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>§ 9 Schlussbestimmungen</h2>
          <p>Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand für Verbraucher ist der Wohnsitz; für Unternehmer unser Sitz. Änderungen dieser AGB werden auf der Plattform bekannt gegeben; bei wesentlichen Änderungen können Sie innerhalb einer Frist widersprechen.</p>

          <p style={{ marginTop: 24 }}>
            <Link href="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Datenschutzerklärung</Link>
            {' · '}
            <Link href="/impressum" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Impressum</Link>
          </p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
