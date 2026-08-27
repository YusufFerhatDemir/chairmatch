import { getCachedSettings } from '@/lib/settings'

/**
 * Werte aus `app_settings` landen hier in einem Inline-`<style>`. Roh
 * eingesetzt beendet ein `</style>` im Wert das Element, und der Rest wird
 * als Markup geparst — mit `script-src 'unsafe-inline'` (next.config.ts)
 * waere das ausfuehrbar. Schreiben darf die Tabelle nur ein super_admin,
 * das Panel validiert die Eingaben aber nicht; ein vertippter oder
 * eingefuegter Wert reicht.
 *
 * Statt zu escapen wird eng gefiltert: es sind ohnehin nur Farben, Zahlen
 * und CSS-Schluesselwoerter vorgesehen. Alles andere faellt weg.
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

export default async function DynamicTheme() {
  let themeSettings, layoutSettings, animationSettings
  try {
    ;[themeSettings, layoutSettings, animationSettings] = await Promise.all([
      getCachedSettings('theme'),
      getCachedSettings('layout'),
      getCachedSettings('animation'),
    ])
  } catch {
    // DB not available during build or error — fall back to CSS defaults
    return null
  }

  const vars: string[] = []

  for (const s of themeSettings) {
    vars.push(`--${cssIdent(s.key)}: ${cssValue(s.value)}`)
  }

  for (const s of layoutSettings) {
    if (s.key === 'shell_max') vars.push(`--shell-max: ${cssNumber(s.value)}px`)
    else if (s.key === 'card_radius') vars.push(`--card-radius: ${cssNumber(s.value)}px`)
    else if (s.key === 'btn_radius') vars.push(`--btn-radius: ${cssNumber(s.value)}px`)
  }

  if (vars.length === 0) return null

  const logoFloat = animationSettings.find(s => s.key === 'logo_float')?.value !== 'false'
  const logoGlow = animationSettings.find(s => s.key === 'logo_glow')?.value !== 'false'

  const animOverrides: string[] = []
  if (!logoFloat) animOverrides.push('@keyframes logoFloat { 0%, 50%, 100% { transform: translateY(0) } }')
  if (!logoGlow) animOverrides.push('@keyframes logoGlow { 0%, 50%, 100% { filter: none } }')

  const css = `:root { ${vars.join('; ')} } ${animOverrides.join(' ')}`

  return (
    <style dangerouslySetInnerHTML={{ __html: css }} />
  )
}
