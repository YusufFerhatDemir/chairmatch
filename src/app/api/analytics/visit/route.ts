import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Log a page visit for admin analytics.
 * Called from client (VisitTracker). IP/country from headers (Vercel geo).
 * DSGVO: minimal data, purpose security/statistics. Mention in Datenschutz.
 */
const RATE = { scope: 'analytics-visit', max: 60, windowMs: 60_000 }

export async function POST(request: NextRequest) {
  try {
    // Unauthentifizierter Insert in `visit_logs` — ohne Deckel kann eine
    // einzelne Quelle die Tabelle beliebig aufblaehen.
    const limit = checkRateLimit(clientIp(request), RATE)
    if (limit.limited) {
      return rateLimitResponse(limit, 'Zu viele Aufrufe.')
    }

    const body = await request.json().catch(() => ({}))
    const rawPath = typeof body.path === 'string' ? body.path : request.nextUrl.pathname || '/'
    const path = rawPath.slice(0, 255)

    const ip =
      request.headers.get('x-real-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      null
    const country = request.headers.get('x-vercel-ip-country') || null
    const region = request.headers.get('x-vercel-ip-country-region') || null
    const city = request.headers.get('x-vercel-ip-city') || null
    const userAgent = request.headers.get('user-agent')?.slice(0, 500) || null

    const supabase = getSupabaseAdmin()
    await supabase.from('visit_logs').insert({
      path,
      ip,
      country,
      region,
      city,
      user_agent: userAgent,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
