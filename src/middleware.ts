import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const publicPaths = [
  '/',
  '/explore',
  '/search',
  '/offers',
  '/rentals',
  '/datenschutz',
  '/impressum',
  '/auth',
  '/api/auth',
]

const publicPrefixes = [
  '/salon/',
  '/category/',
  '/api/auth/',
  '/api/debug',
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
const adminPaths = ['/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (publicPaths.includes(pathname)) return NextResponse.next()
  if (publicPrefixes.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Get session token
  const token = await getToken({ req: request })

  // Auth required paths
  if (!token) {
    const loginUrl = new URL('/auth', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Provider routes
  if (providerPaths.some(p => pathname.startsWith(p))) {
    const role = token.role as string
    if (!['anbieter', 'provider', 'admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Admin routes
  if (adminPaths.some(p => pathname.startsWith(p))) {
    const role = token.role as string
    if (!['admin', 'super_admin'].includes(role)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
