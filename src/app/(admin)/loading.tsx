export default function AdminLoading() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 160, height: 24, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[80, 100, 90].map((w, i) => (
            <div key={i} className="skeleton" style={{ width: w, height: 36, borderRadius: 8 }} />
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ width: '100%', height: 64, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  )
}
