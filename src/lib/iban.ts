/**
 * IBAN-Helfer für die Auszahlungsdaten.
 *
 * Bewusst ohne externe Abhängigkeit: geprüft wird Format (ISO 13616) und
 * die Prüfsumme nach mod-97-10. Das fängt Tippfehler ab — es ersetzt keine
 * Kontoverifikation, die passiert weiterhin bei Stripe.
 */

/** Erlaubte Längen je Ländercode (SEPA-Raum, der Rest wird generisch geprüft). */
const SEPA_LENGTHS: Record<string, number> = {
  AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18,
  EE: 20, ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28,
  IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27,
  MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19,
  SK: 24, SM: 27,
}

/** Leerzeichen/Bindestriche raus, Großbuchstaben. */
export function normalizeIban(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase()
}

/** mod-97-10 nach ISO 7064, stückweise gerechnet (IBANs sprengen Number). */
function mod97(digits: string): number {
  let remainder = 0
  for (const ch of digits) {
    remainder = (remainder * 10 + Number(ch)) % 97
  }
  return remainder
}

export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false

  const expectedLength = SEPA_LENGTHS[iban.slice(0, 2)]
  if (expectedLength !== undefined && iban.length !== expectedLength) return false

  // Die ersten vier Zeichen ans Ende, Buchstaben zu Zahlen (A=10 … Z=35).
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged.replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
  return mod97(numeric) === 1
}

/** Nur die letzten vier Stellen — alles, was das Frontend je zu sehen bekommt. */
export function ibanLast4(input: string): string {
  return normalizeIban(input).slice(-4)
}

/** Anzeigeform für die UI, z.B. „•••• •••• 3000". */
export function maskIban(last4: string): string {
  return `•••• •••• ${last4}`
}
