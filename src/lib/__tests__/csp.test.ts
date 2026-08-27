// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildEnforcedCsp, buildReportOnlyCsp, generateNonce, CSP_REPORT_PATH } from '../csp'
import { cspStyleHash, styleElemHashes } from '../csp-hash'
import { GLOBAL_ERROR_CSS, LOGO_FLOAT_OFF_CSS, LOGO_GLOW_OFF_CSS, HASHED_INLINE_STYLES } from '../inline-css'

/**
 * Regressionstests fuer die Content-Security-Policy.
 *
 * Der Kern dieser Datei sind zwei Eigenschaften, die man beim Aufraeumen
 * versehentlich zerstoert und erst in Produktion merkt:
 *
 *   1. `script-src` darf WEDER Nonce NOCH Hash enthalten. Sobald eines von
 *      beiden drinsteht, ignorieren alle modernen Browser das
 *      `'unsafe-inline'` in derselben Direktive — und damit die
 *      Inline-Bootstrap-Scripts in jeder vorgerenderten Seite. Die Seite
 *      hydriert dann nicht mehr. Das sieht im Diff wie eine Haertung aus und
 *      ist ein Totalausfall.
 *
 *   2. Jeder Inline-`<style>`-Block braucht seinen Hash in `style-src-elem`.
 *      Der Hash wird aus derselben Konstante berechnet, die die Komponente
 *      rendert — ein Drift ist damit unmoeglich, solange niemand den CSS-Text
 *      in die Komponente zurueckkopiert.
 */

function directive(policy: string, name: string): string {
  const found = policy
    .split(';')
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(name + ' '))
  expect(found, `Direktive "${name}" fehlt in: ${policy}`).toBeDefined()
  return found as string
}

const PROD = { isDev: false, styleElemHashes: styleElemHashes() }

describe('buildEnforcedCsp', () => {
  it('laesst script-src nonce- und hashfrei, damit unsafe-inline wirksam bleibt', () => {
    const scriptSrc = directive(buildEnforcedCsp(PROD), 'script-src')
    expect(scriptSrc).toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain('nonce-')
    expect(scriptSrc).not.toContain('sha256-')
  })

  it('entfernt unsafe-eval in Produktion', () => {
    expect(directive(buildEnforcedCsp(PROD), 'script-src')).not.toContain("'unsafe-eval'")
  })

  it('behaelt unsafe-eval im Dev-Server (Webpack-HMR liefert Module als eval)', () => {
    const dev = buildEnforcedCsp({ ...PROD, isDev: true })
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'")
  })

  it('erlaubt in style-src-elem kein unsafe-inline, sondern nur die Hashes', () => {
    const styleElem = directive(buildEnforcedCsp(PROD), 'style-src-elem')
    expect(styleElem).not.toContain("'unsafe-inline'")
    for (const css of HASHED_INLINE_STYLES) {
      expect(styleElem, `Hash fuer einen Inline-Style fehlt`).toContain(cspStyleHash(css))
    }
  })

  it('haelt die Hashes an den tatsaechlich gerenderten Konstanten fest', () => {
    // Wenn jemand den CSS-Text in einer Komponente aendert, ohne die Konstante
    // zu benutzen, faellt das hier auf: die Liste kennt nur diese drei Bloecke.
    expect(HASHED_INLINE_STYLES).toEqual([GLOBAL_ERROR_CSS, LOGO_FLOAT_OFF_CSS, LOGO_GLOW_OFF_CSS])
    expect(styleElemHashes()).toHaveLength(3)
    for (const h of styleElemHashes()) {
      expect(h).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/)
    }
  })

  it('gibt style-src-attr frei — React liefert jedes style={{…}} als Attribut', () => {
    expect(directive(buildEnforcedCsp(PROD), 'style-src-attr')).toBe("style-src-attr 'unsafe-inline'")
  })

  it('behaelt style-src als permissiven Fallback fuer Browser ohne -elem/-attr', () => {
    // Safari < 15.4 kennt style-src-elem nicht und wuerde sonst auf eine
    // Direktive fallen, die es gar nicht auswerten kann.
    expect(directive(buildEnforcedCsp(PROD), 'style-src')).toContain("'unsafe-inline'")
  })

  it('haelt die uebrigen Schutzdirektiven', () => {
    const csp = buildEnforcedCsp(PROD)
    expect(directive(csp, 'default-src')).toBe("default-src 'self'")
    expect(directive(csp, 'object-src')).toBe("object-src 'none'")
    expect(directive(csp, 'base-uri')).toBe("base-uri 'self'")
    expect(directive(csp, 'form-action')).toBe("form-action 'self'")
    expect(directive(csp, 'frame-ancestors')).toBe("frame-ancestors 'none'")
    expect(csp).toContain('upgrade-insecure-requests')
  })

  it('behaelt die Drittanbieter, ohne die Bezahlung und Karte ausfallen', () => {
    const csp = buildEnforcedCsp(PROD)
    expect(directive(csp, 'script-src')).toContain('https://js.stripe.com')
    expect(directive(csp, 'frame-src')).toContain('https://js.stripe.com')
    expect(directive(csp, 'connect-src')).toContain('https://*.supabase.co')
    expect(directive(csp, 'connect-src')).toContain('wss://*.supabase.co')
    expect(directive(csp, 'img-src')).toContain('https://*.tile.openstreetmap.org')
    expect(directive(csp, 'font-src')).toContain('https://fonts.gstatic.com')
  })
})

describe('buildReportOnlyCsp', () => {
  const ro = buildReportOnlyCsp({ nonce: 'TESTNONCE', isDev: false })

  it('ist nonce-basiert und ohne unsafe-inline', () => {
    const scriptSrc = directive(ro, 'script-src')
    expect(scriptSrc).toContain("'nonce-TESTNONCE'")
    expect(scriptSrc).toContain("'strict-dynamic'")
    expect(scriptSrc).not.toContain("'unsafe-inline'")
  })

  it('verbietet Inline-Event-Handler', () => {
    expect(directive(ro, 'script-src-attr')).toBe("script-src-attr 'none'")
  })

  it('meldet an den eigenen Endpunkt', () => {
    expect(ro).toContain(`report-uri ${CSP_REPORT_PATH}`)
    expect(CSP_REPORT_PATH).toBe('/api/csp-report')
  })

  it('nonced auch style-src-elem', () => {
    expect(directive(ro, 'style-src-elem')).toContain("'nonce-TESTNONCE'")
  })

  it('laesst upgrade-insecure-requests weg', () => {
    // In einer Report-Only-Policy ignoriert der Browser die Direktive und
    // schreibt stattdessen fuer JEDE Seite eine Fehlerzeile in die Konsole.
    // Durchgesetzt wird sie von der Enforced-Policy.
    expect(ro).not.toContain('upgrade-insecure-requests')
    expect(buildEnforcedCsp(PROD)).toContain('upgrade-insecure-requests')
  })
})

describe('generateNonce', () => {
  it('liefert bei jedem Aufruf einen anderen Wert', () => {
    const werte = new Set(Array.from({ length: 50 }, () => generateNonce()))
    expect(werte.size).toBe(50)
  })

  it('liefert base64 mit mindestens 128 Bit Entropie', () => {
    const n = generateNonce()
    expect(n).toMatch(/^[A-Za-z0-9+/]+={0,2}$/)
    expect(Buffer.from(n, 'base64')).toHaveLength(16)
  })
})
