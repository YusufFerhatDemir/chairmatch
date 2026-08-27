// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { naechsteTage, tagePlus, wochentag } from '@/lib/booking-days'
import { berlinToday } from '@/lib/berlin-time'

/**
 * Der Tagesstreifen von /booking/[salonId].
 *
 * Der Defekt, den diese Tests festhalten: Beschriftung und abgeschickter Wert
 * kamen aus zwei Quellen (Ortszeit fuer `getDate()`, UTC fuer
 * `toISOString()`). Abends nach 22:00 Berliner Sommerzeit lagen die beiden
 * auf verschiedenen Kalendertagen — der Kunde tippte auf "Fr 28" und buchte
 * den 27. Nichts schlug fehl, der Termin stand nur am falschen Tag.
 */
describe('naechsteTage', () => {
  it('beschriftet jeden Tag mit genau dem Datum, das auch abgeschickt wird', () => {
    const tage = naechsteTage(7, '2026-08-27')

    expect(tage.map(t => t.iso)).toEqual([
      '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30',
      '2026-08-31', '2026-09-01', '2026-09-02',
    ])

    for (const t of tage) {
      const [, mo, dt] = t.iso.split('-').map(Number)
      expect(t.dt).toBe(dt)
      expect(t.mo).toBe(mo)
      expect(t.full).toBe(`${t.day} ${dt}.${mo}`)
    }
  })

  it('nennt die richtigen Wochentage', () => {
    // 27.08.2026 ist ein Donnerstag.
    expect(naechsteTage(3, '2026-08-27').map(t => t.day)).toEqual(['Do', 'Fr', 'Sa'])
  })

  it('laeuft ueber den Monats- und Jahreswechsel', () => {
    expect(naechsteTage(2, '2026-12-31').map(t => t.iso)).toEqual(['2026-12-31', '2027-01-01'])
    expect(naechsteTage(2, '2026-12-31')[1].full).toBe('Fr 1.1')
  })

  it('haelt ueber die Sommerzeit-Umstellung durch', () => {
    // In der Nacht zum 25.10.2026 endet die Sommerzeit. Mit einer
    // Stundenarithmetik auf Date-Objekten waere hier ein Tag doppelt oder
    // gar nicht aufgetaucht.
    expect(naechsteTage(3, '2026-10-24').map(t => t.iso)).toEqual([
      '2026-10-24', '2026-10-25', '2026-10-26',
    ])
  })

  it('startet ohne Argument beim Berliner heute, nicht beim UTC-heute', () => {
    // 21:30 UTC am 27.08. ist in Berlin (UTC+2) bereits der 27. um 23:30 —
    // hier stimmen beide noch ueberein.
    expect(naechsteTage(1)[0].iso).toBe(berlinToday())

    // 22:30 UTC am 27.08. ist in Berlin schon der 28. Genau dieser Fall ging
    // vorher schief: der Streifen begann laut Beschriftung beim 28., der
    // abgeschickte Wert war der 27.
    const spaetAbends = Date.UTC(2026, 7, 27, 22, 30)
    expect(berlinToday(spaetAbends)).toBe('2026-08-28')
    expect(naechsteTage(1, berlinToday(spaetAbends))[0]).toMatchObject({
      iso: '2026-08-28',
      dt: 28,
      full: 'Fr 28.8',
    })
  })
})

describe('tagePlus / wochentag', () => {
  it('rechnet rein kalendarisch', () => {
    expect(tagePlus('2026-02-28', 1)).toBe('2026-03-01') // 2026 ist kein Schaltjahr
    expect(tagePlus('2024-02-28', 1)).toBe('2024-02-29')
    expect(tagePlus('2026-08-27', 0)).toBe('2026-08-27')
  })

  it('nennt den Wochentag unabhaengig von der Prozess-Zeitzone', () => {
    expect(wochentag('2026-08-27')).toBe('Do')
    expect(wochentag('2026-01-01')).toBe('Do')
    expect(wochentag('2026-03-29')).toBe('So') // Beginn der Sommerzeit
  })
})
