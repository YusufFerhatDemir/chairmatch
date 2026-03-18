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
            Yusuf Ferhat Demir<br />
            Schillerstraße 31, 60313 Frankfurt am Main<br />
            E-Mail: legal@chairmatch.de
          </p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>2. Datenminimierung</h2>
          <p>Wir erheben nur: Name, E-Mail, Telefon, Adresse (nur wenn nötig). Zahlungsdaten werden ausschließlich über Stripe verarbeitet — wir speichern keine Kreditkartendaten.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>3. Erhobene Daten</h2>
          <p>Wir erheben und verarbeiten:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>E-Mail, Name, Telefon bei Registrierung</li>
            <li>Buchungsdaten (Datum, Uhrzeit, Dienstleistung)</li>
            <li>Bewertungen und Kommentare</li>
            <li>Zahlungsinformationen bei Anbietern (IBAN) — nur für DAC7/Umsatzabrechnung</li>
            <li>Technisch notwendige Session-Daten</li>
            <li><strong style={{ color: 'var(--cream)' }}>Einwilligungs-Log (consent_logs):</strong> Beim Signup speichern wir AGB, Datenschutz und Marketing-Einwilligung mit Timestamp und Version.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Cookie-Einwilligung (cookie_consents):</strong> Ihre Cookie-Einstellungen werden gespeichert.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Besucherdaten (visit_logs):</strong> Seite, IP, Herkunft, User-Agent für Betrieb, Statistik und Missbrauchsabwehr.</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>4. Rechtsgrundlage</h2>
          <p>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für Buchungen, Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) für Marketing, Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) für technische Daten.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>5. Betroffenenrechte (in-App)</h2>
          <p>Sie haben das Recht auf:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Daten-Export:</strong> JSON/CSV/ZIP innerhalb von 72 Stunden</li>
            <li><strong style={{ color: 'var(--cream)' }}>Konto-Löschung:</strong> Soft-Delete, danach Hard-Delete nach 30 Tagen; Buchungshistorie anonymisiert für DAC7/Steuer</li>
            <li><strong style={{ color: 'var(--cream)' }}>Datenkorrektur:</strong> Über Account-Einstellungen</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>6. Speicherdauer</h2>
          <p>Personenbezogene Daten werden gelöscht, sobald der Zweck entfällt. Inaktive Accounts werden nach 3 Jahren anonymisiert. Gesetzliche Aufbewahrungsfristen bleiben unberührt.</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>7. Auftragsverarbeiter (AVV erforderlich)</h2>
          <p>Wir nutzen folgende Dienste zur Datenverarbeitung:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Vercel Inc.</strong> — Hosting (USA, DPA vorhanden)</li>
            <li><strong style={{ color: 'var(--cream)' }}>Supabase Inc.</strong> — Datenbank und Authentifizierung (EU-Region)</li>
            <li>Resend, Twilio, Stripe, Sentry — AVV erforderlich</li>
          </ul>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>8. Ihre Rechte (Art. 15–21 DSGVO)</h2>
          <p>Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch, Beschwerde bei Aufsichtsbehörde. Anfragen: legal@chairmatch.de</p>

          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>9. Cookies &amp; TTDSG</h2>
          <p>
            <strong style={{ color: 'var(--cream)' }}>Notwendig:</strong> Session, CSRF, Auth — immer aktiv.<br />
            <strong style={{ color: 'var(--cream)' }}>Statistik/Performance:</strong> Opt-In erforderlich.<br />
            <strong style={{ color: 'var(--cream)' }}>Marketing:</strong> Opt-In erforderlich.<br />
            Cookie-Einstellungen können Sie jederzeit im Footer unter &quot;Cookie-Einstellungen&quot; ändern.
          </p>
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
