/**
 * Trust-Badge-Komponenten für ChairMatch.
 *
 * Jedes Badge MUSS wahr sein — keine Show-Trust-Signale.
 * Quellen: Stripe, DSGVO, Vercel EU, Made-in-DE — alles real verifizierbar.
 */

import Link from 'next/link'

export function StripeSecurityBadge({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(99,91,255,0.08)', border: '1px solid rgba(99,91,255,0.2)',
      borderRadius: 8, padding: compact ? '4px 8px' : '6px 12px',
    }}>
      <span style={{ fontSize: 14 }}>🔒</span>
      <span style={{ fontSize: compact ? 10 : 12, color: '#A4A0FF', fontWeight: 600 }}>
        Stripe-gesichert
      </span>
    </div>
  )
}

export function GdprBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/datenschutz" style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: 'rgba(74,138,90,0.10)', border: '1px solid rgba(74,138,90,0.25)',
        borderRadius: 8, padding: compact ? '4px 8px' : '6px 12px',
      }}>
        <span style={{ fontSize: 14 }}>🇪🇺</span>
        <span style={{ fontSize: compact ? 10 : 12, color: 'var(--green)', fontWeight: 600 }}>
          DSGVO-konform
        </span>
      </div>
    </Link>
  )
}

export function MadeInGermanyBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.25)',
      borderRadius: 8, padding: '6px 12px',
    }}>
      <span style={{ fontSize: 12 }}>🇩🇪</span>
      <span style={{ fontSize: 12, color: 'var(--gold2)', fontWeight: 600 }}>
        Made in Germany
      </span>
    </div>
  )
}

export function VercelEuBadge() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,0,0,0.4)', border: '1px solid #444',
      borderRadius: 8, padding: '6px 12px',
    }}>
      <span style={{ fontSize: 12, color: '#ccc' }}>▲</span>
      <span style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>
        Vercel EU · Frankfurt
      </span>
    </div>
  )
}

/**
 * Verified-Salon-Badge.
 * Kriterien: is_verified = true in DB. Wird vom Admin-Team gesetzt
 * nachdem Gewerbeschein + Adresse + min. 1 Bewertung geprüft sind.
 */
export function VerifiedSalonBadge({ verified }: { verified: boolean }) {
  if (!verified) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'rgba(74,138,90,0.15)', border: '1px solid var(--green)',
      borderRadius: 6, padding: '3px 8px',
    }}>
      <span style={{ fontSize: 10 }}>✓</span>
      <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
        Verifiziert
      </span>
    </div>
  )
}

/**
 * Top-Anbieter-Badge.
 * Logik: avg_rating ≥ 4.7 UND review_count ≥ 10.
 * Wenn Schwelle nicht erreicht → nichts rendern.
 */
export function TopProviderBadge({
  rating, reviewCount, threshold = 4.7, minReviews = 10,
}: {
  rating: number | null | undefined
  reviewCount: number | null | undefined
  threshold?: number
  minReviews?: number
}) {
  if (!rating || !reviewCount) return null
  if (rating < threshold || reviewCount < minReviews) return null
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(176,144,96,0.1))',
      border: '1px solid var(--gold)',
      borderRadius: 6, padding: '3px 8px',
    }}>
      <span style={{ fontSize: 10 }}>⭐</span>
      <span style={{ fontSize: 10, color: 'var(--gold2)', fontWeight: 700 }}>
        Top-Anbieter
      </span>
    </div>
  )
}

/**
 * "Aktiv seit"-Anzeige.
 * Berechnet aus created_at-Datum. Erst ab >= 30 Tagen anzeigen.
 */
export function ActiveSinceBadge({ createdAt }: { createdAt: string | null | undefined }) {
  if (!createdAt) return null
  const created = new Date(createdAt)
  const days = Math.floor((Date.now() - created.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 30) return null

  const display = days < 365
    ? `seit ${Math.floor(days / 30)} Monaten`
    : `seit ${(days / 365).toFixed(1)} Jahren`

  return (
    <span style={{ fontSize: 10, color: 'var(--stone)' }}>
      🗓️ Aktiv {display}
    </span>
  )
}

/**
 * Anti-Bypass-Hinweis: erklärt WARUM Kontaktdaten erst nach Buchung
 * freigegeben werden. Klare Substanz statt Frust.
 */
export function AntiBypassNotice() {
  return (
    <div style={{
      background: 'rgba(99,91,255,0.06)', border: '1px solid rgba(99,91,255,0.18)',
      borderRadius: 10, padding: 12, marginTop: 10,
    }}>
      <p style={{ fontSize: 11, color: '#A4A0FF', fontWeight: 700, margin: '0 0 4px' }}>
        🔒 Warum sehe ich keine Telefonnummer?
      </p>
      <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.5, margin: 0 }}>
        Schutz für beide Seiten: Bei Streit greift unsere Zahlungs-Garantie nur bei Buchungen
        über die Plattform. Kontaktdaten werden direkt nach Buchungs-Bestätigung freigeschaltet.
      </p>
    </div>
  )
}

/**
 * Trust-Bar — kombiniert mehrere Badges für Footer/Hero.
 */
export function TrustBar() {
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
      padding: '12px 0',
    }}>
      <StripeSecurityBadge />
      <GdprBadge />
      <VercelEuBadge />
      <MadeInGermanyBadge />
    </div>
  )
}
