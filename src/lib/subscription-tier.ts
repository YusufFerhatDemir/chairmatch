/**
 * Abo-Stufen: Zuordnung zwischen Stripe-Preis, Stripe-Abostatus und der
 * Spalte `salons.subscription_tier`.
 *
 * Bewusst eigenes Modul und NICHT in `@/lib/stripe`: der Webhook braucht diese
 * Zuordnung, und `@/lib/stripe` ist in fuenf Testdateien gemockt. Ein Import
 * von dort haette jede dieser Mock-Tabellen erweitern muessen, damit die
 * Zuordnung ueberhaupt getestet werden kann. Hier haengt nichts an Stripe —
 * nur an denselben Umgebungsvariablen wie SUBSCRIPTION_PRICES.
 */

export type Tier = 'starter' | 'premium' | 'gold'

/**
 * Die Stufe ohne Abo. `salons.subscription_tier` hat live den Default
 * 'starter', und das Provider-Dashboard bietet bei 'starter' das Upgrade an —
 * 'starter' ist also die kostenlose Grundstufe, nicht die kleinste bezahlte.
 */
export const FREE_TIER: Tier = 'starter'

const TIERS: readonly Tier[] = ['starter', 'premium', 'gold']

export function isTier(value: unknown): value is Tier {
  return typeof value === 'string' && (TIERS as readonly string[]).includes(value)
}

/**
 * Platzhalter aus `SUBSCRIPTION_PRICES` (Fallback, wenn die ENV fehlt).
 *
 * Sie duerfen NICHT in die Rueckwaerts-Zuordnung: sind zwei Preis-ENVs nicht
 * gesetzt, traegt sonst jede von ihnen denselben Platzhalter und ein
 * beliebiges Stripe-Preis-Objekt bekaeme eine erfundene Stufe zugewiesen.
 */
const PLACEHOLDERS = new Set(['price_starter', 'price_premium', 'price_gold'])

/** Stufe → konfigurierte Stripe-Price-ID (leer, wenn ENV fehlt). */
function configuredPrices(): Record<Tier, string | null> {
  const pick = (v: string | undefined) =>
    v && v.trim() && !PLACEHOLDERS.has(v.trim()) ? v.trim() : null
  return {
    starter: pick(process.env.STRIPE_PRICE_STARTER),
    premium: pick(process.env.STRIPE_PRICE_PREMIUM),
    gold: pick(process.env.STRIPE_PRICE_GOLD),
  }
}

/**
 * Stripe-Price-ID → Stufe. `null`, wenn die ID zu keiner konfigurierten
 * Stufe gehoert — der Aufrufer darf daraus KEINE Stufe raten.
 */
export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  if (!priceId) return null
  const prices = configuredPrices()
  for (const tier of TIERS) {
    if (prices[tier] === priceId) return tier
  }
  return null
}

/**
 * Was ein Stripe-Abostatus fuer die Freischaltung bedeutet.
 *
 *  entitled  — Zugang steht zu (bezahlt oder in der Testphase)
 *  revoked   — Zugang endet (gekuendigt, endgueltig unbezahlt, pausiert)
 *  grace     — Zahlung haengt, Stripe mahnt noch. Die Stufe bleibt, wie sie
 *              ist: eine Rueckstufung beim ersten Fehlversuch wuerde jeden
 *              Anbieter treffen, dessen Karte einmal abgelehnt wird.
 *
 * `incomplete` ist Grace, nicht Revoke: der Status steht direkt nach dem
 * Anlegen, bevor die erste Zahlung durch ist. Erst `incomplete_expired`
 * (Stripe gibt nach 23h auf) entzieht.
 */
export type Entitlement = 'entitled' | 'revoked' | 'grace'

export function entitlementForStatus(status: string | null | undefined): Entitlement {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'entitled'
    case 'canceled':
    case 'unpaid':
    case 'incomplete_expired':
    case 'paused':
      return 'revoked'
    default:
      // past_due, incomplete und alles Unbekannte
      return 'grace'
  }
}
