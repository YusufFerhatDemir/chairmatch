/**
 * Quell-Guard: keine eingestellte Zahlart in den Checkout-Sessions.
 *
 * giropay hat Stripe zum 30.06.2024 abgeschaltet. Ein Aufruf von
 * `checkout.sessions.create` mit dieser Zahlart schlaegt hart fehl — die
 * Session entsteht gar nicht erst, der Nutzer sieht nur einen Fehler. Der
 * Miet-Checkout hatte den Wert deshalb entfernt, Termin- und Shop-Checkout
 * schleppten ihn bis 2026-08-27 weiter.
 *
 * Der Test liest die Quelle, statt `@/lib/stripe` zu importieren: das Modul
 * baut beim Import einen Stripe-Client und braucht dafuer echte Keys.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const SOURCE = readFileSync(resolve(process.cwd(), 'src/lib/stripe.ts'), 'utf-8')

/** Alle `payment_method_types`-Literale aus der Quelle. */
function paymentMethodLists(): string[][] {
  return [...SOURCE.matchAll(/payment_method_types:\s*\[([^\]]*)\]/g)].map(m =>
    m[1]
      .split(',')
      .map(s => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean),
  )
}

describe('Stripe-Zahlarten', () => {
  it('deklariert ueberhaupt Zahlarten (sonst prueft der Guard nichts)', () => {
    expect(paymentMethodLists().length).toBeGreaterThanOrEqual(4)
  })

  it('bietet giropay nirgends mehr an', () => {
    for (const list of paymentMethodLists()) {
      expect(list).not.toContain('giropay')
    }
  })

  it('behaelt card und sepa_debit in jeder Session', () => {
    for (const list of paymentMethodLists()) {
      expect(list).toContain('card')
      expect(list).toContain('sepa_debit')
    }
  })
})
