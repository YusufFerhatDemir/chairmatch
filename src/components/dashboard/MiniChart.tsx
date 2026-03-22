'use client'

interface MiniChartProps {
  data: number[]
  labels?: string[]
  height?: number
  color?: string
  type?: 'bar' | 'line'
  showLabels?: boolean
}

export default function MiniChart({
  data, labels, height = 120, color = 'var(--gold2)', type = 'bar', showLabels = true,
}: MiniChartProps) {
  if (data.length === 0) return null

  const max = Math.max(...data, 1)
  const barWidth = Math.min(28, Math.floor(240 / data.length))
  const gap = Math.max(2, Math.floor(barWidth * 0.3))

  if (type === 'line') {
    const w = data.length * (barWidth + gap)
    const h = height - 20
    const points = data.map((v, i) => {
      const x = i * (w / Math.max(data.length - 1, 1))
      const y = h - (v / max) * h
      return `${x},${y}`
    }).join(' ')

    return (
      <div style={{ padding: '8px 0' }}>
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: 'block' }}>
          <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
          {data.map((v, i) => {
            const x = i * (w / Math.max(data.length - 1, 1))
            const y = h - (v / max) * h
            return <circle key={i} cx={x} cy={y} r={3} fill={color} />
          })}
          {showLabels && labels && labels.map((l, i) => {
            const x = i * (w / Math.max(data.length - 1, 1))
            return <text key={i} x={x} y={height - 2} textAnchor="middle" fill="rgba(245,245,247,0.4)" fontSize={8}>{l}</text>
          })}
        </svg>
      </div>
    )
  }

  // Bar chart
  const totalWidth = data.length * (barWidth + gap) - gap
  return (
    <div style={{ padding: '8px 0' }}>
      <svg width={totalWidth} height={height} viewBox={`0 0 ${totalWidth} ${height}`} style={{ display: 'block' }}>
        {data.map((v, i) => {
          const barH = Math.max(2, (v / max) * (height - 20))
          const x = i * (barWidth + gap)
          const y = height - 20 - barH
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={color} opacity={0.85} />
              {showLabels && labels?.[i] && (
                <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fill="rgba(245,245,247,0.4)" fontSize={8}>
                  {labels[i]}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
