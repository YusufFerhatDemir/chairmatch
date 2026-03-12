import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { isProviderOrAbove, isBusinessOwnerOrAbove, isAdminOrAbove } from '@/lib/rbac'

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

  if (publicPaths.includes(pathname)) return NextResponse.next()
  if (publicPrefixes.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = req.auth
  if (!session) {
    const loginUrl = new URL('/auth', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = (session.user as { role?: string })?.role || ''

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
