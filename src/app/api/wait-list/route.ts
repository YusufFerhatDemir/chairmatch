/**
 * POST /api/wait-list — User trägt sich für Benachrichtigung ein,
 * wenn Salons in einer bestimmten Stadt verfügbar sind.
 *
 * Speichert in `wait_list`-Tabelle (oder fallback newsletter mit Tag).
 * Schickt KEINE sofortige E-Mail — Trigger erfolgt manuell oder via Cron
 * sobald genug Salons in der Stadt registriert sind.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { hashIp } from '@/lib/ip-hash'
import { z } from 'zod'

const waitListSchema = z.object({
  email: z.string().email().max(255),
  city: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = waitListSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
    }

    const { email, city, source } = parsed.data
    const supabase = getSupabaseAdmin()
    const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const ipHash = rawIp ? hashIp(rawIp) : null

    // Rate-Limit: max 5 Eintraege / Stunde / IP
    if (ipHash) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from('wait_list')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ipHash)
        .gte('created_at', hourAgo)

      if ((count ?? 0) >= 5) {
        return NextResponse.json({ error: 'Zu viele Anfragen, bitte später erneut.' }, { status: 429 })
      }
    }

    // Insert (idempotent — same email+city dedup)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('wait_list')
      .upsert({
        email: email.toLowerCase().trim(),
        city: city ? city.slice(0, 100) : null,
        source: source || 'search',
        ip: ipHash,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email,city',
      })

    if (error) {
      // Fallback: wenn wait_list-Tabelle nicht existiert, in newsletter mit Tag schreiben
      logger.warn('wait_list.insert_failed_fallback_newsletter', { err: error.message })
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('newsletter').upsert({
          email: email.toLowerCase().trim(),
          tags: ['wait_list', `city:${city || 'any'}`],
          source: source || 'search',
        }, { onConflict: 'email' })
      } catch (e2) {
        logger.error('wait_list.fallback_newsletter_failed', e2)
        return NextResponse.json({ error: 'Speichern fehlgeschlagen' }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    logger.error('wait_list.unhandled', e)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
