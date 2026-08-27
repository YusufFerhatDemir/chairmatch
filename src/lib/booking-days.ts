import { berlinToday } from '@/lib/berlin-time'

/**
 * Der Tagesstreifen der Buchungsstrecke.
 *
 * Ausgelagert aus /booking/[salonId], wo Beschriftung und abgeschickter Wert
 * aus ZWEI verschiedenen Quellen kamen:
 *
 *     const d = new Date(); d.setDate(d.getDate() + i)
 *     day:  dayNames[d.getDay()]            // Ortszeit des Browsers
 *     dt:   d.getDate()                     // Ortszeit des Browsers
 *     iso:  d.toISOString().split('T')[0]   // UTC
 *
 * In Deutschland ist die Ortszeit des Browsers Berlin, also UTC+1 bzw. UTC+2.
 * Zwischen 23:00 (Winter) bzw. 22:00 (Sommer) und Mitternacht liegen die
 * beiden Quellen deshalb auf verschiedenen Kalendertagen: der Knopf trug
 * "Fr 28", abgeschickt wurde `2026-08-27`. Der Kunde buchte einen anderen Tag
 * als den, auf den er getippt hat — ohne dass irgendwo etwas fehlschlug.
 *
 * Hier kommt beides aus demselben ISO-Tag, und der erste Tag ist
 * `berlinToday()` — derselbe "heute"-Begriff, den `/api/availability` fuer
 * die Vergangenheitspruefung benutzt.
 */

export interface BookingDay {
  /** Wochentagskuerzel, z.B. "Fr". */
  day: string
  /** Tag im Monat. */
  dt: number
  /** Monat, 1-basiert. */
  mo: number
  /** Beschriftung, z.B. "Fr 28.8". */
  full: string
  /** Der Wert, der wirklich gebucht wird: "YYYY-MM-DD". */
  iso: string
}

const WOCHENTAGE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

/** Kalendertag-Arithmetik auf "YYYY-MM-DD", ohne jede Zeitzone. */
export function tagePlus(isoTag: string, tage: number): string {
  const [y, m, d] = isoTag.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d) + tage * 86_400_000).toISOString().slice(0, 10)
}

/**
 * Wochentag eines "YYYY-MM-DD".
 *
 * Gelesen wird der Tag um 12:00 UTC: mit `Date.UTC(y, m-1, d)` (Mitternacht)
 * und `getUTCDay()` waere es zwar auch richtig, aber jede spaetere Umstellung
 * auf `getDay()` haette in Zeitzonen westlich von UTC still den Vortag
 * geliefert. Mittags ist der Wochentag in jeder Zeitzone derselbe.
 */
export function wochentag(isoTag: string): string {
  const [y, m, d] = isoTag.split('-').map(Number)
  return WOCHENTAGE[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()]
}

/**
 * `anzahl` Tage ab heute (Berlin). Beschriftung und `iso` gehoeren zum
 * gleichen Kalendertag — das ist der ganze Punkt dieser Funktion.
 */
export function naechsteTage(anzahl: number, heute: string = berlinToday()): BookingDay[] {
  return Array.from({ length: anzahl }, (_, i) => {
    const iso = tagePlus(heute, i)
    const [, mo, dt] = iso.split('-').map(Number)
    const tag = wochentag(iso)
    return { day: tag, dt, mo, full: `${tag} ${dt}.${mo}`, iso }
  })
}
