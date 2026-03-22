interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: { label: string; onClick?: () => void; href?: string }
}

export default function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid var(--border, rgba(176,144,96,0.08))',
    }}>
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', margin: 0, letterSpacing: 0.3 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{subtitle}</p>}
      </div>
      {action && (
        action.href ? (
          <a href={action.href} style={{
            fontSize: 11, fontWeight: 600, color: 'var(--gold2)', textDecoration: 'none',
          }}>{action.label}</a>
        ) : (
          <button onClick={action.onClick} style={{
            fontSize: 11, fontWeight: 600, color: 'var(--gold2)', background: 'none', border: 'none', cursor: 'pointer',
          }}>{action.label}</button>
        )
      )}
    </div>
  )
}
