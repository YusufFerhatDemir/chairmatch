import Link from 'next/link'

export default function DatenschutzPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 24 }}>
          Datenschutzerklärung
        </h1>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>1. Verantwortlicher</h2>
          <p>ChairMatch Deutschland<br />Verantwortlich für die Datenverarbeitung gemäß DSGVO.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>2. Erhobene Daten</h2>
          <p>Wir erheben und verarbeiten folgende Daten:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>E-Mail-Adresse und Name bei Registrierung</li>
            <li>Buchungsdaten (Datum, Uhrzeit, Dienstleistung)</li>
            <li>Bewertungen und Kommentare</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>3. Zweck der Verarbeitung</h2>
          <p>Die Datenverarbeitung dient der Bereitstellung unserer Buchungsplattform und der Kommunikation zwischen Kunden und Anbietern.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>4. Ihre Rechte</h2>
          <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten gemäß DSGVO.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>5. Cookies</h2>
          <p>Wir verwenden nur technisch notwendige Cookies für die Funktionalität der Plattform. Es findet kein IP-Tracking statt.</p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
