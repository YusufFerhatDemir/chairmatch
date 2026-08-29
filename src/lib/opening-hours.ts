import { z } from 'zod'

/**
 * Das EINE Format von `salons.opening_hours`.
 *
 * Gelesen wird die Spalte an drei Stellen: `/api/availability` (das
 * Slot-Raster), `lib/salon-open.ts` und der Schema.org-Export der
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

/** Kleingeschriebene Kuerzel, wie sie live in der Spalte stehen. */
const KLEINFORM: Record<string, DayKey> = Object.fromEntries(
  DAY_KEYS.map(d => [d.toLowerCase(), d]),
) as Record<string, DayKey>

/**
 * Eine Tagesangabe auf die Textform bringen — String ODER `{open, close}`.
 *
 * NACHTRAG TRACK 25: Der Kopfkommentar oben nennt `"09:00 - 18:00"` „das EINE
 * Format". Die Produktionssonde vom 29.08.2026 widerspricht: die Salons
 * tragen ein OBJEKT je Tag,
 *
 *     { "mo": { "open": "09:00", "close": "18:00" }, …, "so": null }
 *
 * — fuenf von fuenf gepruefte Salons. Es gibt also nicht zwei Formate,
 * sondern drei, und das dritte ist das verbreitete.
 *
 * Fuer diese Funktion hiess das: sie liess mit `typeof raw !== 'string'`
 * JEDEN dieser Tage fallen und gab `null` zurueck. Das Zeiten-Formular des
 * Anbieters (ProviderDashboardClient) zeigte deshalb LEERE Felder, obwohl
 * Zeiten gespeichert waren — und wer dort speicherte, ueberschrieb seine
 * echten Zeiten mit dem, was er gerade in ein leeres Formular getippt hatte.
 */
function tagAlsText(raw: unknown): string | null {
  if (raw === null) return 'Geschlossen'
  if (typeof raw === 'string') {
    const t = raw.trim()
    return HOURS_RE.test(t) ? t : null
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const o = raw as { open?: unknown; close?: unknown }
    if (typeof o.open === 'string' && typeof o.close === 'string') {
      const t = `${o.open.trim()} - ${o.close.trim()}`
      return HOURS_RE.test(t) ? t : null
    }
  }
  return null
}

/**
 * Bestandsdaten auf Kuerzel und Textform ziehen.
 *
 * Die Zeilen, die das alte Dashboard geschrieben hat, stehen in der
 * Datenbank und sind fuer die Buchungslogik unsichtbar. Beim naechsten
 * Lesen im Formular werden sie damit wieder sichtbar, ohne dass jemand sie
 * neu eintippen muss. Was weder Kuerzel noch bekannter Langname ist, faellt
 * weg — erfunden wird hier nichts.
 *
 * Erkannt werden drei Schreibweisen der Schluessel (`Mo`, `mo`, `Montag`)
 * und zwei der Werte (Text und `{open, close}`, dazu `null` = geschlossen).
 */
export function normalizeOpeningHours(
  value: unknown,
): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const out: Record<string, string> = {}
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const kurz = (DAY_KEYS as readonly string[]).includes(key)
      ? (key as DayKey)
      : (KLEINFORM[key] ?? LANGFORM[key] ?? null)
    if (!kurz) continue

    const text = tagAlsText(raw)
    if (text === null) continue

    // Ein bereits vorhandenes Kuerzel gewinnt gegen die anderen Schreibweisen.
    if (out[kurz] === undefined || (DAY_KEYS as readonly string[]).includes(key)) {
      out[kurz] = text
    }
  }
  return Object.keys(out).length > 0 ? out : null
}
