import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Web-Vitals RUM Endpoint — empfängt Core-Web-Vital-Messungen aus dem
 * Browser (LCP, CLS, INP, FCP, TTFB) und schreibt sie als Events vom
 * source='vitals' in die analytics_events-Tabelle.
 *
 * Web-Vitals sind nicht-personenbezogen — kein Consent erforderlich.
 * Trotzdem nur session_id (keine User-ID) gespeichert.
 */

const VALID_METRICS = new Set(['CLS', 'INP', 'LCP', 'FCP', 'TTFB', 'FID'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | { name?: unknown; value?: unknown; rating?: unknown; id?: unknown; session_id?: unknown; path?: unknown; navigationType?: unknown }
      | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const name = typeof body.name === 'string' ? body.name : ''
    if (!VALID_METRICS.has(name)) {
      return NextResponse.json({ error: 'unknown metric' }, { status: 400 })
    }

    const value = typeof body.value === 'number' && Number.isFinite(body.value) ? body.value : null
    if (value === null) {
      return NextResponse.json({ error: 'invalid value' }, { status: 400 })
    }

    const rating = typeof body.rating === 'string' ? body.rating.slice(0, 16) : null
    const metric_id = typeof body.id === 'string' ? body.id.slice(0, 64) : null
    const session_id = typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : 'anonymous'
    const path = typeof body.path === 'string' ? body.path.slice(0, 255) : null
    const navigationType = typeof body.navigationType === 'string' ? body.navigationType.slice(0, 32) : null

    const country = req.headers.get('x-vercel-ip-country') || null
    const region = req.headers.get('x-vercel-ip-country-region') || null
    const city = req.headers.get('x-vercel-ip-city') || null
    const user_agent = req.headers.get('user-agent')?.slice(0, 500) || null

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('analytics_events').insert({
      event_name: `web_vital_${name.toLowerCase()}`,
      session_id,
      path,
      props: { metric: name, value, rating, metric_id, navigationType },
      source: 'vitals',
      country,
      region,
      city,
      user_agent,
    })

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ ok: false, reason: 'migration_pending' }, { status: 202 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }
}
