import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { isProviderOrAbove, isBusinessOwnerOrAbove, isInvestorOrAbove, isAdminOrAbove } from '@/lib/rbac'

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
  '/api/indexnow/',     // NEU: IndexNow Key-File
  '/api/setup/',
  '/api/register-provider', // B2-Fix: Public Provider-Signup
  '/api/debug-auth',        // TEMP: Debug-Endpoint, bald wieder weg
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
  '/og-image',
  '/icon',
  '/screenshots/',
  '/apple-touch-icon',
]

const providerPaths = ['/provider']
const ownerPaths = ['/owner']
const investorPaths = ['/investor']
const adminPaths = ['/admin']

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
  if (publicPaths.includes(pathname)) return NextResponse.next()
  if (publicPrefixes.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Vertical-Deutschland-Hubs (z.B. /barbershop-deutschland, /friseur-deutschland)
  if (pathname.match(/^\/[a-z-]+-deutschland\/?$/)) return NextResponse.next()

  // Stadt-Hubs (z.B. /berlin, /muenchen, /berlin/friseur)
  // Whitelist nur die Phase-1-Städte um nicht alle 2-Wort-Routes zu öffnen
  const phase1Cities = ['berlin', 'hamburg', 'muenchen', 'koeln', 'frankfurt']
  const firstSegment = pathname.split('/')[1]
  if (firstSegment && phase1Cities.includes(firstSegment)) return NextResponse.next()

  // ------ Auth-Prüfung ------
  const session = req.auth
  if (!session) {
    // API-Routen: 401 JSON statt Redirect
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Nicht authentifiziert', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
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
    '/((?!_next/|icons/|brand/|screenshots/|favicon|apple-touch-icon|manifest|sw\.js|robots|sitemap|og-image|icon-).*)',
  ],
}
