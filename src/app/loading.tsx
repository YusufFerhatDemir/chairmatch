export default function Loading() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 16,
      minHeight: '60vh',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid rgba(176, 120, 8, 0.2)',
        borderTopColor: '#B07808',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="skeleton" style={{ width: '60%', height: 24, borderRadius: 8 }} />
        <div className="skeleton" style={{ width: '100%', height: 16, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: '80%', height: 16, borderRadius: 6 }} />
      </div>
    </div>
  )
}
