import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { Header } from '@/components/layout/Header'

export function ImpressumPage() {
  const navigate = useNavigate()
  return (
    <div>
      <Helmet>
        <title>Impressum | ChairMatch</title>
        <meta name="description" content="Impressum und rechtliche Informationen." />
        <link rel="canonical" href="https://chairmatch.de/impressum" />
      </Helmet>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate(-1)} style={{ fontSize: 20, color: 'var(--cream)' }} aria-label="Zurück">←</button>
          <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>Impressum</div>
        </div>
      </Header>
      <div style={{ padding: 'var(--pad)', fontSize: 'var(--font-sm)', color: 'var(--stone)', lineHeight: 1.7, maxWidth: 800 }}>

        <h2 style={{ color: 'var(--cream)', fontSize: 'var(--font-lg)', marginBottom: 12 }}>Impressum</h2>
        <p style={{ fontSize: 'var(--font-xs)', marginBottom: 16, opacity: 0.7 }}>Angaben gemäß § 5 TMG</p>

        {/* Anbieter */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Anbieter</h3>
        <p style={{ marginBottom: 4 }}>ChairMatch GmbH</p>
        <p style={{ marginBottom: 4 }}>Musterstraße 1</p>
        <p style={{ marginBottom: 12 }}>10115 Berlin, Deutschland</p>

        {/* Vertreten durch */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Vertreten durch</h3>
        <p style={{ marginBottom: 12 }}>Geschäftsführer: [Name des Geschäftsführers]</p>

        {/* Kontakt */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Kontakt</h3>
        <p style={{ marginBottom: 4 }}>E-Mail: <a href="mailto:info@chairmatch.de" style={{ color: 'var(--gold2)' }}>info@chairmatch.de</a></p>
        <p style={{ marginBottom: 12 }}>Telefon: +49 30 12345678</p>

        {/* Registereintrag */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Registereintrag</h3>
        <p style={{ marginBottom: 4 }}>Registergericht: Amtsgericht Berlin-Charlottenburg</p>
        <p style={{ marginBottom: 12 }}>Registernummer: HRB [Nummer]</p>

        {/* Umsatzsteuer-ID */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Umsatzsteuer-Identifikationsnummer</h3>
        <p style={{ marginBottom: 12 }}>
          Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: DE[Nummer]
        </p>

        {/* Inhaltlich Verantwortlicher */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h3>
        <p style={{ marginBottom: 4 }}>[Name des Verantwortlichen]</p>
        <p style={{ marginBottom: 4 }}>Musterstraße 1</p>
        <p style={{ marginBottom: 12 }}>10115 Berlin, Deutschland</p>

        {/* Streitschlichtung */}
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginTop: 24, marginBottom: 8 }}>EU-Streitschlichtung</h3>
        <p style={{ marginBottom: 12 }}>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--gold2)', wordBreak: 'break-all' }}
          >
            https://ec.europa.eu/consumers/odr/
          </a>
        </p>
        <p style={{ marginBottom: 12 }}>
          Unsere E-Mail-Adresse finden Sie oben im Impressum. Wir sind nicht bereit oder
          verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>

        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', opacity: 0.7, marginTop: 24 }}>
          Stand: März 2026
        </p>
      </div>
    </div>
  )
}
