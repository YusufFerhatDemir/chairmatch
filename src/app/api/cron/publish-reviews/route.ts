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
import { isAuthorizedCron } from '@/lib/cron-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Finde alle unpublished Reviews älter als 14 Tage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stale, error: staleError } = await (supabase as any)
    .from('reviews')
    .select('id, booking_id')
    .eq('published', false)
    .lt('created_at', cutoff)
    .in('review_type', ['tenant_to_provider', 'provider_to_tenant'])
    .limit(500)

  // Faellt die Abfrage aus, ist `stale` ebenfalls leer — bis Track 20 war
  // ein Ausfall der Datenbank von „nichts zu tun" nicht zu unterscheiden.
  if (staleError) {
    logger.warn('cron.publish_reviews_query_failed', { err: staleError.message })
    return NextResponse.json(
      { ok: false, published: 0, error: 'Faellige Bewertungen konnten nicht geladen werden' },
      { status: 503 },
    )
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, published: 0, failed: 0, processed_bookings: 0 })
  }

  // Pro Booking: publish_review_pair() Stored-Procedure aufrufen
  const uniqueBookings: string[] = Array.from(
    new Set(stale.map((r: { booking_id: string }) => r.booking_id)),
  )
  let published = 0

  /*
   * Track 20: der `try/catch` hier hat nie etwas gefangen.
   *
   * `supabase.rpc()` WIRFT nicht. Es liefert `{ data, error }` — genau wie
   * jede andere Abfrage des SDK. Ein Fehler der Stored Procedure (fehlende
   * Funktion, verletzte Bedingung, entzogenes Recht) landete deshalb still
   * in einer Variablen, die niemand ansah, und `published++` lief trotzdem.
   *
   * Die Folge war eine Antwort, die das Gegenteil dessen behauptete, was
   * passiert war: `{ ok: true, published: 87 }` fuer 87 Aufrufe, von denen
   * keiner durchging. Der Cron laeuft naechtlich und ohne Zuschauer — diese
   * Antwort ist die EINZIGE Stelle, an der man merken kann, dass
   * Bewertungen seit Wochen nicht mehr freigeschaltet werden.
   */
  const failed: string[] = []

  for (const bookingId of uniqueBookings) {
    try {
      const { error } = await supabase.rpc('publish_review_pair', { p_booking_id: bookingId })
      if (error) {
        failed.push(bookingId)
        logger.warn('cron.publish_reviews_failed', { bookingId, err: error.message })
        continue
      }
      published++
    } catch (e) {
      // Ein geworfener Fehler bleibt moeglich (Netzwerk, abgebrochene
      // Verbindung) — nur ist er nicht mehr der einzige Weg, auf dem ein
      // Fehlschlag hier ankommt.
      failed.push(bookingId)
      logger.warn('cron.publish_reviews_failed', { bookingId, err: String(e) })
    }
  }

  return NextResponse.json({
    ok: failed.length === 0,
    published,
    failed: failed.length,
    processed_bookings: uniqueBookings.length,
  })
}
