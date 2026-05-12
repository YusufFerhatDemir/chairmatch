/**
 * Chairmatch Marketplace Rules — Modell C
 *
 * Provisionsstruktur:
 *  - 0%   Buchungen (USP gegenüber Treatwell & Co.)
 *  - 10%  Stuhl-/Liegen-Vermietung
 *  - 8%   OP-Raum / Praxisraum
 *  - 100% Affiliate (komplett an Plattform)
 *
 * Plus drei Abo-Stufen (Free / Premium / Gold) als zusätzliche Einnahmequelle.
 */

export type CommissionType =
  | 'booking'
  | 'chair_rental'
  | 'opraum_rental'
  | 'affiliate'

export interface CommissionRule {
  rate: number
  label: string
}

export const COMMISSION_RULES: Record<CommissionType, CommissionRule> = {
  booking: { rate: 0, label: 'Buchung' },              // 0% — USP
  chair_rental: { rate: 0.10, label: 'Stuhl/Liege-Vermietung' },
  opraum_rental: { rate: 0.08, label: 'OP-Raum / Praxisraum' },
  affiliate: { rate: 1.00, label: 'Affiliate (100% an Plattform)' },
}

export type SubscriptionTier = 'free' | 'premium' | 'gold'

export interface SubscriptionTierConfig {
  name: string
  priceMonthlyEur: number
  features: string[]
}

export const SUBSCRIPTION_TIERS: Record<SubscriptionTier, SubscriptionTierConfig> = {
  free: {
    name: 'Free',
    priceMonthlyEur: 0,
    features: ['Basic-Listing', 'Bis 5 Services', 'E-Mail-Support'],
  },
  premium: {
    name: 'Premium',
    priceMonthlyEur: 49,
    features: [
      'Featured-Listing',
      'Unlimited Services',
      'Marketing-Tools',
      'Booking-Reminder',
      'Analytics-Dashboard',
      'Priority-Support',
    ],
  },
  gold: {
    name: 'Gold',
    priceMonthlyEur: 99,
    features: [
      'Alles aus Premium',
      'Multi-Location',
      'API-Zugriff',
      'Custom-Branding',
      'Dedicated Account-Manager',
      'Erweiterte Statistiken',
    ],
  },
}

export interface CommissionResult {
  platformFee: number
  providerShare: number
  rate: number
  label: string
}

/**
 * Berechnet Plattform-Anteil und Anbieter-Anteil für einen Transaktionsbetrag (in Cents).
 *
 * @param type        Art der Transaktion (s. COMMISSION_RULES)
 * @param amountCents Bruttobetrag in Cents
 * @returns           Aufschlüsselung in Cents + Regel-Metadaten
 */
export function calculateCommission(
  type: CommissionType,
  amountCents: number,
): CommissionResult {
  const rule = COMMISSION_RULES[type]
  const platformFee = Math.round(amountCents * rule.rate)
  const providerShare = amountCents - platformFee
  return {
    platformFee,
    providerShare,
    rate: rule.rate,
    label: rule.label,
  }
}
