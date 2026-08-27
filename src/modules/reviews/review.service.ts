import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { AggregateRatings } from './review.types'

/**
 * Bewertungstyp der Kunden-Salon-Bewertungen (Termin-Behandlung).
 *
 * Die Tabelle `reviews` traegt seit Migration 20260515_bidirectional_reviews
 * DREI Typen: `customer_to_salon` (hier), sowie `tenant_to_provider` und
 * `provider_to_tenant` aus der Stuhl-Vermietung. Die beiden Miet-Typen sind
 * double-blind — sie werden erst sichtbar, wenn beide Seiten bewertet haben
 * oder 14 Tage vergangen sind (siehe /api/reviews/rental und den Cron
 * publish-reviews).
 *
 * Miet-Bewertungen tragen aus Legacy-Gruenden ebenfalls eine `salon_id`.
 * Wer also nur nach `salon_id` filtert, bekommt sie mit — und genau das ist
 * bis 2026-08-27 an drei Stellen passiert: die oeffentliche Salon-Liste hat
 * unveroeffentlichte Miet-Bewertungen ausgeliefert (die Double-Blind-Sperre
 * war damit wirkungslos), und die Salon-Sterne mittelten Miet-Bewertungen
 * mit ein — dieselbe Zahl, die als AggregateRating im JSON-LD steht.
 */
export const SALON_REVIEW_TYPE = 'customer_to_salon'

/**
 * Gehoert die Zeile zur oeffentlichen Salon-Bewertung?
 *
 * `null` zaehlt bewusst mit: Zeilen aus der Zeit vor der Typ-Spalte und alle,
 * die `createReview` bis 2026-08-27 ohne Typ geschrieben hat, sind
 * Kundenbewertungen. Sie jetzt auszublenden waere Datenverlust in der
 * Anzeige. Miet-Bewertungen setzen ihren Typ dagegen immer explizit.
 */
export function isSalonReview(row: { review_type?: string | null }): boolean {
  return row.review_type == null || row.review_type === SALON_REVIEW_TYPE
}

/**
 * Darf `customerId` diesen Salon (ggf. zu dieser Buchung) bewerten?
 *
 * Die Buchungspruefung hatte bis 2026-08-27 zwei Loecher: sie hat die
 * Buchung geladen, aber weder geprueft, WEM sie gehoert, noch ZU WELCHEM
 * Salon sie zaehlt. Eine fremde abgeschlossene Buchungs-ID genuegte damit,
 * um im Namen einer anderen Person zu bewerten (die IDs stehen in jeder
 * eigenen Buchungsliste), und eine eigene Buchung bei Salon A liess sich als
 * Beleg fuer eine Bewertung von Salon B verwenden.
 */
export async function checkEligibility(
  customerId: string,
  salonId: string,
  bookingId?: string,
): Promise<{ eligible: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin()

  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, customer_id, salon_id, status')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return { eligible: false, reason: 'Buchung nicht gefunden.' }
    }

    // Die Buchung muss dem Bewertenden gehoeren. Gleiche Fehlermeldung wie
    // bei "nicht gefunden" — sonst wird die Antwort zum Orakel dafuer,
    // welche fremden Buchungs-IDs existieren.
    if (booking.customer_id !== customerId) {
      return { eligible: false, reason: 'Buchung nicht gefunden.' }
    }

    // ... und zu dem Salon gehoeren, der bewertet wird.
    if (booking.salon_id !== salonId) {
      return { eligible: false, reason: 'Die Buchung gehört nicht zu diesem Salon.' }
    }

    if (booking.status !== 'completed') {
      return { eligible: false, reason: 'Bewertung nur nach abgeschlossener Buchung möglich.' }
    }

    // Check if review already exists for this booking
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .limit(1)

    if (existing && existing.length > 0) {
      return { eligible: false, reason: 'Bereits bewertet.' }
    }

    return { eligible: true }
  }

  // Ohne Buchungsbezug: eine Bewertung pro Person und Salon. Vorher war der
  // Pfad voellig ungedeckelt — dieselbe Person konnte denselben Salon
  // beliebig oft bewerten und den Schnitt in jede Richtung ziehen.
  const { data: freeReviews } = await supabase
    .from('reviews')
    .select('id, review_type, booking_id')
    .eq('customer_id', customerId)
    .eq('salon_id', salonId)

  const alreadyReviewed = (freeReviews || []).some(
    r => isSalonReview(r) && r.booking_id == null,
  )
  if (alreadyReviewed) {
    return { eligible: false, reason: 'Du hast diesen Salon bereits bewertet.' }
  }

  return { eligible: true }
}

/** Alle oeffentlichen Kundenbewertungen eines Salons (ohne Miet-Bewertungen). */
async function salonReviewRatings(salonId: string): Promise<number[]> {
  const supabase = getSupabaseAdmin()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating, review_type')
    .eq('salon_id', salonId)

  return (reviews || [])
    .filter(isSalonReview)
    .map(r => Number(r.rating))
    .filter(n => Number.isFinite(n))
}

export async function updateSalonRating(salonId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  const ratings = await salonReviewRatings(salonId)
  const count = ratings.length
  const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0

  await supabase
    .from('salons')
    .update({
      avg_rating: avg,
      review_count: count,
    })
    .eq('id', salonId)
}

export async function getAggregateRatings(salonId: string): Promise<AggregateRatings> {
  const ratings = await salonReviewRatings(salonId)
  const count = ratings.length
  const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0

  return {
    avgRating: avg,
    reviewCount: count,
  }
}
