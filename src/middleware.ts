import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { isProviderOrAbove, isBusinessOwnerOrAbove, isInvestorOrAbove, isAdminOrAbove } from '@/lib/rbac'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'
import { buildReportOnlyCsp, generateNonce } from '@/lib/csp'

// SEO-Stadt-Slugs aus der zentralen Datenquelle — eine hartcodierte Liste hier
// hatte Phase-2-Städte (/leipzig etc.) auf den Auth-Redirect laufen lassen.
const SEO_CITY_SLUGS = new Set(PHASE_1_CITIES.map((c) => c.slug))

// ---------------------------------------------------------------------------
// Rate Limiting — In-Memory (pro Serverless-Instanz)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  /** Timestamps der Requests innerhalb des aktiven Fensters */
  timestamps: number[]
}

/** IP → RateLimitEntry */
const rateLimitMap = new Map<string, RateLimitEntry>()

const RATE_LIMIT_API = 60        // max Requests pro Minute für /api/*
const RATE_LIMIT_AUTH = 10       // max Requests pro Minute für /api/auth/*
const RATE_LIMIT_AVAILABILITY = 30  // /api/availability ist public → anti-Scraping
const RATE_WINDOW_MS = 60_000    // 1 Minute
const CLEANUP_INTERVAL_MS = 5 * 60_000  // 5 Minuten

let lastCleanup = Date.now()

/**
 * Entfernt abgelaufene Einträge aus der Map.
 * Wird höchstens alle 5 Minuten ausgeführt.
 */
function cleanupExpiredEntries(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, entry] of rateLimitMap) {
    // Nur Timestamps behalten, die noch im Fenster liegen
    entry.timestamps = entry.timestamps.filter(t => now - t < RATE_WINDOW_MS)
    if (entry.timestamps.length === 0) {
      rateLimitMap.delete(key)
    }
  }
}

/**
 * Prüft und aktualisiert das Rate-Limit für eine gegebene IP + Bucket.
 * Gibt `true` zurück, wenn das Limit überschritten ist.
 */
function isRateLimited(ip: string, bucket: string, limit: number): boolean {
  const now = Date.now()

  // Periodisches Aufräumen
  cleanupExpiredEntries(now)

  const key = `${bucket}::${ip}`
  let entry = rateLimitMap.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    rateLimitMap.set(key, entry)
  }

  // Alte Timestamps entfernen (außerhalb des Fensters)
  entry.timestamps = entry.timestamps.filter(t => now - t >= 0 && now - t < RATE_WINDOW_MS)

  if (entry.timestamps.length >= limit) {
    return true // Limit überschritten
  }

  entry.timestamps.push(now)
  return false
}

/**
 * IP-Adresse aus Request-Headers extrahieren (Vercel / Reverse-Proxy kompatibel).
 */
function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/**
 * 429 Too Many Requests Response (deutsch).
 */
function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'Zu viele Anfragen. Bitte versuchen Sie es in einer Minute erneut.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + 60),
      },
    },
  )
}

// ---------------------------------------------------------------------------
// Öffentliche / geschützte Routen
// ---------------------------------------------------------------------------

const publicPaths = [
  '/',
  '/explore',
  '/search',
  '/offers',
  '/rentals',
  '/datenschutz',
  '/impressum',
  '/agb',
  '/agb-provider',
  '/widerruf',
  '/cookie-settings',
  '/landing',
  '/pitch',
  '/auth',
  '/shop',
  '/statistik',
  '/api/auth',
  // SEO/Marketing-Pages (alle public!)
  '/was-ist-chairmatch',
  '/provisionsmodell',
  '/empfehlungen',
  '/faq',
  '/magazin',
  '/freelancer-rechner',
  '/products',
  '/premium',
  // Medical Beauty Money-Pages
  '/haartransplantation',
  '/zahnimplantate',
  '/augenlasern',
  '/longevity',
  '/iv-infusionen',
]

const publicPrefixes = [
  '/salon/',
  '/category/',
  '/listings/',         // NEU: Listing-Detail-Pages
  '/products/',         // NEU: Product-Detail-Pages
  '/magazin/',          // NEU: Magazin-Artikel
  '/anbieter/',         // NEU: Anbieter-Funnel-Pages
  '/mieter/',           // NEU: Mieter-Funnel-Pages
  '/vermieter/',        // NEU: Vermieter-Onboarding (Public-Whitelist)
  '/konto',             // Konto-Seite (Login/Register/Profil)
  '/inserat/',          // Inserat-Detail + Mietanfrage
  '/nachrichten',       // Chat-Liste + Chat-Detail
  '/termine',           // Kunde-Termine
  '/auth/',
  '/api/auth/',
  '/api/analytics/',
  '/api/newsletter',
  '/api/cookies',
  '/api/availability',
  '/api/stripe/webhook',
  '/api/errors',
  // Der Browser schickt CSP-Violation-Reports ohne Credentials. Ohne diesen
  // Eintrag beantwortet der Default-Deny jeden Report mit 401 — der Nonce-Track
  // haette dann eine Meldestelle, die nie etwas zu sehen bekommt.
  '/api/csp-report',
  '/api/cron/',
  '/api/reviews/aggregate',
  '/api/salons/',
  '/api/products',
  '/api/public-stats',
  '/api/wait-list',     // NEU: Wait-List Signup
  '/api/match',         // Match-Finder ist public (/match) — sonst 401 für anonyme Besucher
  '/api/indexnow/',     // NEU: IndexNow Key-File
  '/api/setup/',
  // Detailsicht eines Mietobjekts. Die Seiten, die sie brauchen —
  // /inserat/[id]/anfragen und /rentals/[id]/buchen — sind oeffentlich; der
  // API-Aufruf dahinter lief bis 2026-08-23 gegen den Default-Deny und
  // antwortete anonymen Besuchern mit 401. Das Anfrageformular blieb damit
  // leer, obwohl die Route selbst nie eine Session verlangt hat.
  //
  // Nur mit Slash: `/api/rental-equipment` OHNE Slash ist die
  // Vermieter-Liste (GET) und das Anlegen (POST) und bleibt geschuetzt.
  // PATCH und DELETE auf /[id] pruefen Session und Besitz in der Route
  // selbst (siehe src/app/api/rental-equipment/__tests__/crud.e2e.test.ts).
  '/api/rental-equipment/',
  // Auslieferung hochgeladener Dateien. In `salons.logo_url` und
  // `rental_equipment.images` steht `/api/uploads/{id}` — die stabile
  // App-URL. Ohne diesen Eintrag liefert jedes Salonlogo und jedes
  // Inseratsfoto anonymen Besuchern 401 statt eines Bildes.
  //
  // Die Route entscheidet selbst, was oeffentlich ist: `is_public = false`
  // (Zertifikate) verlangt Eigentuemer oder Admin, DELETE verlangt den
  // Eigentuemer. `/api/uploads` OHNE Slash (Liste, Upload) bleibt geschuetzt.
  '/api/uploads/',
  '/api/register-provider', // B2-Fix: Public Provider-Signup
  '/unsubscribe',           // DSGVO: Newsletter ohne Login abmeldbar
  '/shop/',
  '/register/',
  '/stadt/',            // Stadt-Hubs für SEO
  // Vertical-Deutschland-Hubs (z.B. /barbershop-deutschland)
  // werden über pathname.endsWith('-deutschland') gemacht im Check unten
  '/_next/',
  '/icons/',
  '/brand/',
  '/favicon',
  '/manifest',
  '/sw.js',
  '/robots',
  '/sitemap',
  '/llms',
  '/.well-known/',
  '/humans',
  '/security',
  '/og-image',
  '/icon',
  '/screenshots/',
  '/apple-touch-icon',
]

// Seiten- UND API-Praefixe pro Rolle.
//
// Die API-Pfade fehlten hier bis 2026-08-27. Der RBAC-Block unten prueft mit
// `pathname.startsWith('/admin')` — `/api/admin/...` faengt damit nicht an,
// also kam JEDE eingeloggte Person (auch eine Kundin) durch die Middleware bis
// in den Admin-Handler. Dass nichts durchschlug, lag allein daran, dass jede
// einzelne Route ihre Rolle nochmal selbst prueft: ein vergessener Check in
// einer neuen Route waere sofort offen gewesen. Jetzt greift beides.
const providerPaths = ['/provider', '/api/provider']
const ownerPaths = ['/owner', '/api/owner']
const investorPaths = ['/investor', '/api/investor']
const adminPaths = ['/admin', '/api/admin']
// Bereiche, die eine Session voraussetzen, aber keine spezifische Rolle
// (Route-Group (protected): /account, /booking, /favorites).
const authOnlyPaths = ['/account', '/booking', '/favorites']

// Vollständige Liste aller Pfade, die überhaupt eine Session verlangen.
// ALLES außerhalb dieser Liste ist für anonyme Besucher zugänglich — es gibt
// KEINEN Default-Deny-Redirect (307 → /auth) mehr für unbekannte oder öffentliche
// Seiten-Pfade. Das ist der SEO-Fix: eine Login-Wall auf beliebigen gecrawlten
// URLs (z.B. /ads, /karte, alte Kampagnen-Links) blockierte Googles Indexierung
// komplett. Geschützte App-Bereiche bleiben über diese Whitelist voll gesichert.
const authRequiredPaths = [
  ...authOnlyPaths,
  ...providerPaths,
  ...ownerPaths,
  ...investorPaths,
  ...adminPaths,
]

/**
 * Ist dieser Pfad ohne Session erreichbar?
 *
 * Ausgelagert, weil sich hier eine Fehlerklasse versteckt, die kein
 * Route-Test finden kann: eine Route ohne eigenen Session-Check gilt im
 * Handler als oeffentlich, wird aber vom Default-Deny dieser Middleware mit
 * 401 beantwortet. Genau so waren `/api/rental-equipment/[id]` und
 * `/api/uploads/[id]` monatelang unerreichbar — beide Handler pruefen keine
 * Session, beide antworteten live trotzdem 401.
 *
 * Als reine Funktion laesst sich die Zuordnung direkt pruefen
 * (src/__tests__/middleware-public-paths.test.ts), ohne NextAuth zu starten.
 */
export function isPublicPath(pathname: string): boolean {
  if (publicPaths.includes(pathname)) return true
  if (publicPrefixes.some((p) => pathname.startsWith(p))) return true

  // AI-/Social-Crawler-Endpoints auf jeder Tiefe (Next.js Convention)
  if (
    pathname.endsWith('/opengraph-image') ||
    pathname.endsWith('/twitter-image') ||
    pathname.endsWith('/apple-icon') ||
    pathname.endsWith('/icon')
  ) {
    return true
  }

  // Vertical-Deutschland-Hubs (z.B. /barbershop-deutschland, /friseur-deutschland)
  if (pathname.match(/^\/[a-z-]+-deutschland\/?$/)) return true

  // Stadt-Hubs (z.B. /berlin, /leipzig, /berlin/friseur)
  const firstSegment = pathname.split('/')[1]
  if (firstSegment && SEO_CITY_SLUGS.has(firstSegment)) return true

  return false
}

// ---------------------------------------------------------------------------
// CSP-Nonce-Kanarienvogel
// ---------------------------------------------------------------------------

/**
 * Wo die strikte Nonce-Policy zusaetzlich als Report-Only mitlaeuft
 * (das Gesamtbild steht in `src/lib/csp.ts`).
 *
 * Warum nicht ueberall: ein Nonce landet beim Rendern im HTML, der Header wird
 * pro Request neu erzeugt. Auf einer ISR- oder prerender-gecachten Seite passt
 * beides nach dem ersten Request nicht mehr zusammen — jede Auslieferung aus
 * dem Cache wuerde einen Verstoss melden, den es gar nicht gibt, und der
 * Endpunkt saehe vor lauter Rauschen die echten Treffer nicht.
 *
 * Aufgenommen wird deshalb nur, was `export const dynamic = 'force-dynamic'`
 * traegt und damit garantiert pro Request rendert. Alle Eintraege haengen am
 * selben Root-Layout wie der Rest der App (JSON-LD-Bloecke, GA4, Meta-Pixel,
 * DynamicTheme, ChatWidget) — was hier meldet, meldet ueberall.
 *
 * Erweitern: erst `force-dynamic` auf dem Ziel pruefen, dann eintragen.
 */

/** Genau diese Pfade — Unterpfade sind teils statisch (z.B. /rentals/[id]/buchen). */
export const CSP_NONCE_CANARY_PATHS = [
  '/search',
  '/karte',
  '/preisvergleich',
  '/rentals',
] as const

/** Ganze Teilbaeume: /provider hat force-dynamic auf Layout-Ebene. */
export const CSP_NONCE_CANARY_PREFIXES = ['/provider'] as const

/** Bekommt dieser Pfad die Report-Only-Nonce-Policy? */
export function usesNonceCanary(pathname: string): boolean {
  if ((CSP_NONCE_CANARY_PATHS as readonly string[]).includes(pathname)) return true
  return CSP_NONCE_CANARY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )
}

// ---------------------------------------------------------------------------
// Auth- und RBAC-Entscheidung
// ---------------------------------------------------------------------------

export type AuthDecision =
  | { kind: 'pass' }
  | { kind: 'unauthorized' }
  | { kind: 'login_redirect' }
  | { kind: 'password_change_required' }
  | { kind: 'password_change_redirect' }
  | { kind: 'forbidden' }

/**
 * Reine Entscheidungsfunktion fuer Session- und Rollen-Pruefung.
 *
 * Ausgelagert aus dem `auth((req) => ...)`-Callback, weil sich dieser nicht
 * ohne vollen NextAuth-Request-Mock aufrufen laesst — genau das Problem, das
 * `authorizeCredentials` in auth.config.ts fuer den Login-Pfad schon loest.
 * Hier wird dieselbe RBAC-Kette (Session → Passwort-Zwang → Rollen-Praefixe)
 * direkt mit einem Pfad und einer Session pruefbar, ohne NextRequest/Response.
 */
export function decideAuthAccess(params: {
  pathname: string
  session: { role?: string; passwordMustChange?: boolean } | null
}): AuthDecision {
  const { pathname, session } = params

  if (isPublicPath(pathname)) return { kind: 'pass' }

  if (!session) {
    if (pathname.startsWith('/api/')) return { kind: 'unauthorized' }
    const needsAuth = authRequiredPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
    if (!needsAuth) return { kind: 'pass' }
    return { kind: 'login_redirect' }
  }

  const role = session.role || ''
  const mustChangePw = !!session.passwordMustChange

  if (mustChangePw && !pathname.startsWith('/auth/change-password') && !pathname.startsWith('/api/auth/')) {
    if (pathname.startsWith('/api/')) return { kind: 'password_change_required' }
    return { kind: 'password_change_redirect' }
  }

  if (providerPaths.some((p) => pathname.startsWith(p))) {
    if (!isProviderOrAbove(role)) return { kind: 'forbidden' }
  }

  if (ownerPaths.some((p) => pathname.startsWith(p))) {
    if (!isBusinessOwnerOrAbove(role) && !isProviderOrAbove(role)) {
      return { kind: 'forbidden' }
    }
  }

  if (investorPaths.some((p) => pathname.startsWith(p))) {
    if (!isInvestorOrAbove(role)) return { kind: 'forbidden' }
  }

  if (adminPaths.some((p) => pathname.startsWith(p))) {
    if (!isAdminOrAbove(role)) return { kind: 'forbidden' }
  }

  return { kind: 'pass' }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default auth((req) => {
  const { pathname } = req.nextUrl

  // ------ CSP: Nonce-Track (Report-Only) ------
  // Die durchgesetzte Policy kommt aus next.config.ts und ist nonce-frei.
  // Hier kommt nur die strikte Zielpolicy als Report-Only obendrauf, und auch
  // die nur auf dem Kanarienvogel-Teilbaum.
  const nonce = usesNonceCanary(pathname) ? generateNonce() : null
  const reportOnlyCsp = nonce
    ? buildReportOnlyCsp({ nonce, isDev: process.env.NODE_ENV === 'development' })
    : null

  /**
   * `NextResponse.next()` — auf den Kanarienvogel-Pfaden mit angereicherten
   * Request-Headern.
   *
   * Next.js liest den Nonce aus dem Request-Header und haengt ihn an seine
   * eigenen Inline-Scripts (app-render.js prueft 'content-security-policy'
   * und faellt auf '-report-only' zurueck). `x-nonce` steht zusaetzlich fuer
   * eigene Server-Components bereit.
   *
   * Ohne Nonce bleibt es beim schlichten `next()`: das Umschreiben der
   * Request-Header kostet auf jedem Aufruf etwas und braucht hier niemand.
   */
  const pass = () => {
    if (!nonce || !reportOnlyCsp) return NextResponse.next()
    const requestHeaders = new Headers(req.headers)
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('content-security-policy-report-only', reportOnlyCsp)
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  /** Haengt die Report-Only-Policy an jede Antwort — auch an 401/403/429. */
  const withCsp = (res: NextResponse): NextResponse => {
    if (reportOnlyCsp) res.headers.set('Content-Security-Policy-Report-Only', reportOnlyCsp)
    return res
  }

  return withCsp(route())

  function route(): NextResponse {

    // ------ Rate Limiting (nur für API-Routen) ------
    // H1-Fix: NextAuth-Polling-Routen (/session, /csrf, /providers, /callback) bekommen KEIN Rate-Limit
    // Sonst läuft jeder Tab-Wechsel oder Page-Reload in 429-Fehler.
    const NEXTAUTH_INTERNAL = ['/api/auth/session', '/api/auth/csrf', '/api/auth/providers', '/api/auth/callback', '/api/auth/_log']
    const isNextAuthInternal = NEXTAUTH_INTERNAL.some(p => pathname.startsWith(p))

    if (pathname.startsWith('/api/') && !isNextAuthInternal) {
      const ip = getClientIp(req)
      // B5-Fix: Sensitive Auth-Routes nur bei POST/PUT/PATCH/DELETE rate-limiten.
      // Sonst können bereits GETs (z.B. /api/auth/2fa/setup für Account-Render)
      // den User in 429 sperren.
      const isWriteMethod = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS'
      const isSensitiveAuth = isWriteMethod && (
        pathname === '/api/auth/register' ||
        pathname === '/api/auth/forgot-password' ||
        pathname.startsWith('/api/auth/2fa/') ||
        pathname.startsWith('/api/auth/phone/')
      )

      if (isSensitiveAuth) {
        if (isRateLimited(ip, 'auth', RATE_LIMIT_AUTH)) {
          return rateLimitResponse()
        }
      } else if (pathname.startsWith('/api/availability')) {
        // M4-Fix: Public Availability-Endpoint hat eigenen, kleineren Bucket —
        // verhindert Bot-Scraping aller Salon-Slots.
        if (isRateLimited(ip, 'availability', RATE_LIMIT_AVAILABILITY)) {
          return rateLimitResponse()
        }
      } else {
        if (isRateLimited(ip, 'api', RATE_LIMIT_API)) {
          return rateLimitResponse()
        }
      }
    }

    // ------ Auth- und RBAC-Entscheidung ------
    const session = req.auth
    const decision = decideAuthAccess({
      pathname,
      session: session
        ? {
            role: (session.user as { role?: string })?.role,
            passwordMustChange: (session.user as { passwordMustChange?: boolean })?.passwordMustChange,
          }
        : null,
    })

    switch (decision.kind) {
      case 'pass':
        return pass()

      case 'unauthorized':
        // API-Routen: 401 JSON statt Redirect (Default-Deny für nicht-öffentliche APIs bleibt).
        return NextResponse.json(
          { error: 'Nicht authentifiziert', code: 'UNAUTHORIZED' },
          { status: 401 }
        )

      case 'login_redirect': {
        // Seiten-Routen: NUR echte geschützte Bereiche auf die Login-Wall schicken.
        // Jeder andere (unbekannte oder öffentliche) Pfad wird durchgelassen → Next.js
        // rendert die Seite oder eine saubere 404, statt 307 → /auth. Verhindert, dass
        // Crawler/Backlinks auf der Login-Wall landen (die Ursache für 0 indexierte Seiten).
        const loginUrl = new URL('/auth', req.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }

      // ------ Force Password Change ------
      // Wenn das Flag gesetzt ist (z.B. Provider mit Initial-Passwort), darf der User
      // NUR auf /auth/change-password und einige whitelist-Routen. Alles andere → Redirect.
      case 'password_change_required':
        return NextResponse.json(
          { error: 'Passwort muss geändert werden', code: 'PW_MUST_CHANGE' },
          { status: 403 }
        )

      case 'password_change_redirect': {
        const url = new URL('/auth/change-password', req.url)
        url.searchParams.set('forced', '1')
        url.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(url)
      }

      case 'forbidden':
        return pathname.startsWith('/api/')
          ? NextResponse.json({ error: 'Keine Berechtigung', code: 'FORBIDDEN' }, { status: 403 })
          : NextResponse.redirect(new URL('/', req.url))
    }
  }
})

export const config = {
  // B4-Fix: Statische Assets KOMPLETT vom Middleware-JWT-Check ausschließen.
  // Vorher lief die Auth-Logik für jeden Icon-, Font-, Manifest-Request mit
  // 200-500ms Latenz auf langsamen Mobilnetzen. Das fühlte sich an wie "App
  // hängt sofort beim Start".
  matcher: [
    '/((?!_next/|icons/|brand/|screenshots/|favicon|apple-touch-icon|manifest|sw.js|robots|sitemap|og-image|icon-|llms|.well-known|humans|security|google).*)',
  ],
}
