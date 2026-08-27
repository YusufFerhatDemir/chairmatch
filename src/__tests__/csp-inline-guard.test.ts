// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { usesNonceCanary, CSP_NONCE_CANARY_PATHS, CSP_NONCE_CANARY_PREFIXES } from '@/middleware'

/**
 * Waechter ueber die Annahmen, auf denen die CSP steht.
 *
 * `style-src-elem` erlaubt in Produktion kein `'unsafe-inline'` mehr, sondern
 * nur drei feste SHA-256-Hashes. Ein neues `<style>`-Element irgendwo in den
 * Komponenten wird deshalb im Browser stillschweigend fallengelassen — die
 * Seite baut sich auf, nur ohne die Styles aus dem Block. Kein Fehler, kein
 * Absturz, nichts, was ein Render-Test bemerkt. Nur ein kaputtes Layout.
 *
 * Dieser Test macht daraus einen Build-Fehler: wer ein `<style>` einbaut, muss
 * es entweder nach globals.css legen oder bewusst in `HASHED_INLINE_STYLES`
 * aufnehmen und hier eintragen.
 */

const SRC = join(process.cwd(), 'src')

/**
 * Entfernt Kommentare, bevor gesucht wird. Ohne das schlaegt der Waechter bei
 * jedem Kommentar an, der `<style>` bloss erwaehnt — und davon gibt es seit dem
 * CSP-Umbau einige, weil genau diese Umstellung dort erklaert wird.
 */
function ohneKommentare(quelltext: string): string {
  return quelltext
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) {
      if (name === '__tests__' || name === 'node_modules') continue
      walk(p, out)
    } else if (name.endsWith('.tsx')) {
      out.push(p)
    }
  }
  return out
}

/**
 * Die einzigen Komponenten, die ein `<style>`-Element rendern duerfen. Beide
 * ziehen ihren CSS-Text aus `lib/inline-css.ts`, damit next.config.ts genau
 * diesen String hashen kann.
 */
const ERLAUBTE_STYLE_DATEIEN = [
  'app/global-error.tsx',
  'components/DynamicTheme.tsx',
].sort()

describe('Inline-<style> in Komponenten', () => {
  const treffer = walk(SRC)
    .filter((p) => /<style[\s>]/.test(ohneKommentare(readFileSync(p, 'utf8'))))
    .map((p) => p.slice(SRC.length + 1).replaceAll('\\', '/'))
    .sort()

  it('kommt nur in den beiden gehashten Komponenten vor', () => {
    expect(treffer).toEqual(ERLAUBTE_STYLE_DATEIEN)
  })

  it('rendert dort ueber die Konstanten aus lib/inline-css', () => {
    for (const rel of ERLAUBTE_STYLE_DATEIEN) {
      const quelltext = ohneKommentare(readFileSync(join(SRC, rel), 'utf8'))
      expect(quelltext, `${rel} muss aus lib/inline-css lesen`).toContain('@/lib/inline-css')
      // `<style>{`…`}</style>` waere nicht hashstabil: JSX kann Whitespace
      // einfuegen, der Browser hasht aber exakt den Textinhalt.
      expect(quelltext, `${rel} darf CSS nicht als JSX-Child rendern`).not.toMatch(/<style>\{`/)
    }
  })
})

describe('Ausfuehrbares Inline-JS', () => {
  it('gibt es im Root-Layout nicht mehr', () => {
    const layout = ohneKommentare(readFileSync(join(SRC, 'app/layout.tsx'), 'utf8'))
    // JSON-LD (`type="application/ld+json"`) bleibt — das ist Daten, kein Code.
    // Ein `<script dangerouslySetInnerHTML>` OHNE type waere wieder echtes
    // Inline-JS und damit der Grund, warum script-src 'unsafe-inline' braucht.
    const inlineScripts = layout.match(/<script(?![^>]*type=)[^>]*dangerouslySetInnerHTML/g)
    expect(inlineScripts).toBeNull()
  })
})

describe('Nonce-Kanarienvogel', () => {
  it('greift auf den eingetragenen Pfaden', () => {
    for (const p of CSP_NONCE_CANARY_PATHS) expect(usesNonceCanary(p)).toBe(true)
    for (const p of CSP_NONCE_CANARY_PREFIXES) {
      expect(usesNonceCanary(p)).toBe(true)
      expect(usesNonceCanary(p + '/dashboard')).toBe(true)
    }
  })

  it('greift NICHT auf ISR-/prerender-gecachten Seiten', () => {
    // Dort waere der Nonce im HTML aelter als der im Header — jede Auslieferung
    // aus dem Cache meldete einen Verstoss, den es nicht gibt.
    for (const p of ['/', '/berlin', '/magazin', '/magazin/irgendwas', '/faq', '/explore', '/account']) {
      expect(usesNonceCanary(p), `${p} darf keinen Nonce bekommen`).toBe(false)
    }
  })

  it('nimmt Unterpfade der Exakt-Eintraege nicht mit', () => {
    // /rentals ist force-dynamic, /rentals/[id]/buchen nicht.
    expect(usesNonceCanary('/rentals')).toBe(true)
    expect(usesNonceCanary('/rentals/abc/buchen')).toBe(false)
  })
})
