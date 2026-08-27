// @vitest-environment node
/**
 * Waechter gegen Zusagen, die kein Server einloest.
 *
 * Track 9 hat `PROMO_CODES` aus `src/lib/constants.ts` entfernt: CHAIR2026
 * (15 %), WELCOME10 (10 %) und BEAUTY5 (5 €) waren eine reine
 * Browser-Konstante. Der Server kennt diese Liste nicht — er prueft die
 * Tabelle `promo_codes` und belegt dort ein Kontingent (`claimPromoCode` in
 * src/modules/booking/booking.actions.ts). Die Buchungsseite rechnete
 * trotzdem einen Rabatt vor; bezahlt wurde der volle Preis.
 *
 * Die Konstante war weg — das Versprechen nicht. Die Willkommens-E-Mail
 * schickte bis Track 11 an JEDEN neu registrierten Nutzer:
 *
 *     Nutze den Code WELCOME10 für 10% auf deine erste Buchung!
 *
 * Eine E-Mail ist die haltbarste Form dieser Zusage: sie liegt im Postfach,
 * wenn der Code beim Buchen abgewiesen wird. Deshalb steht der Waechter hier
 * und nicht nur an der Buchungsseite.
 *
 * Gefunden wird ein Code-artiges Wort (GROSSBUCHSTABEN + Ziffern) in einer
 * Datei, die E-Mails oder Seiten baut. Wer einen Rabatt bewerben will, legt
 * ihn in `promo_codes` an und laedt ihn — dann steht er nicht im Quelltext.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC = join(process.cwd(), 'src')

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(p, out)
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(p)
    }
  }
  return out
}

/** Kommentare duerfen den Befund beschreiben, ohne ihn auszuloesen. */
function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const ALLE = walk(SRC)

/**
 * Die drei Codes, die es nachweislich nur im Quelltext gab.
 *
 * Bewusst eine feste Liste statt eines Musters: ein Muster wuerde
 * `CHECKOUT_SESSION_ID`, `WELCOME_MAIL` und jede zweite Konstante treffen.
 */
const ERFUNDENE_CODES = ['WELCOME10', 'CHAIR2026', 'BEAUTY5']

describe('Keine erfundenen Rabattcodes im Quelltext', () => {
  it.each(ERFUNDENE_CODES)('%s wird nirgends beworben', (code) => {
    const treffer = ALLE.filter((p) => ohneKommentare(readFileSync(p, 'utf8')).includes(code))
      .map((p) => relative(process.cwd(), p))

    expect(treffer).toEqual([])
  })

  it('die E-Mail-Vorlagen versprechen ueberhaupt keinen Code', () => {
    // Breiter als die Liste oben: jedes Wort aus Grossbuchstaben mit
    // angehaengter Zahl sieht in einer Kundenmail nach einem Gutscheincode
    // aus. Trifft das an, gehoert es entweder in `promo_codes` oder weg.
    const email = readFileSync(join(SRC, 'lib', 'email.ts'), 'utf8')
    const codeAehnlich = ohneKommentare(email).match(/\b[A-Z]{4,}\d{1,3}\b/g) ?? []

    expect(codeAehnlich).toEqual([])
  })

  it('die Anbieter-Begruessung verspricht keine Kundenrabatte', () => {
    const email = readFileSync(join(SRC, 'lib', 'email.ts'), 'utf8')
    const start = email.indexOf('export async function sendProviderWelcomeEmail')
    expect(start).toBeGreaterThan(-1)
    const block = email.slice(start, start + 2500)

    expect(block).not.toMatch(/Rabatt|Gutschein|% auf/i)
  })
})
