import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * Public Newsletter-Signup.
 * POST /api/newsletter
 * Body: { email, name?, source? }
 *
 * Single-Opt-In (Hinweis in Datenschutz).
 * Rate-Limit: max 3 Anfragen pro IP/Minute (in-memory).
 */

const schema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
  source: z.string().trim().max(60).optional(),
})

// In-memory rate limit (best-effort, pro Lambda-Instanz)
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 3
const ipBuckets = new Map<string, number[]>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const arr = (ipBuckets.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (arr.length >= RATE_MAX) {
    ipBuckets.set(ip, arr)
    return true
  }
  arr.push(now)
  ipBuckets.set(ip, arr)
  // gelegentliches Aufräumen
  if (ipBuckets.size > 5000) {
    for (const [k, v] of ipBuckets) {
      const fresh = v.filter(t => now - t < RATE_WINDOW_MS)
      if (fresh.length === 0) ipBuckets.delete(k)
      else ipBuckets.set(k, fresh)
    }
  }
  return false
}

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

export async function POST(req: NextRequest) {
  try {
    const ip = getIp(req)
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Zu viele Anfragen. Bitte versuche es in einer Minute erneut.' },
        { status: 429 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 })
    }

    const { email, name, source } = parsed.data
    const emailNormalized = email.toLowerCase().trim()

    const supabase = getSupabaseAdmin()

    // Prüfen ob schon existiert
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', emailNormalized)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ success: true, alreadySubscribed: true })
      }
      // Reaktivieren wenn vorher unsubscribed/bounced
      const { error: updateErr } = await supabase
        .from('newsletter_subscribers')
        .update({
          status: 'active',
          name: name || null,
          source: source || 'web',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        })
        .eq('id', existing.id)
      if (updateErr) {
        return NextResponse.json({ error: 'Datenbankfehler' }, { status: 500 })
      }
      return NextResponse.json({ success: true, reactivated: true })
    }

    // Neu anlegen
    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: emailNormalized,
        name: name || null,
        source: source || 'web',
        status: 'active',
      })

    if (error) {
      // Bei race-condition (duplicate key) trotzdem Success
      if (error.code === '23505') {
        return NextResponse.json({ success: true, alreadySubscribed: true })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Newsletter signup]', err)
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 })
  }
}
