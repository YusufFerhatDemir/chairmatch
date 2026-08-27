/**
 * Cron: Tägliches Auto-Publish überfälliger Reviews.
 *
 * Wenn 14 Tage nach Booking-Ende KEINE Gegen-Bewertung kam,
 * wird die alleinstehende Bewertung freigeschaltet.
 *
 * Schedule: 1x/Tag um 03:30 (siehe vercel.json).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Fehlt CRON_SECRET, wird der Vergleichswert zum String "Bearer undefined"
  // — den kann jeder schicken. Die anderen beiden Cron-Routen fangen das mit
  // `!cronSecret` ab, hier fehlte der Riegel.
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Finde alle unpublished Reviews älter als 14 Tage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stale } = await (supabase as any)
    .from('reviews')
    .select('id, booking_id')
    .eq('published', false)
    .lt('created_at', cutoff)
    .in('review_type', ['tenant_to_provider', 'provider_to_tenant'])
    .limit(500)

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, published: 0 })
  }

  // Pro Booking: publish_review_pair() Stored-Procedure aufrufen
  const uniqueBookings = Array.from(new Set(stale.map((r: { booking_id: string }) => r.booking_id)))
  let published = 0

  for (const bookingId of uniqueBookings) {
    try {
      await supabase.rpc('publish_review_pair', { p_booking_id: bookingId })
      published++
    } catch (e) {
      logger.warn('cron.publish_reviews_failed', { bookingId, err: String(e) })
    }
  }

  return NextResponse.json({ ok: true, published, processed_bookings: uniqueBookings.length })
}
