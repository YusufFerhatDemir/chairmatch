interface ProgressBarProps {
  value: number
  max?: number
}

export function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="pbar">
      <div className="pfill" style={{ width: `${pct}%` }} />
    </div>
  )
}
