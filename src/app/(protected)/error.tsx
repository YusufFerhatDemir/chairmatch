'use client'

export default function ProtectedError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="shell">
      <div className="screen" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '80vh', padding: 'var(--pad)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 8 }}>
          Diese Seite ist gerade nicht verfügbar
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginBottom: 24, maxWidth: 380 }}>
          Wir hatten ein technisches Problem. Bitte erneut versuchen oder zurück zur Übersicht.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={reset} className="bgold" style={{ padding: '12px 24px' }}>
            Erneut versuchen
          </button>
          <a href="/account" className="boutline" style={{ padding: '12px 24px', textDecoration: 'none' }}>
            Zum Konto
          </a>
        </div>
      </div>
    </div>
  )
}
