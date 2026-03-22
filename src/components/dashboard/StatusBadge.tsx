interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  active: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  aktiv: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  verified: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  confirmed: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  completed: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  paid: { bg: 'rgba(74,138,90,0.12)', text: 'var(--green)', border: 'rgba(74,138,90,0.25)' },
  pending: { bg: 'rgba(200,168,96,0.12)', text: 'var(--gold2)', border: 'rgba(200,168,96,0.25)' },
  processing: { bg: 'rgba(200,168,96,0.12)', text: 'var(--gold2)', border: 'rgba(200,168,96,0.25)' },
  inactive: { bg: 'rgba(232,80,64,0.10)', text: 'var(--red)', border: 'rgba(232,80,64,0.20)' },
  inaktiv: { bg: 'rgba(232,80,64,0.10)', text: 'var(--red)', border: 'rgba(232,80,64,0.20)' },
  cancelled: { bg: 'rgba(232,80,64,0.10)', text: 'var(--red)', border: 'rgba(232,80,64,0.20)' },
  rejected: { bg: 'rgba(232,80,64,0.10)', text: 'var(--red)', border: 'rgba(232,80,64,0.20)' },
  no_show: { bg: 'rgba(232,80,64,0.10)', text: 'var(--red)', border: 'rgba(232,80,64,0.20)' },
}

const DEFAULT_COLOR = { bg: 'rgba(176,144,96,0.08)', text: 'var(--stone)', border: 'rgba(176,144,96,0.12)' }

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const c = STATUS_COLORS[status.toLowerCase()] || DEFAULT_COLOR
  const isSmall = size === 'sm'
  return (
    <span style={{
      display: 'inline-block',
      fontSize: isSmall ? 10 : 11,
      fontWeight: 700,
      padding: isSmall ? '2px 8px' : '4px 10px',
      borderRadius: 6,
      background: c.bg,
      color: c.text,
      border: `1px solid ${c.border}`,
      textTransform: 'capitalize',
      letterSpacing: 0.3,
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}
