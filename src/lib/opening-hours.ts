import { z } from 'zod'

/**
 * Das EINE Format von `salons.opening_hours`.
 *
 * Gelesen wird die Spalte an drei Stellen: `/api/availability` (das
 * Slot-Raster), `lib/scheduling.ts` und der Schema.org-Export der
 * Salon-Seite. Alle drei erwarten deutsche Tageskuerzel — `{ "Mo":
 * "09:00 - 18:00" }`, wahlweise `"Geschlossen"`.
 *
 * Geschrieben wurde sie bis Track 14 an ZWEI Stellen in ZWEI Formaten:
 *
 *   - /anbieter/mein-salon/zeiten schreibt ueber `/api/me/salon` das
 *     etablierte Kuerzel-Format.
 *   - Das Anbieter-Dashboard schrieb ueber `/api/provider/salon` die
 *     ausgeschriebenen Tagesnamen (`"Montag"`), und diese Route hatte gar
 *     kein Schema: `if (key in body) updates[key] = body[key]`.
 *
 * Kein Leser kennt `"Montag"`. Wer seine Zeiten im Dashboard pflegte, sah
 * sie gespeichert, aber `/api/availability` fand fuer jeden Tag nichts und
 * gab `{ slots: [] }` zurueck — der Salon war nicht buchbar. Schlimmer:
 * das Speichern im Dashboard UEBERSCHRIEB ein zuvor korrekt gepflegtes
 * Objekt. Deshalb steht das Format jetzt einmal hier, und beide Routen
 * validieren dagegen.
 */

export const DAY_KEYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export type DayKey = (typeof DAY_KEYS)[number]

/** `"09:00 - 18:00"` (auch mit Gedankenstrich) oder `"Geschlossen"`. */
export const HOURS_RE = /^(?:Geschlossen|\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})$/

/**
 * `partialRecord` statt `record`: seit Zod 4 verlangt `z.record(z.enum(...))`
 * ALLE Schluessel des Enums. Ein Formular, das nur die gepflegten Tage
 * schickt, waere damit ungueltig — und genau das schickt das
 * Anbieter-Dashboard, seit leere Felder herausgefiltert werden.
 */
export const openingHoursSchema = z.partialRecord(
  z.enum(DAY_KEYS),
  z.string().regex(HOURS_RE, 'Format: "09:00 - 18:00" oder "Geschlossen"'),
)

/** Die ausgeschriebenen Tagesnamen des alten Dashboard-Formulars. */
const LANGFORM: Record<string, DayKey> = {
  Montag: 'Mo',
  Dienstag: 'Di',
  Mittwoch: 'Mi',
  Donnerstag: 'Do',
  Freitag: 'Fr',
  Samstag: 'Sa',
  Sonntag: 'So',
}

/**
 * Bestandsdaten im Langformat auf Kuerzel ziehen.
 *
 * Die Zeilen, die das alte Dashboard geschrieben hat, stehen in der
 * Datenbank und sind fuer die Buchungslogik unsichtbar. Beim naechsten
 * Lesen im Formular werden sie damit wieder sichtbar, ohne dass jemand sie
 * neu eintippen muss. Was weder Kuerzel noch bekannter Langname ist, faellt
 * weg — erfunden wird hier nichts.
 */
export function normalizeOpeningHours(
  value: unknown,
): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'string') continue
    const kurz = (DAY_KEYS as readonly string[]).includes(key)
      ? (key as DayKey)
      : (LANGFORM[key] ?? null)
    if (!kurz) continue
    if (!HOURS_RE.test(raw.trim())) continue
    // Ein bereits vorhandenes Kuerzel gewinnt gegen die Langform.
    if (out[kurz] === undefined || (DAY_KEYS as readonly string[]).includes(key)) {
      out[kurz] = raw.trim()
    }
  }
  return Object.keys(out).length > 0 ? out : null
}
