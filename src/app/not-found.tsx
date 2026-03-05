import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="shell">
      <div className="screen" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        padding: 'var(--pad)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>💈</div>
        <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginBottom: 8 }}>
          Seite nicht gefunden
        </h1>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', marginBottom: 24 }}>
          Die angeforderte Seite existiert nicht.
        </p>
        <Link href="/" className="bgold" style={{ maxWidth: 200, display: 'inline-block' }}>
          Zur Startseite
        </Link>
      </div>
    </div>
  )
}
