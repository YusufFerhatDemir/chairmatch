import { useUIStore } from '@/stores/uiStore'
import { Link } from 'react-router-dom'

export function ConsentBanner() {
  const { consentGiven, setCookieConsent } = useUIStore()

  if (consentGiven !== null) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie-Einstellungen"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: 'var(--pad)',
        background: 'var(--shell)',
        borderTop: '1px solid var(--border)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <div className="card" style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
        <h3 style={{ color: 'var(--cream)', fontSize: 'var(--font-md)', marginBottom: 8 }}>
          Cookie-Einstellungen
        </h3>
        <p style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', lineHeight: 1.6, marginBottom: 8 }}>
          Wir verwenden ausschließlich technisch notwendige Cookies bzw. localStorage,
          um Ihre Einstellungen zu speichern:
        </p>
        <ul style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', lineHeight: 1.6, paddingLeft: 20, marginBottom: 12 }}>
          <li><strong style={{ color: 'var(--cream)' }}>Theme:</strong> Ihre Wahl zwischen hellem und dunklem Design</li>
          <li><strong style={{ color: 'var(--cream)' }}>Sprache:</strong> Ihre bevorzugte Sprache</li>
          <li><strong style={{ color: 'var(--cream)' }}>Einwilligung:</strong> Ob Sie dieses Banner bereits bestätigt haben</li>
        </ul>
        <p style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 16 }}>
          Weitere Informationen finden Sie in unserer{' '}
          <Link to="/datenschutz" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>
            Datenschutzerklärung
          </Link>.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="bgold" onClick={() => setCookieConsent(true)} style={{ flex: 1, minWidth: 140 }}>
            Alle akzeptieren
          </button>
          <button className="boutline" onClick={() => setCookieConsent(false)} style={{ flex: 1, minWidth: 140 }}>
            Nur notwendige
          </button>
        </div>
      </div>
    </div>
  )
}
