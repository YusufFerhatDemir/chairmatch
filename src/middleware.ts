import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'

const publicPaths = [
  '/',
  '/explore',
  '/search',
  '/offers',
  '/rentals',
  '/datenschutz',
  '/impressum',
  '/agb',
  '/auth',
  '/api/auth',
]

const publicPrefixes = [
  '/salon/',
  '/category/',
  '/api/auth/',
  '/api/analytics/',
  '/api/newsletter',
  '/register/',
  '/_next/',
  '/icons/',
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

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Allow public paths
  if (publicPaths.includes(pathname)) return NextResponse.next()
  if (publicPrefixes.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = req.auth

  // Auth required paths
  if (!session) {
    const loginUrl = new URL('/auth', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as { role?: string })?.role || ''

  // Provider routes
  if (providerPaths.some(p => pathname.startsWith(p))) {
    if (!['anbieter', 'provider', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Owner routes (Standortanbieter – Anbieter haben Zugang)
  if (ownerPaths.some(p => pathname.startsWith(p))) {
    if (!['anbieter', 'provider', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  // Admin routes
  if (adminPaths.some(p => pathname.startsWith(p))) {
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', req.url))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
