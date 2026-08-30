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
 *  - Ohne verwertbares `salons.state` gelten die neun BUNDESWEITEN Feiertage.
 *    Der Rueckfall erfindet nichts: Neujahr, Karfreitag, Ostermontag, 1. Mai,
 *    Christi Himmelfahrt, Pfingstmontag, 3. Oktober und beide Weihnachtstage
 *    gelten in allen 16 Laendern.
 *
 *    ACHTUNG, KORREKTUR ZU TRACK 25: dort steht, die Spalte werde „im
 *    gesamten Code an keiner Stelle geschrieben" und stehe deshalb meist auf
 *    NULL. Fuer die Live-Daten stimmt das nicht — alle 15 oeffentlichen
 *    Salons tragen am 30.08.2026 einen Wert. Der Rueckfall war also kein
 *    Ruhepolster, sondern hat eine falsche Schreibweise verdeckt; was daran
 *    hing, steht bei `BUNDESLAND_NAMEN`.
 */

/** Index 0 = Sonntag, wie `Date.getDay()`. */
const DAY_KEYS_BY_DOW = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

const BUNDESLAND_CODES: readonly string[] = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV',
  'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
]

/**
 * Auf Buchstaben reduzieren: Umlaute ausgeschrieben, Bindestriche, Leerzeichen
 * und Punkte weg. `"Baden-Württemberg"`, `"Baden Wuerttemberg"` und
 * `"baden-wuerttemberg"` ergeben damit denselben Schluessel.
 */
function schluessel(roh: string): string {
  return roh
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '')
}

/**
 * Wortformen, die live in `salons.state` stehen koennen — ausgeschriebene
 * Namen, gaengige Kuerzel und die Beiworte, die Bundeslaender im Amtsdeutsch
 * tragen ("Freistaat Bayern", "Freie und Hansestadt Hamburg").
 *
 * WARUM DAS MEHR ALS DIE 16 NAMEN SEIN MUSS — nachgemessen am 30.08.2026
 * gegen www.chairmatch.de: die Spalte IST gepflegt (alle 15 oeffentlichen
 * Salons tragen einen Wert; der Kommentar „wird nirgends geschrieben" aus
 * Track 25 stimmt fuer die Live-Daten nicht), aber drei Salons tragen dort
 * `"NRW"`. Das ist kein Laendercode — der lautet `NW` —, also fiel
 * `normalizeBundesland` auf `undefined` zurueck und damit auf die neun
 * bundesweiten Feiertage.
 *
 * Gemessene Folge, `/api/availability`, Salon „Maison Haarwerk" (NRW):
 *
 *     2027-11-01 (Allerheiligen, Montag) → 33 Slots
 *     2027-05-27 (Fronleichnam, Donnerstag) → 41 Slots
 *
 * Zum Vergleich am selben Tag: „Glow Studio" (`state = "Bayern"`) antwortete
 * am 01.11. mit `unavailable: "holiday"`, „BlackLabel Barbershop"
 * (`"Hessen"`) am 27.05. ebenso. Die Kette funktioniert also — sie ist nur an
 * einer Schreibweise vorbeigelaufen. Der Salon nahm an beiden Feiertagen
 * Termine an, und `createBooking` haette sie ueber denselben Riegel
 * angenommen.
 */
const BUNDESLAND_NAMEN: Record<string, Bundesland> = {
  badenwuerttemberg: 'BW',
  bawue: 'BW',
  bayern: 'BY',
  freistaatbayern: 'BY',
  berlin: 'BE',
  brandenburg: 'BB',
  bremen: 'HB',
  freiehansestadtbremen: 'HB',
  hansestadtbremen: 'HB',
  hamburg: 'HH',
  freieundhansestadthamburg: 'HH',
  hansestadthamburg: 'HH',
  hessen: 'HE',
  mecklenburgvorpommern: 'MV',
  meckpomm: 'MV',
  niedersachsen: 'NI',
  nds: 'NI',
  nordrheinwestfalen: 'NW',
  nrw: 'NW',
  rheinlandpfalz: 'RP',
  rlp: 'RP',
  saarland: 'SL',
  sachsen: 'SN',
  freistaatsachsen: 'SN',
  sachsenanhalt: 'ST',
  schleswigholstein: 'SH',
  thueringen: 'TH',
  freistaatthueringen: 'TH',
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
  return BUNDESLAND_NAMEN[schluessel(roh)]
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

/**
 * Eine Tagesangabe deuten — in BEIDEN Formaten, die live vorkommen.
 *
 * `lib/opening-hours.ts` fuehrt `"09:00 - 18:00"` als „das EINE Format".
 * Die Produktionssonde vom 29.08.2026 sagt etwas anderes: die Salons tragen
 *
 *     { "mo": { "open": "09:00", "close": "18:00" }, …, "so": null }
 *
 * — kleingeschriebene Kuerzel und ein OBJEKT je Tag, `null` fuer geschlossen.
 * Fuenf von fuenf gepruefte Salons sahen so aus. Was daran haengt, steht im
 * Kopfkommentar von `hoursForDay`.
 */
function deuteTag(roh: unknown): DayHours {
  // `"so": null` heisst ausdruecklich: an diesem Tag geschlossen.
  if (roh === null) return { kind: 'closed' }

  if (typeof roh === 'string') {
    if (!roh.trim()) return { kind: 'unknown' }
    if (roh.toLowerCase().includes('geschlossen')) return { kind: 'closed' }
    const range = parseHoursRange(roh)
    return range ? { kind: 'open', range } : { kind: 'unknown' }
  }

  if (typeof roh === 'object' && !Array.isArray(roh)) {
    const o = roh as { open?: unknown; close?: unknown }
    if (typeof o.open === 'string' && typeof o.close === 'string') {
      const range = parseHoursRange(`${o.open} - ${o.close}`)
      return range ? { kind: 'open', range } : { kind: 'unknown' }
    }
    return { kind: 'unknown' }
  }

  return { kind: 'unknown' }
}

/**
 * Die Zeiten des Wochentags, auf den `date` faellt.
 *
 * WARUM DAS BEIDE FORMATE KENNEN MUSS — der teuerste Befund aus Track 25,
 * und gefunden wurde er erst gegen die laufende Produktion:
 *
 * `/api/availability` hatte eine eigene `parseHours(hours: string | null)`,
 * die mit `hours.match(…)` beginnt. Steht in der Spalte ein OBJEKT, ist es
 * nicht `null`, also faellt der Wachposten `if (!hours)` nicht — und
 * `.match` gibt es auf einem Objekt nicht. Die Route hat kein try/catch um
 * den GET-Rumpf; der TypeError kam als HTTP 500 heraus.
 *
 * Nachgemessen am 29.08.2026 gegen www.chairmatch.de, Salon
 * „NailLab by Lena", ein gewoehnlicher Dienstag:
 *
 *     GET /api/availability?salonId=…&serviceId=…&date=2026-09-15  →  500
 *
 * Das ist kein Randfall: es ist JEDER Tag, an dem der Salon Zeiten gepflegt
 * hat, fuer JEDEN Salon in diesem Format — und damit der komplette
 * Buchungskalender. Die Suche zeigte die Salons, die Salonseite zeigte die
 * Leistungen, und der Kalender darunter lief in einen Serverfehler.
 *
 * Aufgefallen ist es nur, weil die Feiertagspruefung VOR `parseHours` steht
 * und am 25.12. frueh zurueckkehrt: derselbe Salon antwortete am Feiertag
 * sauber mit 200 und am Werktag mit 500. Der Unterschied war der Hinweis.
 */
export function hoursForDay(openingHours: unknown, date: string): DayHours {
  if (!openingHours || typeof openingHours !== 'object' || Array.isArray(openingHours)) {
    return { kind: 'unknown' }
  }
  const oh = openingHours as Record<string, unknown>
  const key = DAY_KEYS_BY_DOW[dayOfWeek(date)]

  // `??` wuerde bei einem ausdruecklichen `null` auf den naechsten Schluessel
  // ausweichen — und genau dieses `null` ist die Aussage „geschlossen".
  const roh = key in oh ? oh[key] : oh[key.toLowerCase()]
  if (roh === undefined) return { kind: 'unknown' }

  return deuteTag(roh)
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
