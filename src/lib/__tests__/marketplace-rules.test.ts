/**
 * Provisionsrechnung (Modell C).
 *
 * Geprueft wird die Rechenlogik gegen die im Modul hinterlegten Saetze —
 * die Saetze selbst sind Geschaeftsentscheidung und werden hier NICHT
 * dupliziert, sondern aus COMMISSION_RULES gelesen. Sonst wuerde der Test
 * eine Preisaenderung als Fehler melden, statt Rechenfehler zu finden.
 */
import { describe, it, expect } from 'vitest'
import {
  COMMISSION_RULES,
  calculateCommission,
  type CommissionType,
} from '../marketplace-rules'

const TYPES = Object.keys(COMMISSION_RULES) as CommissionType[]

describe('calculateCommission', () => {
  it.each(TYPES)('teilt bei "%s" den Betrag restlos auf', type => {
    // Kein Cent darf zwischen Plattform und Anbieter verschwinden.
    for (const amount of [0, 1, 7, 999, 5000, 123457, 99999999]) {
      const r = calculateCommission(type, amount)
      expect(r.platformFee + r.providerShare).toBe(amount)
      expect(r.platformFee).toBeGreaterThanOrEqual(0)
      expect(r.providerShare).toBeGreaterThanOrEqual(0)
    }
  })

  it.each(TYPES)('nutzt bei "%s" den hinterlegten Satz', type => {
    const rule = COMMISSION_RULES[type]
    const r = calculateCommission(type, 100_000)
    expect(r.rate).toBe(rule.rate)
    expect(r.label).toBe(rule.label)
    expect(r.platformFee).toBe(Math.round(100_000 * rule.rate))
  })

  it('laesst dem Anbieter bei 0 % den vollen Betrag', () => {
    const nullRate = TYPES.filter(t => COMMISSION_RULES[t].rate === 0)
    expect(nullRate.length).toBeGreaterThan(0)
    for (const type of nullRate) {
      const r = calculateCommission(type, 8_800)
      expect(r.platformFee).toBe(0)
      expect(r.providerShare).toBe(8_800)
    }
  })

  it('laesst dem Anbieter bei 100 % nichts', () => {
    const fullRate = TYPES.filter(t => COMMISSION_RULES[t].rate === 1)
    for (const type of fullRate) {
      const r = calculateCommission(type, 8_800)
      expect(r.platformFee).toBe(8_800)
      expect(r.providerShare).toBe(0)
    }
  })

  it('rundet die Plattform-Gebuehr kaufmaennisch auf ganze Cent', () => {
    // 10 % von 1 Cent = 0,1 Cent → 0; 10 % von 5 Cent = 0,5 → 1
    const zehn = TYPES.find(t => COMMISSION_RULES[t].rate === 0.1)
    if (!zehn) return
    expect(calculateCommission(zehn, 1).platformFee).toBe(0)
    expect(calculateCommission(zehn, 5).platformFee).toBe(1)
    expect(Number.isInteger(calculateCommission(zehn, 3333).platformFee)).toBe(true)
  })

  it('haelt jeden Satz zwischen 0 und 1 — ein Tippfehler waere sofort Geld', () => {
    for (const type of TYPES) {
      expect(COMMISSION_RULES[type].rate).toBeGreaterThanOrEqual(0)
      expect(COMMISSION_RULES[type].rate).toBeLessThanOrEqual(1)
    }
  })
})
