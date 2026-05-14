import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { AggregateRatings } from './review.types'
import type { ReviewType } from './review.schemas'

/**
 * Prüft ob ein User berechtigt ist, eine Bewertung abzugeben.
 *
 * Regeln:
 * - Booking muss existieren UND completed sein
 * - Reviewer muss legitime Rolle im Booking haben (Customer/Tenant/Provider)
 * - Keine Doppel-Bewertung (gleicher Reviewer + gleiches Booking + gleicher Typ)
 */
export async function checkEligibilityV2(
  reviewerId: string,
  bookingId: string,
  reviewType: ReviewType,
): Promise<{ eligible: boolean; reason?: string; revieweeUserId?: string; salonId?: string }> {
  const supabase = getSupabaseAdmin()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status, customer_id, tenant_id, provider_id, salon_id')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { eligible: false, reason: 'Buchung nicht gefunden.' }
  }

  if (booking.status !== 'completed') {
    return { eligible: false, reason: 'Bewertung nur nach abgeschlossener Buchung möglich.' }
  }

  // Role-Check + Reviewee bestimmen
  let revieweeUserId: string | undefined
  let salonId: string | undefined = booking.salon_id ?? undefined

  if (reviewType === 'customer_to_salon') {
    if (booking.customer_id !== reviewerId) {
      return { eligible: false, reason: 'Du warst nicht der Kunde dieser Buchung.' }
    }
    // reviewee ist der Salon-Owner — wir tracken zusätzlich über salon_id
  } else if (reviewType === 'tenant_to_provider') {
    if (booking.tenant_id !== reviewerId) {
      return { eligible: false, reason: 'Du warst nicht der Mieter dieser Buchung.' }
    }
    revieweeUserId = booking.provider_id ?? undefined
    if (!revieweeUserId) {
      return { eligible: false, reason: 'Provider-ID fehlt.' }
    }
  } else if (reviewType === 'provider_to_tenant') {
    if (booking.provider_id !== reviewerId) {
      return { eligible: false, reason: 'Du warst nicht der Anbieter dieser Buchung.' }
    }
    revieweeUserId = booking.tenant_id ?? undefined
    if (!revieweeUserId) {
      return { eligible: false, reason: 'Mieter-ID fehlt.' }
    }
  }

  // Doppel-Bewertung verhindern
  const { data: existing } = await supabase
    .from('reviews')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('reviewer_id', reviewerId)
    .eq('review_type', reviewType)
    .limit(1)

  if (existing && existing.length > 0) {
    return { eligible: false, reason: 'Du hast diese Buchung bereits bewertet.' }
  }

  return { eligible: true, revieweeUserId, salonId }
}

/**
 * Legacy: Eligibility-Check für customer_to_salon (Single-Sided-Reviews).
 * Bleibt aus Backward-Kompatibilität.
 */
export async function checkEligibility(
  _customerId: string,
  _salonId: string,
  bookingId?: string,
): Promise<{ eligible: boolean; reason?: string }> {
  const supabase = getSupabaseAdmin()

  if (bookingId) {
    const { data: booking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return { eligible: false, reason: 'Buchung nicht gefunden.' }
    }

    if (booking.status !== 'completed') {
      return { eligible: false, reason: 'Bewertung nur nach abgeschlossener Buchung möglich.' }
    }

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', bookingId)
      .limit(1)

    if (existing && existing.length > 0) {
      return { eligible: false, reason: 'Bereits bewertet.' }
    }
  }

  return { eligible: true }
}

export async function updateSalonRating(salonId: string): Promise<void> {
  const supabase = getSupabaseAdmin()

  // Fetch reviews and calculate aggregate in JS
  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('salon_id', salonId)

  const count = reviews?.length || 0
  const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0

  await supabase
    .from('salons')
    .update({
      avg_rating: avg,
      review_count: count,
    })
    .eq('id', salonId)
}

export async function getAggregateRatings(salonId: string): Promise<AggregateRatings> {
  const supabase = getSupabaseAdmin()

  const { data: reviews } = await supabase
    .from('reviews')
    .select('rating')
    .eq('salon_id', salonId)

  const count = reviews?.length || 0
  const avg = count > 0 ? reviews!.reduce((s, r) => s + r.rating, 0) / count : 0

  return {
    avgRating: avg,
    reviewCount: count,
  }
}
