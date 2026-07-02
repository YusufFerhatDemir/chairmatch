/**
 * TenantReputationBadge — kompakte Gold-Pille für die Mieter-Reputation.
 *
 * Für die Einbettung in Anfragen-/Nachrichten-Listen gedacht:
 *   <TenantReputationBadge rating={profile.avg_rating_as_tenant} count={profile.review_count_as_tenant} />
 *
 * Zeigt "★ 4,8 · 12 Bewertungen" — oder "Neu dabei", wenn noch keine
 * Bewertungen vorliegen. Bewusst dependency-frei (nur Inline-Styles).
 */

export type TenantReputationBadgeProps = {
  rating?: number | null
  count?: number
}

export function TenantReputationBadge({ rating, count = 0 }: TenantReputationBadgeProps) {
  const hasReviews = typeof rating === 'number' && Number.isFinite(rating) && count > 0

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'rgba(196,168,106,0.10)',
    border: '1px solid rgba(196,168,106,0.35)',
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.3,
    color: '#C4A86A',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  }

  if (!hasReviews) {
    return (
      <span style={base} aria-label="Noch keine Bewertungen">
        Neu dabei
      </span>
    )
  }

  const formatted = rating.toLocaleString('de-DE', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  const label = count === 1 ? 'Bewertung' : 'Bewertungen'

  return (
    <span style={base} aria-label={`${formatted} von 5 Sternen, ${count} ${label}`}>
      <span aria-hidden="true" style={{ color: '#C4A86A' }}>★</span>
      <span>{formatted}</span>
      <span aria-hidden="true" style={{ opacity: 0.55 }}>·</span>
      <span style={{ fontWeight: 600, opacity: 0.9 }}>{count} {label}</span>
    </span>
  )
}

export default TenantReputationBadge
