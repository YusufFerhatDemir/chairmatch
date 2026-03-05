interface StarsProps {
  rating: number
  count?: number
  size?: number
  interactive?: boolean
  onChange?: (rating: number) => void
}

export function Stars({ rating, count, size = 14, interactive = false, onChange }: StarsProps) {
  const stars = [1, 2, 3, 4, 5]

  if (!interactive) {
    return (
      <span
        role="img"
        aria-label={`${rating} von 5 Sternen`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
      >
        {stars.map(s => (
          <span
            key={s}
            aria-hidden="true"
            style={{
              fontSize: size,
              cursor: 'default',
              color: s <= Math.round(rating) ? 'var(--gold)' : 'var(--c5)',
              transition: 'color 0.2s',
            }}
          >
            ★
          </span>
        ))}
        {typeof count === 'number' && (
          <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginLeft: 4 }}>
            ({count})
          </span>
        )}
      </span>
    )
  }

  return (
    <span
      role="radiogroup"
      aria-label="Bewertung"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
    >
      {stars.map(s => (
        <span
          key={s}
          role="radio"
          tabIndex={0}
          aria-checked={s === Math.round(rating)}
          aria-label={s === 1 ? '1 Stern' : `${s} Sterne`}
          onClick={() => onChange?.(s)}
          onKeyDown={e => e.key === 'Enter' && onChange?.(s)}
          style={{
            fontSize: size,
            cursor: 'pointer',
            color: s <= Math.round(rating) ? 'var(--gold)' : 'var(--c5)',
            transition: 'color 0.2s',
          }}
        >
          ★
        </span>
      ))}
      {typeof count === 'number' && (
        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginLeft: 4 }}>
          ({count})
        </span>
      )}
    </span>
  )
}
