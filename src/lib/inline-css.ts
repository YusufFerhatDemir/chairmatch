/**
 * Inline-CSS, das nicht in `globals.css` leben kann.
 *
 * Hintergrund: seit dem CSP-Umbau (siehe `src/lib/csp.ts`) enthaelt
 * `style-src-elem` in Produktion KEIN `'unsafe-inline'` mehr. Jedes
 * `<style>`-Element im HTML braucht daher einen SHA-256-Hash in der Policy.
 *
 * Damit Hash und Inhalt nicht auseinanderlaufen koennen, steht der CSS-Text
 * genau einmal hier. `next.config.ts` importiert die Konstante, hasht sie zur
 * Build-Zeit und traegt den Hash in die Policy ein — die Komponente rendert
 * exakt dieselbe Zeichenkette. Eine Aenderung am CSS aendert damit automatisch
 * auch den Hash; ein Drift ist konstruktiv unmoeglich.
 *
 * NEUE Inline-Styles gehoeren nach `globals.css`, nicht hierher. Diese Datei
 * ist ausschliesslich fuer Faelle, in denen das Stylesheet nachweislich nicht
 * geladen ist.
 */

/**
 * Styles fuer `app/global-error.tsx`.
 *
 * global-error rendert ausserhalb des Root-Layouts sein eigenes
 * `<html>`/`<body>`. Ob Next.js in diesem Pfad die Layout-CSS-Chunks noch
 * verlinkt, ist nicht garantiert — genau dann greift der Handler ja, wenn das
 * Layout gecrasht ist. Deshalb bleibt dieses eine Stylesheet inline.
 */
export const GLOBAL_ERROR_CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #080706; }
body {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  color: #e0e0e0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.cinzel { font-family: 'Cinzel', serif; letter-spacing: 2px; }
@keyframes cmPulse {
  0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(200,168,75,0.25)); }
  50%      { transform: scale(1.04); filter: drop-shadow(0 0 18px rgba(200,168,75,0.45)); }
}
.cm-pin { animation: cmPulse 2.6s ease-in-out infinite; }
.cm-btn {
  padding: 12px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.18s ease;
  font-family: inherit;
}
.cm-btn:hover:not(:disabled) { transform: translateY(-1px); }
.cm-btn:disabled { opacity: 0.6; cursor: default; }
.cm-btn-gold {
  background: linear-gradient(135deg, #c8a84b, #e8d06a);
  color: #080706;
  border: none;
}
.cm-btn-outline {
  background: transparent;
  color: #c8a84b;
  border: 1.5px solid rgba(200,168,75,0.4);
  text-decoration: none;
  display: inline-block;
}
.cm-btn-ghost {
  background: transparent;
  color: #999;
  border: 1px solid rgba(255,255,255,0.08);
}
`

/**
 * Animations-Abschalter aus dem Admin-Panel (`app_settings`, Kategorie
 * `animation`). Der Wert aus der DB entscheidet nur, OB der Block gerendert
 * wird — der CSS-Text selbst ist konstant und damit hashbar.
 * Siehe `src/components/DynamicTheme.tsx`.
 */
export const LOGO_FLOAT_OFF_CSS =
  '@keyframes logoFloat { 0%, 50%, 100% { transform: translateY(0) } }'

export const LOGO_GLOW_OFF_CSS =
  '@keyframes logoGlow { 0%, 50%, 100% { filter: none } }'

/** Alle Inline-Stylesheets, die in der CSP als Hash erlaubt sein muessen. */
export const HASHED_INLINE_STYLES: readonly string[] = [
  GLOBAL_ERROR_CSS,
  LOGO_FLOAT_OFF_CSS,
  LOGO_GLOW_OFF_CSS,
]
