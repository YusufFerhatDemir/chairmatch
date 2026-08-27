/**
 * Reine Umformungen aus der Anbieter-Registrierung.
 *
 * Eigenes Modul, weil eine Next.js-Route-Datei nur die HTTP-Methoden und ein
 * paar Konfigurationswerte exportieren darf — jeder weitere Export bricht den
 * Typecheck. Ohne dieses Modul waeren beide Funktionen nicht direkt testbar.
 */

/**
 * Tagespreis aus dem Formularfeld (Freitext, Euro).
 *
 * `null`, wenn nichts Verwertbares dasteht — ein erfundener Standardpreis
 * waere schlimmer als eine leere Spalte. Der Deckel bei 10.000 € faengt den
 * vertippten Cent-Betrag ("35000" statt "350") ab, bevor er auf einer
 * oeffentlichen Salonseite landet. `salons.chair_price_day` ist live `numeric`
 * und traegt Euro, nicht Cent (Migration 20260307_ensure_tables).
 */
export function parseDayPrice(raw: string | undefined | null): number | null {
  if (!raw) return null
  const normalized = raw.replace(',', '.').trim()
  if (!normalized) return null
  const value = Number(normalized)
  if (!Number.isFinite(value) || value <= 0 || value > 10_000) return null
  return Math.round(value * 100) / 100
}

/** Geschaeftsname → URL-Fragment (deutsche Umlaute ausgeschrieben). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
