import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'

export function PrivacyPage() {
  const navigate = useNavigate()
  return (
    <div>
      <Helmet>
        <title>Datenschutz | ChairMatch</title>
        <meta name="description" content="Datenschutzerklärung von ChairMatch." />
        <link rel="canonical" href="https://chairmatch.de/privacy" />
      </Helmet>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ fontSize: 20, color: 'var(--cream)' }} aria-label="Zurück">←</button>
          <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Datenschutz</div>
        </div>
      </Header>
      <div style={{ padding: 'var(--pad)', fontSize: 'var(--font-sm)', color: 'var(--stone)', lineHeight: 1.7, maxWidth: 800 }}>

        <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 12 }}>Datenschutzerklärung</h2>
        <p style={{ marginBottom: 12 }}>
          ChairMatch nimmt den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre
          personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften
          (insbesondere der DSGVO und des BDSG) sowie dieser Datenschutzerklärung.
        </p>

        {/* 1. Verantwortlicher */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>1. Verantwortlicher</h3>
        <p style={{ marginBottom: 4 }}>ChairMatch GmbH</p>
        <p style={{ marginBottom: 4 }}>Musterstraße 1</p>
        <p style={{ marginBottom: 4 }}>10115 Berlin, Deutschland</p>
        <p style={{ marginBottom: 4 }}>E-Mail: datenschutz@chairmatch.de</p>
        <p style={{ marginBottom: 12 }}>Telefon: +49 30 12345678</p>

        {/* 2. Welche Daten werden erhoben */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>2. Welche Daten werden erhoben</h3>
        <p style={{ marginBottom: 8 }}>Wir erheben und verarbeiten folgende personenbezogene Daten:</p>
        <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Buchungsdaten:</strong> Name, E-Mail-Adresse und Telefonnummer, die Sie bei einer Buchung angeben.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Nutzungsdaten:</strong> Informationen über Ihre Nutzung unserer Plattform (z.B. aufgerufene Seiten, Zeitpunkt des Zugriffs).</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Präferenzdaten:</strong> Ihre gewählten Einstellungen wie Theme (hell/dunkel), Sprache und Cookie-Einwilligungsstatus, die lokal auf Ihrem Gerät gespeichert werden.</li>
        </ul>

        {/* 3. Rechtsgrundlage */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>3. Rechtsgrundlage der Verarbeitung</h3>
        <p style={{ marginBottom: 8 }}>Die Verarbeitung Ihrer Daten erfolgt auf Grundlage folgender Rechtsgrundlagen gemäß Art. 6 DSGVO:</p>
        <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Art. 6 Abs. 1 lit. a DSGVO (Einwilligung):</strong> Soweit Sie uns eine Einwilligung zur Verarbeitung erteilt haben (z.B. Cookie-Einwilligung für Präferenzdaten).</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung):</strong> Verarbeitung zur Erfüllung eines Vertrags oder vorvertraglicher Maßnahmen, z.B. bei Buchungen.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Art. 6 Abs. 1 lit. f DSGVO (Berechtigtes Interesse):</strong> Verarbeitung auf Grundlage unseres berechtigten Interesses, z.B. zur Verbesserung unserer Dienste und zur Gewährleistung der IT-Sicherheit.</li>
        </ul>

        {/* 4. Speicherdauer */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>4. Speicherdauer</h3>
        <p style={{ marginBottom: 12 }}>
          Personenbezogene Daten werden nur so lange gespeichert, wie es für die Erfüllung des
          jeweiligen Zwecks erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
          Buchungsdaten werden nach Ablauf der gesetzlichen Aufbewahrungsfrist (in der Regel 6 Jahre
          gemäß § 257 HGB bzw. 10 Jahre gemäß § 147 AO) gelöscht. Lokale Präferenzdaten
          (Theme, Sprache, Einwilligungsstatus) verbleiben auf Ihrem Gerät und können jederzeit
          von Ihnen über die Browsereinstellungen gelöscht werden.
        </p>

        {/* 5. Drittanbieter und Auftragsverarbeiter */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>5. Drittanbieter und Auftragsverarbeiter</h3>
        <p style={{ marginBottom: 8 }}>Wir setzen folgende Drittanbieter ein:</p>
        <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
          <li style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Supabase (Hosting & Datenbank):</strong>{' '}
            Unsere Anwendung wird über Supabase gehostet und nutzt deren Datenbank-Infrastruktur.
            Supabase verarbeitet Daten in der EU bzw. unter Einhaltung der DSGVO-Anforderungen.
            Weitere Informationen: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>supabase.com/privacy</a>
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Stripe (Zahlungsabwicklung):</strong>{' '}
            Für die Abwicklung von Zahlungen nutzen wir Stripe. Bei einem Zahlungsvorgang werden
            Ihre Zahlungsdaten direkt von Stripe verarbeitet. ChairMatch speichert keine
            Kreditkarten- oder Bankdaten. Stripe ist als Auftragsverarbeiter tätig und
            verarbeitet Daten gemäß der DSGVO. Weitere Informationen:{' '}
            <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>stripe.com/de/privacy</a>
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--cream)' }}>Google Fonts (via CDN):</strong>{' '}
            Wir nutzen Google Fonts zur einheitlichen Darstellung von Schriftarten. Die Einbindung
            erfolgt über ein Content Delivery Network (CDN). Dabei wird Ihre IP-Adresse an den
            CDN-Anbieter übermittelt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes
            Interesse an einer einheitlichen Darstellung). Weitere Informationen:{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold2)' }}>policies.google.com/privacy</a>
          </li>
        </ul>

        {/* 6. Cookies und localStorage */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>6. Cookies und localStorage</h3>
        <p style={{ marginBottom: 8 }}>
          ChairMatch verwendet ausschließlich technisch notwendige Speichermechanismen (localStorage).
          Es werden keine Tracking- oder Marketing-Cookies eingesetzt. Folgende Daten werden lokal
          auf Ihrem Gerät gespeichert:
        </p>
        <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Theme-Einstellung:</strong> Ihre Wahl zwischen hellem und dunklem Design (Schlüssel: cm_theme).</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Spracheinstellung:</strong> Ihre bevorzugte Sprache (Schlüssel: cm_lang).</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Einwilligungsstatus:</strong> Ob Sie der Nutzung von Cookies/localStorage zugestimmt haben (Schlüssel: cm_consent).</li>
        </ul>
        <p style={{ marginBottom: 12 }}>
          Diese Daten werden nicht an Server übertragen und verbleiben ausschließlich auf Ihrem
          Endgerät. Sie können diese Daten jederzeit über die Browsereinstellungen (Website-Daten
          löschen) entfernen.
        </p>

        {/* 7. Ihre Rechte */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>7. Ihre Rechte als betroffene Person</h3>
        <p style={{ marginBottom: 8 }}>Gemäß DSGVO stehen Ihnen folgende Rechte zu:</p>
        <ul style={{ marginBottom: 12, paddingLeft: 20 }}>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Auskunftsrecht (Art. 15 DSGVO):</strong> Sie haben das Recht, Auskunft über Ihre von uns verarbeiteten personenbezogenen Daten zu verlangen.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Recht auf Berichtigung (Art. 16 DSGVO):</strong> Sie haben das Recht, die Berichtigung unrichtiger Daten zu verlangen.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Recht auf Löschung (Art. 17 DSGVO):</strong> Sie haben das Recht, die Löschung Ihrer Daten zu verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Recht auf Datenübertragbarkeit (Art. 20 DSGVO):</strong> Sie haben das Recht, Ihre Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Widerspruchsrecht (Art. 21 DSGVO):</strong> Sie haben das Recht, der Verarbeitung Ihrer Daten zu widersprechen, soweit diese auf berechtigtem Interesse beruht.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO):</strong> Sie haben das Recht, die Einschränkung der Verarbeitung Ihrer Daten zu verlangen.</li>
          <li style={{ marginBottom: 4 }}><strong style={{ color: 'var(--cream)' }}>Beschwerderecht:</strong> Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO).</li>
        </ul>

        {/* 8. Kontakt für Datenschutzanfragen */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>8. Kontakt für Datenschutzanfragen</h3>
        <p style={{ marginBottom: 12 }}>
          Bei Fragen zum Datenschutz oder zur Ausübung Ihrer Rechte können Sie uns jederzeit kontaktieren:
        </p>
        <p style={{ marginBottom: 4 }}>ChairMatch GmbH</p>
        <p style={{ marginBottom: 4 }}>Datenschutzbeauftragter</p>
        <p style={{ marginBottom: 4 }}>Musterstraße 1, 10115 Berlin</p>
        <p style={{ marginBottom: 4 }}>E-Mail: <a href="mailto:datenschutz@chairmatch.de" style={{ color: 'var(--gold2)' }}>datenschutz@chairmatch.de</a></p>
        <p style={{ marginBottom: 24 }}>Telefon: +49 30 12345678</p>

        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', opacity: 0.7 }}>
          Stand: März 2026
        </p>
      </div>
    </div>
  )
}
