/**
 * Content-Security-Policy — eine Quelle fuer beide Policies.
 *
 * ── Warum kein durchgaengiges Nonce? ────────────────────────────────────────
 * Ein Nonce muss pro Request neu sein und muss im HTML stehen. Beides zugleich
 * geht nur, wenn das HTML pro Request gerendert wird. ChairMatch rendert die
 * komplette oeffentliche Flaeche als ISR/Static (siehe `revalidate` in fast
 * jeder Seite und den ausdruecklichen Hinweis in `app/layout.tsx`: kein
 * force-dynamic, kein cookies() im Root-Layout, sonst TTFB ~5s statt
 * Edge-Cache). Ein Nonce im Response-Header trifft dort auf ausgeliefertes
 * HTML, das entweder gar keinen oder einen alten Nonce traegt.
 *
 * Und: sobald `script-src` einen Nonce ODER einen Hash enthaelt, ignorieren
 * alle modernen Browser das `'unsafe-inline'` in derselben Direktive. Ein
 * "Nonce zusaetzlich, unsafe-inline als Fallback" gibt es also nicht — die
 * Inline-Bootstrap-Scripts von Next.js (`self.__next_f.push(...)`) im
 * vorgerenderten HTML waeren sofort blockiert und die Hydration tot.
 *
 * Deshalb zwei Policies:
 *
 *   1. ENFORCED (`buildEnforcedCsp`) — nonce-frei, damit ISR funktioniert.
 *      Gesetzt in `next.config.ts`, liegt auf JEDER Response. Gehaertet
 *      wurde, was ohne Nonce geht: `'unsafe-eval'` faellt in Produktion weg,
 *      und `style-src-elem` kommt ohne `'unsafe-inline'` aus (die
 *      Inline-Stylesheets sind bis auf global-error nach globals.css
 *      gewandert, der Rest laeuft ueber SHA-256-Hashes).
 *
 *   2. REPORT-ONLY (`buildReportOnlyCsp`) — die strikte Zielpolicy mit
 *      Nonce + `'strict-dynamic'`, gesetzt in `src/middleware.ts`. Sie
 *      blockiert nichts, meldet aber jeden Verstoss an `/api/csp-report`.
 *      Next.js liest den Request-Header `content-security-policy-report-only`
 *      und versieht seine eigenen Inline-Scripts automatisch mit dem Nonce
 *      (node_modules/next/dist/server/app-render/app-render.js). Damit misst
 *      die Policy real, was fuer eine spaetere Durchsetzung noch fehlt,
 *      ohne die Seite zu riskieren.
 *
 * ── Warum `'unsafe-inline'` in script-src bleibt ────────────────────────────
 * Zwei Gruppen von Inline-Scripts sind ohne dynamisches Rendering nicht
 * loesbar: Next.js' Flight-Payload-Scripts und die ~35 JSON-LD-Bloecke
 * (`<script type="application/ld+json">`, Chrome wertet auch die gegen
 * script-src). Beide haengen am jeweiligen Seiteninhalt, sind also weder
 * hashbar noch externalisierbar. Ausfuehrbares eigenes Inline-JS gibt es
 * dagegen nicht mehr — der Service-Worker-Kill-Switch ist eine regulaere
 * Client-Component (`components/ServiceWorkerCleanup.tsx`).
 */

/** Hosts, die eigene Scripts liefern duerfen. */
const SCRIPT_HOSTS = [
  'https://js.stripe.com',
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
  'https://connect.facebook.net',
] as const

const STYLE_HOSTS = ['https://fonts.googleapis.com'] as const

const FONT_HOSTS = ['https://fonts.gstatic.com'] as const

const IMG_HOSTS = [
  'https://*.supabase.co',
  'https://lh3.googleusercontent.com',
  'https://*.sentry.io',
  'https://www.google-analytics.com',
  'https://www.googletagmanager.com',
  'https://*.facebook.com',
  'https://*.facebook.net',
  // OpenStreetMap-Tiles fuer die interaktive Stuhl-Karte (/karte)
  'https://*.tile.openstreetmap.org',
  'https://tile.openstreetmap.org',
] as const

const CONNECT_HOSTS = [
  'https://*.supabase.co',
  'wss://*.supabase.co',
  'https://api.stripe.com',
  'https://vitals.vercel-insights.com',
  'https://*.ingest.de.sentry.io',
  'https://*.ingest.us.sentry.io',
  'https://*.sentry.io',
  'https://www.google-analytics.com',
  'https://*.analytics.google.com',
  'https://*.googletagmanager.com',
  'https://connect.facebook.net',
  'https://*.facebook.com',
] as const

// maps.google.com/www.google.com: SalonMap bettet ein Google-Maps-iframe ein
const FRAME_HOSTS = [
  'https://js.stripe.com',
  'https://hooks.stripe.com',
  'https://maps.google.com',
  'https://www.google.com',
] as const

/** Endpunkt fuer CSP-Violation-Reports der Report-Only-Policy. */
export const CSP_REPORT_PATH = '/api/csp-report'

/**
 * Direktiven, die in beiden Policies identisch sind und nichts mit
 * Script-/Style-Ausfuehrung zu tun haben.
 */
function sharedDirectives(): string[] {
  return [
    `font-src 'self' ${FONT_HOSTS.join(' ')}`,
    `img-src 'self' data: blob: ${IMG_HOSTS.join(' ')}`,
    `connect-src 'self' ${CONNECT_HOSTS.join(' ')}`,
    `frame-src 'self' ${FRAME_HOSTS.join(' ')}`,
    // frame-ancestors blockt Einbettung in Iframes (Clickjacking-Schutz)
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]
}

export interface EnforcedCspOptions {
  /** `true` fuer `next dev` — Webpack-HMR braucht eval und Runtime-`<style>`. */
  isDev: boolean
  /**
   * SHA-256-Hashes der Inline-`<style>`-Elemente, jeweils bereits als
   * `'sha256-…'` formatiert. Kommen aus `next.config.ts`.
   */
  styleElemHashes: readonly string[]
}

/**
 * Die durchgesetzte Policy. Enthaelt bewusst KEINEN Nonce und KEINEN
 * script-src-Hash — beides wuerde `'unsafe-inline'` deaktivieren und damit
 * jede vorgerenderte Seite zerlegen (siehe Kopfkommentar).
 */
export function buildEnforcedCsp({ isDev, styleElemHashes }: EnforcedCspOptions): string {
  // 'unsafe-eval' braucht nur der Dev-Server: Webpack liefert Module in HMR
  // als `eval(...)`-Wrapper aus. Keine Produktions-Abhaengigkeit benoetigt es
  // (stripe-js, supabase-js, leaflet, sentry, zod, web-vitals, next-auth).
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    ...SCRIPT_HOSTS,
  ].join(' ')

  // style-src-elem ist die strikte Direktive: nur eigenes Stylesheet,
  // Google-Fonts-CSS und die gehashten Inline-Bloecke. Im Dev-Server injiziert
  // Webpack Styles zur Laufzeit als <style>-Element — dort bleibt unsafe-inline.
  const styleElem = [
    "'self'",
    ...(isDev ? ["'unsafe-inline'"] : styleElemHashes),
    ...STYLE_HOSTS,
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // style-src ist nur noch Fallback fuer Browser ohne style-src-elem/-attr
    // (Safari < 15.4). Moderne Browser nutzen ausschliesslich die beiden
    // spezifischen Direktiven darunter.
    `style-src 'self' 'unsafe-inline' ${STYLE_HOSTS.join(' ')}`,
    `style-src-elem ${styleElem}`,
    // React setzt Styles ueber das style-Attribut (`style={{…}}`); Leaflet und
    // Stripe tun dasselbe. Attribut-Styles kennen kein Nonce und keinen Hash —
    // 'unsafe-inline' ist hier alternativlos, aber auch deutlich harmloser:
    // ein Angreifer kann damit kein <style>-Element und kein Script einbringen.
    "style-src-attr 'unsafe-inline'",
    ...sharedDirectives(),
    'upgrade-insecure-requests',
  ].join('; ')
}

export interface ReportOnlyCspOptions {
  /** Pro Request frisch erzeugter Nonce (base64). */
  nonce: string
  isDev: boolean
}

/**
 * Die Zielpolicy: Nonce + `'strict-dynamic'`, kein `'unsafe-inline'`, kein
 * Host-Allowlisting fuer Scripts. Laeuft ausschliesslich im Report-Only-Modus.
 *
 * `'strict-dynamic'` laesst Scripts, die ein vertrauenswuerdiges Script
 * nachlaedt, ebenfalls zu — damit funktionieren GA4/Stripe/Meta-Loader ohne
 * Host-Allowlist. `https:` steht als Fallback fuer Browser ohne
 * strict-dynamic-Support drin und wird von modernen Browsern ignoriert.
 */
export function buildReportOnlyCsp({ nonce, isDev }: ReportOnlyCspOptions): string {
  const scriptSrc = [
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    ...(isDev ? ["'unsafe-eval'"] : []),
    'https:',
  ].join(' ')

  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    // Inline-Event-Handler (onclick="…") sind eine der haeufigsten
    // XSS-Nutzlasten. React verwendet sie nicht — hier wird gemessen, ob ein
    // Drittanbieter-Tag es doch tut, bevor die Direktive scharf geschaltet wird.
    "script-src-attr 'none'",
    `style-src-elem 'self' 'nonce-${nonce}' ${STYLE_HOSTS.join(' ')}`,
    "style-src-attr 'unsafe-inline'",
    ...sharedDirectives(),
    // Kein `upgrade-insecure-requests`: die Direktive ist in einer
    // Report-Only-Policy wirkungslos, und Chrome schreibt fuer jede Seite eine
    // Fehlerzeile in die Konsole. Durchgesetzt wird sie ohnehin von der
    // Enforced-Policy.
    `report-uri ${CSP_REPORT_PATH}`,
  ].join('; ')
}

/**
 * Erzeugt einen Nonce. Nutzt die Web-Crypto-API, damit die Funktion auch im
 * Edge-Runtime der Middleware laeuft (`node:crypto` gibt es dort nicht).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}
