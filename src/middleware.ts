import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { isProviderOrAbove, isBusinessOwnerOrAbove, isInvestorOrAbove, isAdminOrAbove } from '@/lib/rbac'
import { PHASE_1_CITIES } from '@/lib/seo-data/cities'

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
// Middleware
// ---------------------------------------------------------------------------

export default auth((req) => {
  const { pathname } = req.nextUrl

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

  // ------ Öffentliche Routen ------
  if (isPublicPath(pathname)) return NextResponse.next()

  // ------ Auth-Prüfung ------
  const session = req.auth
  if (!session) {
    // API-Routen: 401 JSON statt Redirect (Default-Deny für nicht-öffentliche APIs bleibt).
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    // Seiten-Routen: NUR echte geschützte Bereiche auf die Login-Wall schicken.
    // Jeder andere (unbekannte oder öffentliche) Pfad wird durchgelassen → Next.js
    // rendert die Seite oder eine saubere 404, statt 307 → /auth. Verhindert, dass
    // Crawler/Backlinks auf der Login-Wall landen (die Ursache für 0 indexierte Seiten).
    const needsAuth = authRequiredPaths.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    )
    if (!needsAuth) return NextResponse.next()

    const loginUrl = new URL('/auth', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as { role?: string })?.role || ''
  const mustChangePw = !!(session.user as { passwordMustChange?: boolean })?.passwordMustChange

  // ------ Force Password Change ------
  // Wenn das Flag gesetzt ist (z.B. Provider mit Initial-Passwort), darf der User
  // NUR auf /auth/change-password und einige whitelist-Routen. Alles andere → Redirect.
  if (mustChangePw && !pathname.startsWith('/auth/change-password') && !pathname.startsWith('/api/auth/')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Passwort muss geändert werden', code: 'PW_MUST_CHANGE' },
        { status: 403 }
      )
    }
    const url = new URL('/auth/change-password', req.url)
    url.searchParams.set('forced', '1')
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // ------ RBAC ------
  const forbidden = () => pathname.startsWith('/api/')
    ? NextResponse.json({ error: 'Keine Berechtigung', code: 'FORBIDDEN' }, { status: 403 })
    : NextResponse.redirect(new URL('/', req.url))

  if (providerPaths.some(p => pathname.startsWith(p))) {
    if (!isProviderOrAbove(role)) return forbidden()
  }

  if (ownerPaths.some(p => pathname.startsWith(p))) {
    if (!isBusinessOwnerOrAbove(role) && !isProviderOrAbove(role)) {
      return forbidden()
    }
  }

  if (investorPaths.some(p => pathname.startsWith(p))) {
    if (!isInvestorOrAbove(role)) return forbidden()
  }

  if (adminPaths.some(p => pathname.startsWith(p))) {
    if (!isAdminOrAbove(role)) return forbidden()
  }

  return NextResponse.next()
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
