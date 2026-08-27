// @vitest-environment node
/**
 * Zuordnung Stripe-Preis/-Status → Abo-Stufe.
 *
 * Der Grund fuer diese Datei steht in `src/lib/subscription-tier.ts`: der
 * Webhook stufte bis Track 11 ausschliesslich beim Checkout hoch und nie
 * wieder um. Ein Stufenwechsel im Stripe-Kundenportal kommt als
 * `customer.subscription.updated` — und die einzige verlaessliche Angabe
 * darin ist die Price-ID des gebuchten Postens. Wird sie falsch zugeordnet,
 * bekommt jemand eine Stufe, fuer die er nicht zahlt.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { entitlementForStatus, isTier, tierForPriceId, FREE_TIER } from '@/lib/subscription-tier'

const ORIGINAL = {
  starter: process.env.STRIPE_PRICE_STARTER,
  premium: process.env.STRIPE_PRICE_PREMIUM,
  gold: process.env.STRIPE_PRICE_GOLD,
}

beforeEach(() => {
  process.env.STRIPE_PRICE_STARTER = 'price_live_starter'
  process.env.STRIPE_PRICE_PREMIUM = 'price_live_premium'
  process.env.STRIPE_PRICE_GOLD = 'price_live_gold'
})

afterEach(() => {
  for (const [key, value] of Object.entries({
    STRIPE_PRICE_STARTER: ORIGINAL.starter,
    STRIPE_PRICE_PREMIUM: ORIGINAL.premium,
    STRIPE_PRICE_GOLD: ORIGINAL.gold,
  })) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

describe('tierForPriceId', () => {
  it('ordnet jede konfigurierte Price-ID ihrer Stufe zu', () => {
    expect(tierForPriceId('price_live_starter')).toBe('starter')
    expect(tierForPriceId('price_live_premium')).toBe('premium')
    expect(tierForPriceId('price_live_gold')).toBe('gold')
  })

  it('gibt null fuer einen unbekannten Preis — keine geratene Stufe', () => {
    expect(tierForPriceId('price_irgendwas')).toBeNull()
    expect(tierForPriceId(null)).toBeNull()
    expect(tierForPriceId(undefined)).toBeNull()
    expect(tierForPriceId('')).toBeNull()
  })

  it('ignoriert die Platzhalter aus SUBSCRIPTION_PRICES', () => {
    // Ohne diesen Riegel wuerde in einer Umgebung ohne STRIPE_PRICE_*
    // jedes Abo, dessen Preis zufaellig "price_gold" heisst, Gold bekommen —
    // und zwar allein deshalb, weil der Fallback denselben String traegt.
    delete process.env.STRIPE_PRICE_GOLD
    delete process.env.STRIPE_PRICE_PREMIUM
    expect(tierForPriceId('price_gold')).toBeNull()
    expect(tierForPriceId('price_premium')).toBeNull()
    // Die konfigurierte Stufe bleibt zuordenbar.
    expect(tierForPriceId('price_live_starter')).toBe('starter')
  })

  it('ordnet nicht zu, wenn die ENV leer oder nur Leerzeichen ist', () => {
    process.env.STRIPE_PRICE_PREMIUM = '   '
    expect(tierForPriceId('   ')).toBeNull()
  })
})

describe('entitlementForStatus', () => {
  it('schaltet nur bei laufendem oder Test-Abo frei', () => {
    expect(entitlementForStatus('active')).toBe('entitled')
    expect(entitlementForStatus('trialing')).toBe('entitled')
  })

  it('entzieht bei gekuendigt, endgueltig unbezahlt und pausiert', () => {
    expect(entitlementForStatus('canceled')).toBe('revoked')
    expect(entitlementForStatus('unpaid')).toBe('revoked')
    expect(entitlementForStatus('incomplete_expired')).toBe('revoked')
    expect(entitlementForStatus('paused')).toBe('revoked')
  })

  it('laesst waehrend der Mahnkette alles stehen', () => {
    // Eine Rueckstufung beim ersten fehlgeschlagenen Einzug wuerde jeden
    // Anbieter treffen, dessen Karte einmal abgelehnt wird — Stripe
    // wiederholt den Einzug danach noch mehrfach.
    expect(entitlementForStatus('past_due')).toBe('grace')
    expect(entitlementForStatus('incomplete')).toBe('grace')
  })

  it('behandelt Unbekanntes als Grace, nicht als Entzug', () => {
    expect(entitlementForStatus('etwas_neues_von_stripe')).toBe('grace')
    expect(entitlementForStatus(null)).toBe('grace')
    expect(entitlementForStatus(undefined)).toBe('grace')
  })
})

describe('isTier', () => {
  it('erkennt genau die drei Stufen', () => {
    expect(isTier('starter')).toBe(true)
    expect(isTier('premium')).toBe(true)
    expect(isTier('gold')).toBe(true)
  })

  it('weist alles andere ab', () => {
    // Ohne diese Pruefung landet ein beliebiger metadata-Wert als Stufe in
    // `salons.subscription_tier`.
    expect(isTier('platin')).toBe(false)
    expect(isTier('')).toBe(false)
    expect(isTier(undefined)).toBe(false)
    expect(isTier(42)).toBe(false)
  })

  it('FREE_TIER ist eine gueltige Stufe', () => {
    expect(isTier(FREE_TIER)).toBe(true)
  })
})
