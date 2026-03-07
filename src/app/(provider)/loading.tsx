export default function ProviderLoading() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', minHeight: '60vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div className="skeleton" style={{ width: 180, height: 24, borderRadius: 8 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
        <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 16 }} />
      </div>
    </div>
  )
}
