// @vitest-environment node
/**
 * Waechter gegen drei Muster, die Track 12 einzeln entfernt hat und die
 * einzeln wieder hereinkommen koennen, weil sie jedes fuer sich harmlos
 * aussehen.
 *
 *  1. Ein Mail-Endpunkt, der Inhalt UND Empfaenger aus dem Request nimmt und
 *     dabei eine Rolle zulaesst, die sich jeder selbst anlegen kann.
 *  2. `req.headers.get('origin')` als Quelle einer Rueckkehr-URL.
 *  3. Eine IP-Adresse, die unverarbeitet in ein Einwilligungs-Protokoll
 *     geschrieben wird.
 *
 * Alle drei sind statisch zu erkennen, und alle drei waeren in einem
 * Verhaltenstest nur an genau der Stelle gefangen, an der sie schon einmal
 * standen — nicht an der naechsten.
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

const ALLE = walk(SRC).map((pfad) => ({
  pfad: relative(process.cwd(), pfad),
  code: ohneKommentare(readFileSync(pfad, 'utf8')),
}))

// ── 1. Mail-Versand ─────────────────────────────────────────────────────────

describe('POST /api/email bleibt kein offener Versandweg', () => {
  const route = readFileSync(join(SRC, 'app/api/email/route.ts'), 'utf8')
  const code = ohneKommentare(route)

  it('laesst nur Admin-Rollen zu', () => {
    // Bis Track 12 stand `anbieter` bei `booking_confirmation`. Diese Rolle
    // ist ueber die oeffentliche Route /api/register-provider selbst zu
    // beschaffen — der Endpunkt liess Empfaenger und Inhalt frei waehlen und
    // verschickte das Ergebnis von noreply@chairmatch.de, DKIM-signiert.
    const block = code.slice(code.indexOf('const ALLOWED_ROLES'))
    const rollenBlock = block.slice(0, block.indexOf('}') + 1)

    for (const rolle of ['anbieter', 'kunde', 'b2b', 'investor']) {
      expect(rollenBlock).not.toContain(`'${rolle}'`)
    }
    expect(rollenBlock).toContain("'admin'")
    expect(rollenBlock).toContain("'super_admin'")
  })

  it('hat ein eigenes Rate-Limit', () => {
    // Jeder Aufruf kostet einen echten Versand und belastet die
    // Zustellreputation der Absenderdomain.
    expect(code).toContain('checkRateLimit')
  })
})

// ── 2. Rueckkehr-URLs ───────────────────────────────────────────────────────

describe('Rueckkehr-URLs kommen nicht aus dem Request', () => {
  it('liest keine Route den Origin-Header direkt aus', () => {
    const treffer = ALLE.filter(
      ({ pfad, code }) =>
        pfad !== 'src/lib/app-origin.ts' && /headers\.get\(\s*['"]origin['"]\s*\)/.test(code),
    ).map(({ pfad }) => pfad)

    expect(treffer).toEqual([])
  })

  it('baut keine Stripe-URL aus einem ungeprueften Ursprung', () => {
    // Der Kern des Befunds: `success_url`, `cancel_url`, `return_url` und
    // `refresh_url` bestimmen, wo der Zahlende NACH der Zahlung landet. Ein
    // Angreifer bekam damit eine echte, von uns erzeugte Stripe-Session, die
    // auf seine Domain weiterleitet.
    const stripeDateien = ALLE.filter(
      ({ code }) =>
        code.includes('successUrl') || code.includes('return_url') || code.includes('refreshUrl'),
    )
    expect(stripeDateien.length).toBeGreaterThan(0)

    for (const { pfad, code } of stripeDateien) {
      if (code.includes('origin')) {
        expect(code, `${pfad} baut eine Rueckkehr-URL ohne Allowlist`).toContain('app-origin')
      }
    }
  })
})

// ── 3. Einwilligungs-Protokoll ──────────────────────────────────────────────

describe('Einwilligungs-Protokoll speichert keine lesbare IP', () => {
  it('kodiert keine IP mit base64 statt sie zu hashen', () => {
    // `Buffer.from(ip).toString('base64')` stand bis Track 12 in
    // /api/auth/register — unter dem Spaltennamen `ip_hash`.
    const treffer = ALLE.filter(({ code }) =>
      /Buffer\.from\(\s*ip\w*\s*\)\s*\.toString\(\s*['"]base64/.test(code),
    ).map(({ pfad }) => pfad)

    expect(treffer).toEqual([])
  })

  it('schreibt ip_hash nur ueber den gemeinsamen Hash-Helfer', () => {
    // `database.types.ts` DEKLARIERT die Spalte nur — dort steht kein Wert,
    // der gehasht werden koennte.
    const schreiber = ALLE.filter(
      ({ pfad, code }) => pfad !== 'src/lib/database.types.ts' && /ip_hash\s*:/.test(code),
    )
    expect(schreiber.length).toBeGreaterThan(0)

    for (const { pfad, code } of schreiber) {
      expect(code, `${pfad} setzt ip_hash ohne @/lib/ip-hash`).toContain('ip-hash')
    }
  })
})

// ── 4. Buchungs-Mails verlinken eine Seite, die es gibt ─────────────────────

describe('Buchungs-Mails verlinken keine Buchungs-ID als Salon-ID', () => {
  it('baut keine URL /booking/<bookingId>', () => {
    // Die Route unter /booking/[salonId] ist das BUCHUNGSFORMULAR eines
    // Salons. Mit einer Buchungs-ID darin fuehrte „Buchung ansehen" in ein
    // Formular fuer einen Salon, den es nicht gibt. Die eigenen Termine
    // stehen unter /termine.
    const treffer = ALLE.filter(({ code }) =>
      /\/booking\/\$\{[^}]*[bB]ooking[iI]d[^}]*\}/.test(code),
    ).map(({ pfad }) => pfad)

    expect(treffer).toEqual([])
  })
})
