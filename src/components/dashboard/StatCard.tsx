'use client'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: string
  trend?: { value: number; label: string }
  color?: 'gold' | 'green' | 'red' | 'blue'
}

const COLORS = {
  gold: { bg: 'rgba(176,144,96,0.10)', border: 'rgba(176,144,96,0.18)', accent: 'var(--gold2)' },
  green: { bg: 'rgba(74,138,90,0.10)', border: 'rgba(74,138,90,0.18)', accent: 'var(--green)' },
  red: { bg: 'rgba(232,80,64,0.10)', border: 'rgba(232,80,64,0.18)', accent: 'var(--red)' },
  blue: { bg: 'rgba(96,144,200,0.10)', border: 'rgba(96,144,200,0.18)', accent: '#6090C8' },
}

export default function StatCard({ label, value, sub, icon, trend, color = 'gold' }: StatCardProps) {
  const c = COLORS[color]
  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      padding: '18px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 0.5, fontWeight: 600 }}>{label}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>}
      </div>
      <span style={{ fontSize: 26, fontWeight: 800, color: c.accent, letterSpacing: -0.5 }}>{value}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend && (
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            color: trend.value >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        )}
        {sub && <span style={{ fontSize: 10, color: 'var(--stone2)' }}>{sub}</span>}
      </div>
    </div>
  )
}
