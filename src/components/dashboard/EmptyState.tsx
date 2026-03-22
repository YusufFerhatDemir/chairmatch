interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: { label: string; href: string }
}

export default function EmptyState({ icon = '📊', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: 40, marginBottom: 16, opacity: 0.5 }}>{icon}</span>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--cream)', marginBottom: 6 }}>{title}</p>
      {description && (
        <p style={{ fontSize: 12, color: 'var(--stone)', maxWidth: 300, lineHeight: 1.6 }}>{description}</p>
      )}
      {action && (
        <a href={action.href} style={{
          marginTop: 16,
          fontSize: 12,
          fontWeight: 700,
          color: 'var(--gold2)',
          textDecoration: 'none',
          padding: '8px 20px',
          border: '1px solid rgba(176,144,96,0.3)',
          borderRadius: 10,
        }}>
          {action.label}
        </a>
      )}
    </div>
  )
}
