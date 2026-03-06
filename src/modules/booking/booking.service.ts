import { getSupabaseAdmin } from '@/lib/supabase-server'
import { VALID_TRANSITIONS } from './booking.types'

/**
 * Check if a time slot conflicts with existing bookings.
 * Uses booking_date + start_time/end_time from the actual DB schema.
 */
export async function checkConflict(
  salonId: string,
  date: string,
  startTime: string,
  durationMinutes: number = 30
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('salon_id', salonId)
    .eq('booking_date', date)
    .in('status', ['confirmed', 'pending'])

  if (!existingBookings || existingBookings.length === 0) {
    return false
  }

  const [startH, startM] = startTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = startMinutes + durationMinutes

  for (const booking of existingBookings) {
    // start_time and end_time are time strings like "HH:MM:SS" in Supabase
    const bStartParts = String(booking.start_time).split(':').map(Number)
    const bEndParts = String(booking.end_time).split(':').map(Number)
    const bStart = bStartParts[0] * 60 + bStartParts[1]
    const bEnd = bEndParts[0] * 60 + bEndParts[1]

    if (startMinutes < bEnd && endMinutes > bStart) {
      return true // conflict
    }
  }

  return false
}

export async function snapshotPolicy(salonId: string) {
  const supabase = getSupabaseAdmin()

  const { data: policy } = await supabase
    .from('booking_policies')
    .select('*')
    .eq('salon_id', salonId)
    .single()

  return {
    depositPercent: policy?.deposit_percent ?? 0,
    cancellationHours: policy?.cancellation_hours ?? 24,
    noShowFeeCents: policy?.no_show_fee_cents ?? 0,
  }
}

export function validateTransition(
  currentStatus: string,
  newStatus: string,
  actor: 'customer' | 'provider' | 'system'
): boolean {
  return VALID_TRANSITIONS.some(
    t => t.from === currentStatus && t.to === newStatus && t.actor === actor
  )
}

export function calculatePrice(
  basePriceCents: number,
  promoDiscount: number,
  promoType: 'percent' | 'fixed' | null
): number {
  if (!promoType || promoDiscount <= 0) return basePriceCents

  if (promoType === 'percent') {
    return Math.round(basePriceCents * (1 - promoDiscount / 100))
  }
  return Math.max(0, basePriceCents - promoDiscount * 100)
}

export async function validatePromoCode(code: string): Promise<{
  valid: boolean
  discount: number
  type: 'percent' | 'fixed' | null
}> {
  const supabase = getSupabaseAdmin()

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!promo || !promo.is_active) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.max_uses !== null && (promo.used_count ?? 0) >= promo.max_uses) {
    return { valid: false, discount: 0, type: null }
  }

  return {
    valid: true,
    discount: Number(promo.discount),
    type: promo.type as 'percent' | 'fixed',
  }
}
