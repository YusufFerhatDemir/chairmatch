'use client'

type Status = 'RED' | 'YELLOW' | 'GREEN'

interface ComplianceStatusPillProps {
  status: Status
  label?: string
  className?: string
}

const STYLES: Record<Status, { bg: string; color: string }> = {
  RED: { bg: 'rgba(232,80,64,0.2)', color: '#E85040' },
  YELLOW: { bg: 'rgba(232,168,64,0.2)', color: '#E8A840' },
  GREEN: { bg: 'rgba(74,138,90,0.2)', color: '#4A8A5A' },
}

export function ComplianceStatusPill({ status, label, className }: ComplianceStatusPillProps) {
  const s = STYLES[status] || STYLES.YELLOW
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {label ?? status}
    </span>
  )
}
