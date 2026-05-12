export default function ProviderLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="skeleton" style={{ width: 240, height: 32, borderRadius: 8 }} />
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />
        ))}
      </div>
      <div className="skeleton" style={{ width: '100%', height: 320, borderRadius: 18 }} />
      <div className="skeleton" style={{ width: '100%', height: 120, borderRadius: 18 }} />
    </div>
  )
}
