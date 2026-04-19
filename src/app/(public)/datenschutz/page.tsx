// RECHTLICHER HINWEIS: Diese Datenschutzerklärung ist ein technisches Gerüst.
// VOR LIVEGANG durch einen auf Datenschutzrecht spezialisierten Anwalt prüfen lassen.
// Platzhalter ({{...}}) müssen vor Livegang ersetzt werden.

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datenschutzerklärung',
  description: 'Datenschutzerklärung von ChairMatch gemäß DSGVO — Verantwortlicher, Auftragsverarbeiter, Betroffenenrechte, Cookies.',
  robots: { index: true, follow: false },
}

export default function DatenschutzPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
          ← Zurück
        </Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 16, marginBottom: 8 }}>
          Datenschutzerklärung
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 24 }}>
          Stand: April 2026 · Version 1.2
        </p>

        <div style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.7 }}>

          {/* ── 1. VERANTWORTLICHER ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>1. Verantwortlicher (Art. 13 DSGVO)</h2>
          <p>
            Yusuf Ferhat Demir<br />
            Schillerstraße 31, 60313 Frankfurt am Main<br />
            Deutschland<br />
            E-Mail: <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a><br />
            Web: chairmatch.de
          </p>
          <p style={{ marginTop: 8 }}>
            {/* {{DATENSCHUTZBEAUFTRAGTER}} — falls kein gesetzlicher DSB benötigt wird, Abschnitt streichen */}
            Datenschutzbeauftragter (freiwillig): <strong style={{ color: 'var(--cream)' }}>{'{{DATENSCHUTZBEAUFTRAGTER_NAME}}'}</strong>,{' '}
            <a href="mailto:{{DSB_EMAIL}}" style={{ color: 'var(--gold2)' }}>{'{{DSB_EMAIL}}'}</a>
          </p>

          {/* ── 2. ART UND ZWECK ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>2. Zwecke und Rechtsgrundlagen der Verarbeitung</h2>
          <p>Wir verarbeiten personenbezogene Daten für folgende Zwecke:</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO):</strong> Registrierung, Buchungsabwicklung, Zahlungsverarbeitung, Anbieterverwaltung.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Einwilligung (Art. 6 Abs. 1 lit. a DSGVO):</strong> Marketing-E-Mails, Statistik-Cookies, Push-Benachrichtigungen.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO):</strong> IT-Sicherheit, Betrugsabwehr, technisch notwendige Logs.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Gesetzliche Pflicht (Art. 6 Abs. 1 lit. c DSGVO):</strong> DAC7-Meldepflichten, steuerliche Aufbewahrung.</li>
          </ul>

          {/* ── 3. ERHOBENE DATEN ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>3. Kategorien personenbezogener Daten</h2>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Stammdaten: Name, E-Mail, Telefon (bei Registrierung)</li>
            <li>Buchungsdaten: Datum, Uhrzeit, Dienstleistung, Salon, Preis</li>
            <li>Zahlungsdaten: Stripe verarbeitet Kartendaten; wir speichern nur Referenz-IDs und Betrag</li>
            <li>Anbieter: IBAN und Steuernummer für DAC7/Auszahlungsabrechnung</li>
            <li>Bewertungen und Kommentare</li>
            <li>Technische Daten: IP-Adresse, User-Agent, Seitenpfad (visit_logs) für Betrieb und Sicherheit</li>
            <li>Einwilligungs-Log (consent_logs): AGB-, Datenschutz- und Marketing-Einwilligung mit Timestamp und Version</li>
            <li>Cookie-Einwilligung (cookie_consents): Ihre gewählten Cookie-Kategorien</li>
          </ul>

          {/* ── 4. SPEICHERDAUER ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>4. Speicherdauer</h2>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>Aktive Konten: bis zur Löschung durch Nutzer oder durch uns</li>
            <li>Inaktive Konten: Anonymisierung nach 3 Jahren ohne Anmeldung</li>
            <li>Soft-Delete: 30 Tage Aufbewahrung, dann automatischer Hard-Delete</li>
            <li>Buchungshistorie: anonymisiert für 7 Jahre (steuerliche Pflicht / DAC7)</li>
            <li>Server-Logs: 30 Tage, danach automatische Löschung</li>
            <li>Einwilligungs-Log: bis zur Kontoauflösung (Nachweiszweck)</li>
          </ul>

          {/* ── 5. EMPFÄNGER / AUFTRAGSVERARBEITER ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>5. Empfänger und Auftragsverarbeiter</h2>
          <p>Wir setzen folgende Dienstleister ein (Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO geschlossen bzw. in Vorbereitung):</p>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Vercel Inc.</strong> (San Francisco, USA) — Hosting der Web-App.
              Grundlage: EU-Standardvertragsklauseln (SCC). <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>Datenschutz</a>
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Supabase Inc.</strong> (San Francisco, USA, EU-Datenhaltung) — Datenbank und Authentifizierung.
              Grundlage: AVV + SCC. <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>Datenschutz</a>
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Stripe, Inc.</strong> (Dublin, Irland / USA) — Zahlungsabwicklung.
              Grundlage: AVV + SCC. <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>Datenschutz</a>
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>Resend, Inc.</strong> (USA) — Transaktionale E-Mails (Buchungsbestätigungen, Benachrichtigungen).
              Grundlage: SCC. <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>Datenschutz</a>
            </li>
            <li>
              <strong style={{ color: 'var(--cream)' }}>web-push / VAPID</strong> — Push-Benachrichtigungen über Browser-Push-Dienste (z. B. Google FCM). Grundlage: Einwilligung.
            </li>
          </ul>

          {/* ── 6. DRITTLÄNDER ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>6. Übermittlung in Drittländer</h2>
          <p>Einige der o. g. Anbieter haben ihren Sitz in den USA (Drittland ohne Angemessenheitsbeschluss). Die Übermittlung erfolgt auf Grundlage von EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO) und ggf. ergänzender Garantien der Anbieter.</p>

          {/* ── 7. BETROFFENENRECHTE ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>7. Ihre Rechte (Art. 15–21 DSGVO)</h2>
          <ul style={{ paddingLeft: 20, marginTop: 8 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Auskunft (Art. 15):</strong> Was wir über Sie gespeichert haben</li>
            <li><strong style={{ color: 'var(--cream)' }}>Berichtigung (Art. 16):</strong> Falsche Daten korrigieren lassen</li>
            <li><strong style={{ color: 'var(--cream)' }}>Löschung (Art. 17):</strong> Konto löschen — Soft-Delete, Hard-Delete nach 30 Tagen (in-App verfügbar)</li>
            <li><strong style={{ color: 'var(--cream)' }}>Datenübertragbarkeit (Art. 20):</strong> JSON/CSV/ZIP-Export — in-App als &quot;Daten exportieren&quot; verfügbar</li>
            <li><strong style={{ color: 'var(--cream)' }}>Einschränkung (Art. 18):</strong> Verarbeitung einschränken — Anfrage per E-Mail</li>
            <li><strong style={{ color: 'var(--cream)' }}>Widerspruch (Art. 21):</strong> Gegen Verarbeitung auf Basis berechtigter Interessen widersprechen</li>
            <li><strong style={{ color: 'var(--cream)' }}>Widerruf der Einwilligung (Art. 7 Abs. 3):</strong> Einwilligungen (z. B. Marketing-E-Mails, Cookies) jederzeit widerrufbar — Abmeldelink in jeder E-Mail, Cookie-Einstellungen im Footer</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            Anfragen an: <a href="mailto:legal@chairmatch.de" style={{ color: 'var(--gold2)' }}>legal@chairmatch.de</a> — Antwort innerhalb von 30 Tagen.
          </p>

          {/* ── 8. BESCHWERDE ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>8. Beschwerderecht bei Aufsichtsbehörde</h2>
          <p>
            Sie haben das Recht, sich bei der zuständigen Datenschutzaufsichtsbehörde zu beschweren. Für uns zuständig ist:<br /><br />
            Der Hessische Beauftragte für Datenschutz und Informationsfreiheit<br />
            Postfach 3163 · 65021 Wiesbaden<br />
            <a href="https://datenschutz.hessen.de" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>datenschutz.hessen.de</a>
          </p>

          {/* ── 9. KEINE AUTOMATISIERTE ENTSCHEIDUNG ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>9. Automatisierte Entscheidungsfindung und Profiling</h2>
          <p>Wir setzen keine automatisierte Entscheidungsfindung oder Profiling im Sinne von Art. 22 DSGVO ein. Suchergebnisse und Rankings basieren auf sachlichen Kriterien (Bewertung, Distanz, Verfügbarkeit).</p>

          {/* ── 10. COOKIES ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>10. Cookies und Tracking (§ 25 TTDSG)</h2>
          <p>
            <strong style={{ color: 'var(--cream)' }}>Technisch notwendig (immer aktiv):</strong> Session-Cookie, CSRF-Schutz, Authentifizierungs-Token. Keine Einwilligung erforderlich (§ 25 Abs. 2 TTDSG).<br /><br />
            <strong style={{ color: 'var(--cream)' }}>Statistik/Performance (Opt-in):</strong> Aggregierte Besuchsstatistiken für Betrieb und Optimierung. Einwilligung erforderlich.<br /><br />
            <strong style={{ color: 'var(--cream)' }}>Marketing (Opt-in):</strong> Derzeit nicht aktiv. Bei Aktivierung: erneute Einwilligung erforderlich.
          </p>
          <p style={{ marginTop: 12 }}>
            Cookie-Einstellungen können Sie jederzeit über{' '}
            <Link href="/cookie-settings" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>Cookie-Einstellungen</Link>{' '}
            im Footer ändern.
          </p>

          {/* ── 11. ÄNDERUNGEN ── */}
          <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 8, marginTop: 24 }}>11. Änderungen dieser Erklärung</h2>
          <p>Bei wesentlichen Änderungen informieren wir Sie per E-Mail oder In-App-Hinweis. Die jeweils aktuelle Version ist unter chairmatch.de/datenschutz abrufbar.</p>

        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
