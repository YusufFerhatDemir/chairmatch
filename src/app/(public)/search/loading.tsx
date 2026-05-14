/**
 * Loading-Skeleton für Search-Page.
 * Next.js zeigt das während die Server-Komponente lädt — verhindert
 * weißen Screen oder hängenden Eindruck.
 */

export default function SearchLoading() {
  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky" style={{ padding: 'var(--pad)' }}>
          <div style={{ height: 18, background: 'var(--c2)', borderRadius: 6, width: 80, marginBottom: 12 }} />
          <div style={{ height: 28, background: 'var(--c2)', borderRadius: 8, width: '60%', marginBottom: 16 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <div style={{ flex: 1, height: 44, background: 'var(--c2)', borderRadius: 12 }} />
            <div style={{ width: 100, height: 44, background: 'var(--c2)', borderRadius: 12 }} />
          </div>
          <p style={{ fontSize: 12, color: 'var(--stone)', textAlign: 'center', margin: '10px 0' }}>
            Lade Salons …
          </p>
        </div>

        <section style={{ padding: '0 var(--pad)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card" style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--c3)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ height: 14, background: 'var(--c3)', borderRadius: 4, width: '60%', marginBottom: 6 }} />
                <div style={{ height: 11, background: 'var(--c3)', borderRadius: 4, width: '40%' }} />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
