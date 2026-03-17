export default function PublicLoading() {
  return (
    <div className="shell">
      <div className="screen" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', padding: 'var(--pad)', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(160, 120, 48, 0.2)',
          borderTopColor: '#A07830',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <div className="skeleton" style={{ width: '60%', height: 20, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: '40%', height: 14, borderRadius: 6 }} />
      </div>
    </div>
  )
}
