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
          <p>
            ChairMatch Deutschland<br />
            Yusuf Ferhat Demir<br />
            Schillerstrasse 31<br />
            60313 Frankfurt am Main<br />
            E-Mail: info@chairmatch.de
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>2. Erhobene Daten</h2>
          <p>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>E-Mail-Adresse und Name bei Registrierung</li>
            <li>Buchungsdaten (Datum, Uhrzeit, Dienstleistung)</li>
            <li>Bewertungen und Kommentare</li>
            <li>Zahlungsinformationen bei Anbietern (IBAN)</li>
            <li>Technisch notwendige Session-Daten</li>
            <li><strong style={{ color: 'var(--cream)' }}>Besucherdaten (Logging):</strong> Beim Aufruf unserer Seiten werden zur Betriebs- und Statistikzwecken sowie zur Missbrauchsabwehr anonymisiert bzw. minimal die aufgerufene Seite, IP-Adresse, Herkunft (Land/Region) und ein gekürzter Browser-Kennung (User-Agent) erfasst und für eine begrenzte Zeit gespeichert. Es findet kein Profiling oder Weitergabe an Dritte zu Werbezwecken statt.</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>3. Rechtsgrundlage</h2>
          <p>Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung), Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse).</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>4. Zweck der Verarbeitung</h2>
          <p>Die Datenverarbeitung dient der Bereitstellung unserer Buchungsplattform und der Kommunikation zwischen Kunden und Anbietern.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>5. Speicherdauer</h2>
          <p>Personenbezogene Daten werden gelöscht, sobald der Zweck der Speicherung entfällt. Gesetzliche Aufbewahrungsfristen bleiben unberührt.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>6. Auftragsverarbeiter</h2>
          <p>Wir nutzen folgende Dienste zur Datenverarbeitung:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Vercel Inc.</strong> — Hosting (USA, DPA vorhanden)</li>
            <li><strong style={{ color: 'var(--cream)' }}>Supabase Inc.</strong> — Datenbank und Authentifizierung (EU-Region)</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>7. Ihre Rechte (Art. 15–21 DSGVO)</h2>
          <p>Sie haben das Recht auf:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Auskunft über Ihre gespeicherten Daten</li>
            <li>Berichtigung unrichtiger Daten</li>
            <li>Löschung Ihrer Daten (&quot;Recht auf Vergessenwerden&quot;)</li>
            <li>Einschränkung der Verarbeitung</li>
            <li>Datenübertragbarkeit</li>
            <li>Widerspruch gegen die Verarbeitung</li>
            <li>Beschwerde bei einer Aufsichtsbehörde</li>
          </ul>
          <p style={{ marginTop: 8 }}>Anfragen richten Sie an: info@chairmatch.de</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>8. Cookies &amp; Besucher-Logging</h2>
          <p>Wir verwenden ausschließlich technisch notwendige Cookies für die Funktionalität der Plattform (Session-Management). Zusätzlich erfassen wir beim Seitenaufruf minimale Besucherdaten (Seite, IP, Herkunft, Browser-Kennung) für Betrieb, Statistik und Missbrauchsabwehr; siehe Abschnitt 2. Es findet kein Profiling und keine Weitergabe an Dritte zu Werbezwecken statt.</p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
