import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * First-Party-Event-Stream — Eingang für trackEvent() aus dem Browser.
 *
 * Strikte Validierung:
 *   - event_name: kurzer alphanumerischer Slug (a-z, 0-9, _)
 *   - session_id: vorhanden, max 64 Zeichen
 *   - path: max 255 Zeichen
 *   - props: jsonb, max 10 KB serialisiert (Schutz vor Riesen-Payloads)
 *
 * Kein Auth-Check (anonyme Visitors sollen tracken können), Geo aus
 * Vercel-Headern, User-Agent abgeschnitten. Schreibt in analytics_events.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as
      | { event_name?: unknown; session_id?: unknown; path?: unknown; props?: unknown }
      | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }

    const event_name = typeof body.event_name === 'string' ? body.event_name.slice(0, 64) : ''
    if (!/^[a-z0-9_]+$/i.test(event_name)) {
      return NextResponse.json({ error: 'invalid event_name' }, { status: 400 })
    }

    const session_id = typeof body.session_id === 'string' ? body.session_id.slice(0, 64) : ''
    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 })
    }

    const path = typeof body.path === 'string' ? body.path.slice(0, 255) : null

    let props: Record<string, unknown> = {}
    if (body.props && typeof body.props === 'object') {
      const serialized = JSON.stringify(body.props)
      if (serialized.length > 10_000) {
        return NextResponse.json({ error: 'props too large' }, { status: 413 })
      }
      props = body.props as Record<string, unknown>
    }

    const country = req.headers.get('x-vercel-ip-country') || null
    const region = req.headers.get('x-vercel-ip-country-region') || null
    const city = req.headers.get('x-vercel-ip-city') || null
    const user_agent = req.headers.get('user-agent')?.slice(0, 500) || null

    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('analytics_events').insert({
      event_name,
      session_id,
      path,
      props,
      source: 'browser',
      country,
      region,
      city,
      user_agent,
    })

    if (error) {
      // 42P01 = relation does not exist → Tabelle ist noch nicht migriert.
      // Wir antworten 202 (Accepted, but not persisted), damit der Client
      // nicht in Endlos-Retries läuft.
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
