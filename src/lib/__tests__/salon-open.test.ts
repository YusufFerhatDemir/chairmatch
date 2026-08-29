/**
 * Feiertagsrechner und Oeffnungszeiten-Riegel (Track 25).
 *
 * `lib/holidays.ts` gab es seit langem — geprueft hat es nie jemand, und
 * benutzt wurde es nur von `lib/scheduling.ts`, einem Modul ohne Aufrufer.
 * Zwei Dinge stehen hier deshalb erstmals fest: dass der Osterrechner
 * stimmt, und dass „keine Angabe" nicht als „geschlossen" gilt.
 */
import { describe, it, expect } from 'vitest'
import { getPublicHolidays, isPublicHoliday } from '@/lib/holidays'
import {
  normalizeBundesland,
  hoursForDay,
  parseHoursRange,
  salonGeschlossen,
  istFeiertag,
} from '@/lib/salon-open'

describe('Osterabhaengige Feiertage', () => {
  // Belegt gegen den Kalender: Ostersonntag 2026 = 05.04., 2027 = 28.03.
  it('rechnet Karfreitag und Ostermontag 2026 richtig', () => {
    const d = getPublicHolidays(2026).map(h => h.date)
    expect(d).toContain('2026-04-03') // Karfreitag
    expect(d).toContain('2026-04-06') // Ostermontag
    expect(d).toContain('2026-05-14') // Christi Himmelfahrt (Ostern + 39)
    expect(d).toContain('2026-05-25') // Pfingstmontag (Ostern + 50)
  })

  it('rechnet Ostern 2027 richtig', () => {
    const d = getPublicHolidays(2027).map(h => h.date)
    expect(d).toContain('2027-03-26') // Karfreitag
    expect(d).toContain('2027-03-29') // Ostermontag
  })
})

describe('Die neun bundesweiten Feiertage gelten ueberall', () => {
  const BUNDESWEIT = [
    '2026-01-01', '2026-04-03', '2026-04-06', '2026-05-01',
    '2026-05-14', '2026-05-25', '2026-10-03', '2026-12-25', '2026-12-26',
  ]

  it('liefert ohne Bundesland genau diese neun', () => {
    expect(getPublicHolidays(2026).map(h => h.date).sort()).toEqual([...BUNDESWEIT].sort())
  })

  it('erkennt sie auch ohne Bundesland als Feiertag', () => {
    for (const tag of BUNDESWEIT) {
      expect(isPublicHoliday(tag)).toBe(true)
    }
  })

  it('haelt einen gewoehnlichen Werktag frei', () => {
    expect(isPublicHoliday('2026-09-15')).toBe(false)
    expect(isPublicHoliday('2026-12-24')).toBe(false) // Heiligabend ist KEIN Feiertag
    expect(isPublicHoliday('2026-12-31')).toBe(false) // Silvester ebenso wenig
  })
})

describe('Landesfeiertage', () => {
  it('Fronleichnam gilt in Bayern, nicht in Berlin', () => {
    expect(isPublicHoliday('2027-05-27', 'BY')).toBe(true)
    expect(isPublicHoliday('2027-05-27', 'BE')).toBe(false)
  })

  it('Reformationstag gilt in Thueringen, nicht in Bayern', () => {
    expect(isPublicHoliday('2026-10-31', 'TH')).toBe(true)
    expect(isPublicHoliday('2026-10-31', 'BY')).toBe(false)
  })

  it('Internationaler Frauentag: Berlin ab 2019', () => {
    expect(isPublicHoliday('2018-03-08', 'BE')).toBe(false)
    expect(isPublicHoliday('2019-03-08', 'BE')).toBe(true)
    expect(isPublicHoliday('2027-03-08', 'BE')).toBe(true)
  })

  it('Internationaler Frauentag: Mecklenburg-Vorpommern erst ab 2023', () => {
    expect(isPublicHoliday('2022-03-08', 'MV')).toBe(false)
    expect(isPublicHoliday('2023-03-08', 'MV')).toBe(true)
  })

  it('Weltkindertag gilt nur in Thueringen und erst ab 2019', () => {
    expect(isPublicHoliday('2018-09-20', 'TH')).toBe(false)
    expect(isPublicHoliday('2027-09-20', 'TH')).toBe(true)
    expect(isPublicHoliday('2027-09-20', 'SN')).toBe(false)
  })
})

describe('normalizeBundesland erfindet nichts', () => {
  it('nimmt Kuerzel in jeder Schreibweise', () => {
    expect(normalizeBundesland('BY')).toBe('BY')
    expect(normalizeBundesland('by')).toBe('BY')
    expect(normalizeBundesland(' nw ')).toBe('NW')
  })

  it('nimmt ausgeschriebene Namen, auch mit Umlaut', () => {
    expect(normalizeBundesland('Bayern')).toBe('BY')
    expect(normalizeBundesland('Baden-Württemberg')).toBe('BW')
    expect(normalizeBundesland('Baden-Wuerttemberg')).toBe('BW')
    expect(normalizeBundesland('Thüringen')).toBe('TH')
  })

  it('liefert undefined statt eines geratenen Landes', () => {
    expect(normalizeBundesland('Wolkenkuckucksheim')).toBeUndefined()
    expect(normalizeBundesland('')).toBeUndefined()
    expect(normalizeBundesland(null)).toBeUndefined()
    expect(normalizeBundesland(42)).toBeUndefined()
  })

  it('… und faellt damit auf die bundesweite Liste zurueck', () => {
    expect(istFeiertag('2026-12-25', 'Quatsch')).toBe(true)
    expect(istFeiertag('2027-05-27', 'Quatsch')).toBe(false)
  })
})

describe('parseHoursRange', () => {
  it('liest Bindestrich und Gedankenstrich', () => {
    expect(parseHoursRange('09:00 - 18:00')).toEqual({ start: 540, end: 1080 })
    expect(parseHoursRange('09:00–18:00')).toEqual({ start: 540, end: 1080 })
  })

  it('verwirft Unlesbares und leere Spannen', () => {
    expect(parseHoursRange('Geschlossen')).toBeNull()
    expect(parseHoursRange('nach Vereinbarung')).toBeNull()
    expect(parseHoursRange(null)).toBeNull()
    expect(parseHoursRange('18:00 - 09:00')).toBeNull() // Ende vor Beginn
  })
})

describe('hoursForDay unterscheidet „zu" von „unbekannt"', () => {
  // 2026-09-15 ist ein Dienstag.
  const DI = '2026-09-15'

  it('open bei gepflegter Zeit', () => {
    expect(hoursForDay({ Di: '09:00 - 18:00' }, DI)).toEqual({
      kind: 'open', range: { start: 540, end: 1080 },
    })
  })

  it('closed nur bei ausdruecklichem „Geschlossen"', () => {
    expect(hoursForDay({ Di: 'Geschlossen' }, DI).kind).toBe('closed')
  })

  it('unknown bei fehlendem Tag, leerem Objekt und Unsinn', () => {
    expect(hoursForDay({ Mo: '09:00 - 18:00' }, DI).kind).toBe('unknown')
    expect(hoursForDay({}, DI).kind).toBe('unknown')
    expect(hoursForDay(null, DI).kind).toBe('unknown')
    expect(hoursForDay('09:00 - 18:00', DI).kind).toBe('unknown')
    expect(hoursForDay({ Di: 'nach Vereinbarung' }, DI).kind).toBe('unknown')
  })
})

describe('salonGeschlossen', () => {
  const OFFEN = { Di: '09:00 - 18:00', Fr: '09:00 - 18:00' }
  const DI = '2026-09-15'

  it('Feiertag schlaegt alles — auch ohne gepflegte Zeiten', () => {
    expect(salonGeschlossen({ date: '2026-12-25', openingHours: OFFEN })).toBe('holiday')
    expect(salonGeschlossen({ date: '2026-12-25', openingHours: null })).toBe('holiday')
  })

  it('meldet closed_day fuer einen ausdruecklich geschlossenen Tag', () => {
    expect(salonGeschlossen({ date: DI, openingHours: { Di: 'Geschlossen' } })).toBe('closed_day')
  })

  it('ohne Uhrzeit wird nur der TAG beurteilt', () => {
    expect(salonGeschlossen({ date: DI, openingHours: OFFEN })).toBeNull()
  })

  it('meldet outside_hours vor Oeffnung und nach Schluss', () => {
    expect(salonGeschlossen({ date: DI, openingHours: OFFEN, startMinute: 480, endMinute: 540 }))
      .toBe('outside_hours')
    expect(salonGeschlossen({ date: DI, openingHours: OFFEN, startMinute: 1080, endMinute: 1140 }))
      .toBe('outside_hours')
  })

  it('laesst die Randslots zu', () => {
    expect(salonGeschlossen({ date: DI, openingHours: OFFEN, startMinute: 540, endMinute: 600 }))
      .toBeNull()
    expect(salonGeschlossen({ date: DI, openingHours: OFFEN, startMinute: 1020, endMinute: 1080 }))
      .toBeNull()
  })

  it('weist bei UNBEKANNTEN Zeiten nichts ab', () => {
    expect(salonGeschlossen({ date: DI, openingHours: null, startMinute: 0, endMinute: 60 }))
      .toBeNull()
    expect(salonGeschlossen({ date: DI, openingHours: { Mo: '09:00 - 18:00' }, startMinute: 1320, endMinute: 1380 }))
      .toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────
/**
 * Das Format, das live wirklich in `salons.opening_hours` steht.
 *
 * Sonde vom 29.08.2026 gegen www.chairmatch.de, fuenf von fuenf Salons:
 *
 *     { "mo": { "open": "09:00", "close": "18:00" }, …, "so": null }
 *
 * `lib/opening-hours.ts` fuehrt `"09:00 - 18:00"` als „das EINE Format" —
 * es gibt drei, und das hier ist das verbreitete.
 */
const LIVE_FORMAT = {
  mo: { open: '09:00', close: '18:00' },
  di: { open: '09:00', close: '18:00' },
  mi: { open: '09:00', close: '18:00' },
  do: { open: '09:00', close: '20:00' },
  fr: { open: '09:00', close: '18:00' },
  sa: { open: '09:00', close: '14:00' },
  so: null,
}

describe('Live-Format {open, close} mit kleinen Kuerzeln', () => {
  it('liest den Dienstag als offen — vorher warf .match() auf einem Objekt', () => {
    // 2026-09-15 ist ein Dienstag. Genau diese Anfrage antwortete in der
    // Produktion mit HTTP 500.
    expect(hoursForDay(LIVE_FORMAT, '2026-09-15')).toEqual({
      kind: 'open', range: { start: 540, end: 1080 },
    })
  })

  it('liest den abweichenden Donnerstag (bis 20:00)', () => {
    // 2026-09-17 ist ein Donnerstag.
    expect(hoursForDay(LIVE_FORMAT, '2026-09-17')).toEqual({
      kind: 'open', range: { start: 540, end: 1200 },
    })
  })

  it('deutet `"so": null` als geschlossen, nicht als unbekannt', () => {
    // 2026-09-20 ist ein Sonntag. Der Unterschied ist entscheidend: nur
    // „closed" weist eine Buchung ab, „unknown" laesst sie durch.
    expect(hoursForDay(LIVE_FORMAT, '2026-09-20').kind).toBe('closed')
  })

  it('weist eine Buchung ausserhalb dieser Zeiten ab', () => {
    expect(salonGeschlossen({
      date: '2026-09-15', openingHours: LIVE_FORMAT, startMinute: 1200, endMinute: 1260,
    })).toBe('outside_hours')
  })

  it('laesst eine Buchung innerhalb zu', () => {
    expect(salonGeschlossen({
      date: '2026-09-15', openingHours: LIVE_FORMAT, startMinute: 600, endMinute: 660,
    })).toBeNull()
  })

  it('faellt bei unvollstaendigem Objekt auf unbekannt zurueck, nicht auf zu', () => {
    expect(hoursForDay({ di: { open: '09:00' } }, '2026-09-15').kind).toBe('unknown')
    expect(hoursForDay({ di: {} }, '2026-09-15').kind).toBe('unknown')
  })
})
