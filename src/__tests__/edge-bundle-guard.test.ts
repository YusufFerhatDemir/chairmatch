/**
 * Was im Edge-Bundle landet — der Fehler, den weder `tsc` noch vitest sieht.
 *
 * `src/middleware.ts` laeuft in der Edge-Laufzeit. Alles, was von dort aus
 * statisch importiert wird, wandert in dasselbe Bundle — und ein
 * `node:`-Import darin bricht den Vercel-Build. Nicht den Typecheck, nicht
 * die Testsuite: NUR `npm run build`, und der laeuft erst nach dem Push.
 * Genau so ist es diesem Projekt schon einmal passiert, ueber
 * `middleware.ts → modules/auth/auth.config.ts`.
 *
 * Dieser Test rechnet den Importgraph nach und faellt, bevor gepusht wird.
 *
 * BEKANNTE, GEDULDETE AUSNAHME: `lib/totp.ts` importiert `crypto` OHNE
 * `node:`-Praefix, und der Build laeuft damit (Stand 31.08.2026, die
 * Produktion ist live). Der bare Bezeichner wird vom Bundler anders behandelt
 * als `node:crypto`; benutzt wird die Funktion ausserdem nur in
 * `authorize()`, das in der Middleware nie laeuft — dort wird lediglich das
 * JWT geprueft. Die Ausnahme steht namentlich in ERLAUBT, damit ein ZWEITER
 * solcher Import auffaellt statt mitzulaufen.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

/** Node-Kernmodule, die es in der Edge-Laufzeit nicht gibt. */
const NODE_BUILTINS = new Set([
  'fs', 'path', 'crypto', 'os', 'child_process', 'net', 'tls', 'http', 'https',
  'stream', 'zlib', 'buffer', 'util', 'worker_threads', 'dns', 'v8', 'vm',
  'perf_hooks', 'async_hooks', 'cluster', 'readline', 'tty', 'querystring',
])

/**
 * Was heute drinsteht und den Build nicht bricht — als `modul → datei`.
 * Diese Liste darf schrumpfen, aber nicht ohne Grund wachsen.
 */
const ERLAUBT = new Set(['crypto → src/lib/totp.ts'])

function aufloesen(spec: string, vonDatei: string): string | null {
  let basis: string
  if (spec.startsWith('@/')) basis = join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) basis = resolve(dirname(vonDatei), spec)
  else return null
  for (const endung of ['.ts', '.tsx', '.js', '/index.ts', '/index.tsx']) {
    if (existsSync(basis + endung)) return basis + endung
  }
  return null
}

interface Fund {
  modul: string
  datei: string
  pfad: string[]
}

function edgeGraph(einstieg: string): { module: Set<string>; funde: Fund[] } {
  const module = new Set<string>()
  const funde: Fund[] = []

  const gehe = (datei: string, pfad: string[]): void => {
    if (module.has(datei)) return
    module.add(datei)
    const rel = datei.replace(`${ROOT}/`, '')
    const code = readFileSync(datei, 'utf8')

    // Nur STATISCHE Importe: `await import()` bildet im Zweifel einen eigenen
    // Chunk, und `require()` kommt in diesem Quellbaum nicht vor.
    const specs = [
      ...code.matchAll(/(?:^|\n)\s*(?:import|export)[^'"\n]*?from\s*['"]([^'"]+)['"]/g),
    ].map(m => m[1])

    for (const spec of specs) {
      if (spec.startsWith('node:') || NODE_BUILTINS.has(spec)) {
        funde.push({ modul: spec, datei: rel, pfad: [...pfad, rel] })
        continue
      }
      const ziel = aufloesen(spec, datei)
      if (ziel) gehe(ziel, [...pfad, rel])
    }
  }

  gehe(einstieg, [])
  return { module, funde }
}

describe('Edge-Bundle: middleware.ts zieht keine Node-Module herein', () => {
  const { module, funde } = edgeGraph(join(SRC, 'middleware.ts'))

  it('findet den Graph ueberhaupt (sonst prueft dieser Test nichts)', () => {
    // Faellt der Aufloeser still aus, waere die Fundliste leer und der Test
    // gruen, ohne etwas geprueft zu haben.
    expect(module.size).toBeGreaterThan(3)
    expect([...module].some(d => d.endsWith('modules/auth/auth.config.ts'))).toBe(true)
  })

  it('enthaelt keinen einzigen `node:`-Import', () => {
    const mitPraefix = funde.filter(f => f.modul.startsWith('node:'))
    expect(
      mitPraefix.map(f => `${f.modul} in ${f.datei}\n  Pfad: ${f.pfad.join(' → ')}`),
    ).toEqual([])
  })

  it('zieht kein NEUES Node-Kernmodul herein', () => {
    const neu = funde
      .map(f => `${f.modul} → ${f.datei}`)
      .filter(s => !ERLAUBT.has(s))
    expect(neu).toEqual([])
  })

  it('die geduldete Ausnahme steht noch — sonst gehoert sie aus ERLAUBT raus', () => {
    // Ein Eintrag in ERLAUBT, den es nicht mehr gibt, ist eine Erlaubnis, die
    // niemand mehr braucht. Sie stillschweigend stehen zu lassen heisst, den
    // naechsten Import an dieser Stelle durchzuwinken.
    const vorhanden = new Set(funde.map(f => `${f.modul} → ${f.datei}`))
    for (const eintrag of ERLAUBT) {
      expect(vorhanden.has(eintrag), `ERLAUBT fuehrt "${eintrag}", der Graph nicht mehr`).toBe(true)
    }
  })
})
