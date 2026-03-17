import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logError } from '@/lib/error-tracking'
import { auth } from '@/modules/auth/auth.config'

/**
 * POST /api/errors — Client-side error reporting.
 * Called from ErrorBoundary / global-error when a rendering or JS error occurs.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : 'Unknown client error'
    const stack = typeof body.stack === 'string' ? body.stack.slice(0, 5000) : null
    const url = typeof body.url === 'string' ? body.url.slice(0, 2000) : null
    const component = typeof body.component === 'string' ? body.component.slice(0, 200) : null

    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null

    // Try to get user ID from session (optional — unauthenticated errors are fine)
    let userId: string | null = null
    try {
      const session = await auth()
      userId = session?.user?.id ?? null
    } catch {
      // Auth failure should not block error reporting
    }

    await logError(new Error(message), {
      url: url ?? undefined,
      user_agent: userAgent ?? undefined,
      ip: ip ?? undefined,
      user_id: userId ?? undefined,
      severity: 'high',
      component: component ?? undefined,
      extra: { stack, source: 'client' },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

/**
 * GET /api/errors — Admin-only: list recent errors with pagination.
 * Query params: ?page=1&limit=50&severity=high
 */
export async function GET(request: NextRequest) {
  // Admin check
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
  const severity = searchParams.get('severity')
  const offset = (page - 1) * limit

  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('error_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (severity) {
    query = query.eq('severity', severity)
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    errors: data,
    page,
    limit,
    total: count ?? 0,
  })
}
