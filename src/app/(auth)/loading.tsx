export default function AuthLoading() {
  return (
    <div className="shell">
      <div className="screen" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', padding: 'var(--pad)', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(200, 168, 75, 0.2)',
          borderTopColor: '#D6B15A',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div className="skeleton" style={{ width: 200, height: 28, borderRadius: 8 }} />
        <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
          <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 44, borderRadius: 10 }} />
          <div className="skeleton" style={{ width: '100%', height: 48, borderRadius: 10 }} />
        </div>
      </div>
    </div>
  )
}
