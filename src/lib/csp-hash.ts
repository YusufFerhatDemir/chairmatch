/**
 * SHA-256-Hashes fuer die Inline-`<style>`-Elemente der CSP.
 *
 * NUR fuer Node-Kontexte: `next.config.ts` (Build-Zeit) und Tests. Nicht in
 * Client- oder Edge-Code importieren — `node:crypto` gibt es im Edge-Runtime
 * der Middleware nicht.
 */
import { createHash } from 'node:crypto'
import { HASHED_INLINE_STYLES } from './inline-css'

/**
 * Formatiert den CSP-Hash eines Inline-Blocks. Der Browser hasht exakt den
 * Textinhalt des Elements — die Komponenten rendern die Konstante deshalb ueber
 * `dangerouslySetInnerHTML`, damit JSX keine Whitespace-Varianten einbaut.
 */
export function cspStyleHash(css: string): string {
  return `'sha256-${createHash('sha256').update(css, 'utf8').digest('base64')}'`
}

/** Alle Style-Hashes fuer `style-src-elem`. */
export function styleElemHashes(): string[] {
  return HASHED_INLINE_STYLES.map(cspStyleHash)
}
