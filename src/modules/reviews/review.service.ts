import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { AggregateRatings } from './review.types'

export async function checkEligibility(
  customerId: string,
  salonId: string,
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

    // Check if review already exists for this booking
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
