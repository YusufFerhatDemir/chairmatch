import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Log a page visit for admin analytics.
 * Called from client (VisitTracker). IP/country from headers (Vercel geo).
 * DSGVO: minimal data, purpose security/statistics. Mention in Datenschutz.
 */
export async function POST(request: NextRequest) {
  try {
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
