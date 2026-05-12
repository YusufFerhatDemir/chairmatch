/**
 * Statisch importierte Nachrichten-Bundles für alle unterstützten Locales.
 *
 * Statische Imports vermeiden das Lesen von JSON zur Laufzeit auf dem Server
 * und ermöglichen Code-Splitting auf dem Client (next.js inkludiert das Bundle
 * direkt im Modul-Graphen).
 */
import type { Locale } from './config'
import de from '../../messages/de.json'
import en from '../../messages/en.json'
import tr from '../../messages/tr.json'
import ar from '../../messages/ar.json'

export type Messages = typeof de

const ALL: Record<Locale, Messages> = {
  de: de as Messages,
  en: en as Messages,
  tr: tr as Messages,
  ar: ar as Messages,
}

export function getMessages(locale: Locale): Messages {
  return ALL[locale] ?? ALL.de
}

/**
 * Auflösen eines verschachtelten Keys wie "home.bookNow" gegen ein
 * Nachrichten-Bundle. Gibt `undefined` zurück, wenn der Pfad nicht existiert.
 */
export function resolvePath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object' && part in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[part]
    }
    return undefined
  }, obj)
}

/**
 * Ersetzt {placeholder}-Token in einer Translation-String. Beispiel:
 *   format("Hallo {name}", { name: "Yusuf" }) -> "Hallo Yusuf"
 */
export function format(template: string, values?: Record<string, string | number>): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = values[key]
    return v === undefined || v === null ? `{${key}}` : String(v)
  })
}
