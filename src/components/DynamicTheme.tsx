import type { CSSProperties } from 'react'
import { getCachedSettings } from '@/lib/settings'
import { LOGO_FLOAT_OFF_CSS, LOGO_GLOW_OFF_CSS } from '@/lib/inline-css'

/**
 * Theme-Overrides aus `app_settings`.
 *
 * Frueher landete alles zusammen in einem Inline-`<style>`. Das ging nicht
 * mehr, seit `style-src-elem` in Produktion ohne `'unsafe-inline'` auskommt
 * (siehe src/lib/csp.ts): ein `<style>`-Element mit Inhalt aus der Datenbank
 * ist weder hashbar noch — auf ISR-Seiten — mit einem Nonce versehbar.
 *
 * Aufgeteilt in zwei Wege, die beide ohne `'unsafe-inline'` funktionieren:
 *
 *   1. Die Custom-Properties gehen als `style`-Attribut an `<html>`
 *      (`themeStyleVars()`, eingehaengt in app/layout.tsx). Attribut-Styles
 *      fallen unter `style-src-attr` — dort ist `'unsafe-inline'` ohnehin
 *      alternativlos, weil React jedes `style={{…}}` so ausliefert. `<html>`
 *      statt `<body>`, damit die Variablen weiter auf `:root`-Ebene liegen:
 *      globals.css setzt `html { background: var(--bg) }`.
 *
 *   2. Die beiden Animations-Abschalter bleiben `<style>`-Elemente, sind aber
 *      jetzt konstante Strings aus lib/inline-css.ts und damit hashbar.
 *
 * Die Filterung der DB-Werte bleibt unveraendert: Schreiben darf `app_settings`
 * nur ein super_admin, das Panel validiert die Eingaben aber nicht. Ein
 * vertippter oder eingefuegter Wert reicht, deshalb wird eng gefiltert — es
 * sind ohnehin nur Farben, Zahlen und CSS-Schluesselwoerter vorgesehen.
 * Im style-Attribut kann ein `</style>` das Element nicht mehr beenden, der
 * Filter bleibt trotzdem: er haelt CSS-Injection in benachbarte Deklarationen
 * (`;background:url(…)`) auf.
 */

/** Custom-Property-Name: nur das, was CSS als Bezeichner erlaubt. */
function cssIdent(key: string): string {
  return key.replace(/[^a-zA-Z0-9_-]/g, '')
}

/** Farb-/Keyword-Wert: Klammern, Anfuehrungszeichen und Winkel raus. */
function cssValue(value: string): string {
  return value.replace(/[^a-zA-Z0-9#(),.%\s/-]/g, '').slice(0, 120)
}

/** Reine Zahl fuer die px-Angaben. */
function cssNumber(value: string): string {
  const n = Number(value)
  return Number.isFinite(n) ? String(n) : '0'
}

/** Die Layout-Keys, die als px-Wert gesetzt werden duerfen. */
const LAYOUT_PX_VARS: Record<string, string> = {
  shell_max: '--shell-max',
  card_radius: '--card-radius',
  btn_radius: '--btn-radius',
}

/**
 * Baut die Custom-Properties fuer `<html style={…}>`.
 *
 * Gibt `undefined` zurueck, wenn nichts konfiguriert ist oder die DB nicht
 * erreichbar ist (z.B. waehrend des Builds) — dann greifen die Defaults aus
 * globals.css.
 */
export async function themeStyleVars(): Promise<CSSProperties | undefined> {
  let themeSettings, layoutSettings
  try {
    ;[themeSettings, layoutSettings] = await Promise.all([
      getCachedSettings('theme'),
      getCachedSettings('layout'),
    ])
  } catch {
    return undefined
  }

  const vars: Record<string, string> = {}

  for (const s of themeSettings) {
    const name = cssIdent(s.key)
    if (name) vars[`--${name}`] = cssValue(s.value)
  }

  for (const s of layoutSettings) {
    const name = LAYOUT_PX_VARS[s.key]
    if (name) vars[name] = `${cssNumber(s.value)}px`
  }

  if (Object.keys(vars).length === 0) return undefined
  return vars as CSSProperties
}

/**
 * Schaltet Logo-Float/-Glow ab, wenn im Admin-Panel so eingestellt.
 *
 * Nur diese beiden konstanten Bloecke — ihr SHA-256-Hash steht ueber
 * `HASHED_INLINE_STYLES` in der CSP.
 */
export default async function DynamicTheme() {
  let animationSettings
  try {
    animationSettings = await getCachedSettings('animation')
  } catch {
    return null
  }

  const logoFloat = animationSettings.find(s => s.key === 'logo_float')?.value !== 'false'
  const logoGlow = animationSettings.find(s => s.key === 'logo_glow')?.value !== 'false'

  if (logoFloat && logoGlow) return null

  return (
    <>
      {!logoFloat && <style dangerouslySetInnerHTML={{ __html: LOGO_FLOAT_OFF_CSS }} />}
      {!logoGlow && <style dangerouslySetInnerHTML={{ __html: LOGO_GLOW_OFF_CSS }} />}
    </>
  )
}
