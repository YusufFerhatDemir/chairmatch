import { isPublicHoliday, type Bundesland } from '@/lib/holidays'

/**
 * „Hat der Salon an diesem Tag zu dieser Zeit ueberhaupt offen?"
 *
 * Diese Frage wurde bis Track 25 an KEINER Stelle serverseitig beantwortet.
 * Es gab zwei getrennte Halbfassungen und eine Luecke dazwischen:
 *
 *  1. `/api/availability` liest `opening_hours` und erzeugt daraus das
 *     Slot-Raster — aber ohne jede Feiertagspruefung. Am 25. Dezember, einem
 *     Freitag, bot die Route das volle Freitagsraster an.
 *  2. `lib/scheduling.ts` enthielt seit jeher eine korrekte Feiertagspruefung
 *     (`isPublicHoliday(date, salon.state)`) — und wurde von NIEMANDEM
 *     aufgerufen. Der einzige Export `getAvailableSlots` hatte im gesamten
 *     Repository keinen Aufrufer und keinen Test, waehrend Kommentare in
 *     `booking.actions.ts`, `/api/me/salon` und `opening-hours.ts` ihn als
 *     lebenden Leser der Oeffnungszeiten fuehrten. Genau daran hat sich
 *     Track 21 verlesen. Das Modul ist mit Track 25 entfernt; was davon
 *     wirklich gebraucht wurde, steht hier.
 *  3. `createBooking` prueft `startsInPast`, den Mitarbeiter, die Leistung,
 *     die Belegung und die Salon-Sperre — aber weder Oeffnungszeiten noch
 *     Feiertage. Die Slot-Route ist damit reine ANZEIGE: ein direkter POST
 *     auf `/api/bookings` legte einen Termin um 03:00 Uhr an Heiligabend an,
 *     und der Salon bekam die Bestaetigungsmail dazu.
 *
 * Deshalb steht die Frage jetzt einmal hier, und beide Seiten fragen sie.
 *
 * ZWEI ENTSCHEIDUNGEN, die nicht offensichtlich sind:
 *
 *  - „Keine Angabe" ist nicht „geschlossen". `parseHours` lieferte fuer
 *    `"Geschlossen"` und fuer eine fehlende/unlesbare Angabe dasselbe
 *    `null`. Fuer die Anzeige ist das egal (beides ergibt kein Raster), fuer
 *    eine ABWEISUNG waere es das nicht: ein Salon ohne gepflegte Zeiten
 *    haette ab sofort keine Buchung mehr annehmen koennen. `hoursForDay`
 *    unterscheidet deshalb `geschlossen` von `unbekannt`, und abgewiesen
 *    wird nur, was positiv als geschlossen bekannt ist.
 *  - Ohne `salons.state` gelten die neun BUNDESWEITEN Feiertage. Die Spalte
 *    wird im gesamten Code an keiner Stelle geschrieben, steht also fuer die
 *    meisten Salons auf NULL. Der Rueckfall erfindet nichts: Neujahr,
 *    Karfreitag, Ostermontag, 1. Mai, Christi Himmelfahrt, Pfingstmontag,
 *    3. Oktober und beide Weihnachtstage gelten in allen 16 Laendern.
 */

/** Index 0 = Sonntag, wie `Date.getDay()`. */
const DAY_KEYS_BY_DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

const BUNDESLAND_CODES: readonly string[] = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV',
  'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
]

/** Ausgeschriebene Namen, falls die Spalte so gepflegt wird. */
const BUNDESLAND_NAMEN: Record<string, Bundesland> = {
  'baden-wuerttemberg': 'BW',
  'baden-württemberg': 'BW',
  'bayern': 'BY',
  'berlin': 'BE',
  'brandenburg': 'BB',
  'bremen': 'HB',
  'hamburg': 'HH',
  'hessen': 'HE',
  'mecklenburg-vorpommern': 'MV',
  'niedersachsen': 'NI',
  'nordrhein-westfalen': 'NW',
  'rheinland-pfalz': 'RP',
  'saarland': 'SL',
  'sachsen': 'SN',
  'sachsen-anhalt': 'ST',
  'schleswig-holstein': 'SH',
  'thueringen': 'TH',
  'thüringen': 'TH',
}

/**
 * `salons.state` auf ein Kuerzel ziehen. Was sich nicht zuordnen laesst,
 * ergibt `undefined` — und damit die bundesweite Liste, nie eine geratene.
 */
export function normalizeBundesland(value: unknown): Bundesland | undefined {
  if (typeof value !== 'string') return undefined
  const roh = value.trim()
  if (!roh) return undefined
  const gross = roh.toUpperCase()
  if (BUNDESLAND_CODES.includes(gross)) return gross as Bundesland
  return BUNDESLAND_NAMEN[roh.toLowerCase()]
}

export interface HoursRange {
  /** Minuten seit Mitternacht. */
  start: number
  end: number
}

export type DayHours =
  | { kind: 'open'; range: HoursRange }
  /** Ausdruecklich „Geschlossen" fuer diesen Wochentag. */
  | { kind: 'closed' }
  /** Keine oder keine lesbare Angabe — daraus folgt KEINE Abweisung. */
  | { kind: 'unknown' }

/** Wochentag (0 = So) fuer `YYYY-MM-DD`, zeitzonenfest ueber 12:00 Uhr. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00`).getDay()
}

/** `"09:00 - 18:00"` → Minuten. `"Geschlossen"`/Unlesbares → null. */
export function parseHoursRange(hours: string | null | undefined): HoursRange | null {
  if (!hours) return null
  const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/)
  if (!m) return null
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null
  return { start, end }
}

/** Die Zeiten des Wochentags, auf den `date` faellt. */
export function hoursForDay(openingHours: unknown, date: string): DayHours {
  if (!openingHours || typeof openingHours !== 'object' || Array.isArray(openingHours)) {
    return { kind: 'unknown' }
  }
  const oh = openingHours as Record<string, unknown>
  const key = DAY_KEYS_BY_DOW[dayOfWeek(date)]
  const roh = oh[key] ?? oh[key.toLowerCase()]
  if (typeof roh !== 'string' || !roh.trim()) return { kind: 'unknown' }

  if (roh.toLowerCase().includes('geschlossen')) return { kind: 'closed' }

  const range = parseHoursRange(roh)
  return range ? { kind: 'open', range } : { kind: 'unknown' }
}

export type ClosedReason = 'holiday' | 'closed_day' | 'outside_hours'

export const CLOSED_MESSAGES: Record<ClosedReason, string> = {
  holiday: 'An gesetzlichen Feiertagen werden keine Termine vergeben.',
  closed_day: 'Der Salon hat an diesem Tag geschlossen.',
  outside_hours: 'Dieser Zeitpunkt liegt ausserhalb der Öffnungszeiten des Salons.',
}

/**
 * Ist `date` ein gesetzlicher Feiertag am Ort des Salons?
 *
 * Ohne verwertbares `state` zaehlen nur die bundesweiten Feiertage.
 */
export function istFeiertag(date: string, state?: unknown): boolean {
  return isPublicHoliday(date, normalizeBundesland(state))
}

/**
 * Der eine Riegel, den Anzeige UND Buchung benutzen.
 *
 * `startMinute`/`endMinute` sind optional: die Slot-Route fragt nur nach dem
 * TAG (sie erzeugt das Raster danach selbst), `createBooking` fragt zusaetzlich
 * nach der Uhrzeit.
 *
 * Gibt `null` zurueck, wenn nichts dagegen spricht — ausdruecklich auch dann,
 * wenn die Zeiten schlicht nicht gepflegt sind.
 */
export function salonGeschlossen(args: {
  date: string
  openingHours: unknown
  state?: unknown
  startMinute?: number
  endMinute?: number
}): ClosedReason | null {
  const { date, openingHours, state, startMinute, endMinute } = args

  if (istFeiertag(date, state)) return 'holiday'

  const tag = hoursForDay(openingHours, date)
  if (tag.kind === 'closed') return 'closed_day'
  if (tag.kind === 'unknown') return null

  if (startMinute === undefined || endMinute === undefined) return null
  if (startMinute < tag.range.start || endMinute > tag.range.end) return 'outside_hours'

  return null
}
