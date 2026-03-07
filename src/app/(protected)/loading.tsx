export default function ProtectedLoading() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="skeleton" style={{ width: 140, height: 20, borderRadius: 6 }} />
            <div className="skeleton" style={{ width: 100, height: 14, borderRadius: 6 }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 72, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
