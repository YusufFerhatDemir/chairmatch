'use client'

type RiskLevel = 'LOW' | 'MED' | 'HIGH' | 'VERY_HIGH'

interface RiskBadgeProps {
  level: RiskLevel
  className?: string
}

const STYLES: Record<RiskLevel, { bg: string; color: string; label: string }> = {
  LOW: { bg: 'rgba(74,138,90,0.2)', color: '#4A8A5A', label: 'LOW' },
  MED: { bg: 'rgba(200,168,75,0.2)', color: 'var(--gold2)', label: 'MED' },
  HIGH: { bg: 'rgba(232,168,64,0.2)', color: '#E8A840', label: 'HIGH' },
  VERY_HIGH: { bg: 'rgba(232,80,64,0.2)', color: '#E85040', label: 'VERY_HIGH' },
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const s = STYLES[level] || STYLES.LOW
  return (
    <span
      className={className}
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        backgroundColor: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  )
}
