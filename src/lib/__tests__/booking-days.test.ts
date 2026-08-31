// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { naechsteTage, tagePlus, wochentag, tagGesperrt } from '@/lib/booking-days'
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

/**
 * `tagGesperrt` — warum ein Kalendertag nicht buchbar ist.
 *
 * Beide Buchungsstrecken zeigten Feiertage und Ruhetage des Salons als ganz
 * normale, anklickbare Tage. Serverseitig weist `createBooking` sie seit
 * Track 25 ab; der Kunde erfuhr es aber erst nach der Auswahl und einem
 * Aufruf von /api/availability — und musste danach raten, welcher Tag geht.
 */
describe('tagGesperrt', () => {
  const SALON = {
    state: 'NW',
    opening_hours: {
      mo: { open: '09:00', close: '18:00' },
      di: { open: '09:00', close: '18:00' },
      mi: { open: '09:00', close: '18:00' },
      do: { open: '09:00', close: '18:00' },
      fr: { open: '09:00', close: '18:00' },
      sa: { open: '10:00', close: '16:00' },
      so: null,
    },
  }

  it('sperrt vergangene Tage', () => {
    expect(tagGesperrt('2026-08-30', SALON, '2026-09-01')).toBe('vergangen')
  })

  it('sperrt gesetzliche Feiertage', () => {
    // 25.12.2026 ist ein Freitag — ohne Feiertagspruefung ein ganz normaler
    // Oeffnungstag.
    expect(tagGesperrt('2026-12-25', SALON, '2026-09-01')).toBe('feiertag')
  })

  it('sperrt den Ruhetag des Salons', () => {
    // 06.09.2026 ist ein Sonntag, `so: null`.
    expect(tagGesperrt('2026-09-06', SALON, '2026-09-01')).toBe('ruhetag')
  })

  it('laesst einen gewoehnlichen Oeffnungstag zu', () => {
    // 02.09.2026 ist ein Mittwoch.
    expect(tagGesperrt('2026-09-02', SALON, '2026-09-01')).toBeNull()
  })

  it('sperrt NICHT, wenn der Salon gar keine Zeiten gepflegt hat', () => {
    // „Keine Angabe" ist nicht „geschlossen" — dieselbe Entscheidung wie
    // serverseitig in `salonGeschlossen`. Sonst legt eine leere Spalte den
    // Betrieb still.
    expect(tagGesperrt('2026-09-06', { state: 'NW', opening_hours: null }, '2026-09-01')).toBeNull()
  })

  it('sperrt nichts, solange der Salon noch nicht geladen ist', () => {
    expect(tagGesperrt('2026-09-06', null, '2026-09-01')).toBeNull()
    expect(tagGesperrt('2026-08-30', null, '2026-09-01')).toBe('vergangen')
  })

  it('kennt landesspezifische Feiertage', () => {
    // Fronleichnam 2026 (04.06.) ist in NW Feiertag, in Berlin nicht.
    expect(tagGesperrt('2026-06-04', SALON, '2026-01-01')).toBe('feiertag')
    expect(tagGesperrt('2026-06-04', { ...SALON, state: 'BE' }, '2026-01-01')).toBeNull()
  })
})
