import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { isProviderOrAbove, isBusinessOwnerOrAbove, isAdminOrAbove } from '@/lib/rbac'

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
  '/cookie-settings',
  '/auth',
  '/api/auth',
]

const publicPrefixes = [
  '/salon/',
  '/category/',
  '/auth/',
  '/api/auth/',
  '/api/analytics/',
  '/api/newsletter',
  '/api/cookies',
  '/api/availability',
  '/register/',
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
]

const providerPaths = ['/provider']
const ownerPaths = ['/owner']
const adminPaths = ['/admin']

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default auth((req) => {
  const { pathname } = req.nextUrl

  // ------ Rate Limiting (nur für API-Routen) ------
  if (pathname.startsWith('/api/')) {
    const ip = getClientIp(req)
    const isAuthRoute = pathname.startsWith('/api/auth/')

    if (isAuthRoute) {
      if (isRateLimited(ip, 'auth', RATE_LIMIT_AUTH)) {
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

  // ------ Auth-Prüfung ------
  const session = req.auth
  if (!session) {
    const loginUrl = new URL('/auth', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as { role?: string })?.role || ''

  // ------ RBAC ------
  if (providerPaths.some(p => pathname.startsWith(p))) {
    if (!isProviderOrAbove(role)) return NextResponse.redirect(new URL('/', req.url))
  }

  if (ownerPaths.some(p => pathname.startsWith(p))) {
    if (!isBusinessOwnerOrAbove(role) && !isProviderOrAbove(role)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  if (adminPaths.some(p => pathname.startsWith(p))) {
    if (!isAdminOrAbove(role)) return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
