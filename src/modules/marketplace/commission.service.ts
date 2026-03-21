import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Get commission rate from DB or use default */
async function getRate(type: string): Promise<number> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('commission_rates')
    .select('rate_percent')
    .eq('type', type)
    .single()
  return data?.rate_percent || 10
}

/** Record a commission entry */
async function recordCommission(params: {
  type: string
  sourceType: string
  sourceId: string
  beneficiaryType: 'platform' | 'salon' | 'provider'
  beneficiaryId?: string
  ratePercent: number
  baseAmountCents: number
}) {
  const supabase = getSupabaseAdmin()
  const commissionCents = Math.round(params.baseAmountCents * params.ratePercent / 100)

  const { data, error } = await supabase
    .from('commissions')
    .insert({
      type: params.type,
      source_type: params.sourceType,
      source_id: params.sourceId,
      beneficiary_type: params.beneficiaryType,
      beneficiary_id: params.beneficiaryId || null,
      rate_percent: params.ratePercent,
      base_amount_cents: params.baseAmountCents,
      commission_cents: commissionCents,
    })
    .select()
    .single()

  return { data, error, commissionCents }
}

/** Check if customer is new to this salon */
export async function isNewCustomer(customerId: string, salonId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('customer_salon_history')
    .select('total_bookings')
    .eq('customer_id', customerId)
    .eq('salon_id', salonId)
    .single()
  return !data // No record = new customer
}

/** Record first visit in customer-salon history */
export async function recordFirstVisit(customerId: string, salonId: string, bookingId: string) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('customer_salon_history')
    .upsert({
      customer_id: customerId,
      salon_id: salonId,
      first_booking_id: bookingId,
      total_bookings: 1,
    }, { onConflict: 'customer_id,salon_id' })

  if (error) {
    // If already exists, increment
    try {
      await supabase.rpc('increment_salon_visits' as never, {
        p_customer_id: customerId,
        p_salon_id: salonId,
      })
    } catch {
      // Fallback: manual update
      await supabase
        .from('customer_salon_history')
        .update({ total_bookings: 2, last_booking_date: new Date().toISOString() })
        .eq('customer_id', customerId)
        .eq('salon_id', salonId)
    }
  }
}

/** Calculate rental commission (12-15%) */
export async function calculateRentalCommission(rentalBookingId: string) {
  const supabase = getSupabaseAdmin()
  const { data: rental } = await supabase
    .from('rental_bookings')
    .select('id, total_cents, equipment_id, rental_equipment(salon_id)')
    .eq('id', rentalBookingId)
    .single()

  if (!rental || !rental.total_cents) return null

  const rate = await getRate('rental')
  const equipment = rental.rental_equipment as unknown as { salon_id: string } | null

  return recordCommission({
    type: 'rental',
    sourceType: 'rental_booking',
    sourceId: rental.id,
    beneficiaryType: 'platform',
    ratePercent: rate,
    baseAmountCents: rental.total_cents,
  }).then(async (result) => {
    // Update rental booking with commission ID
    if (result.data) {
      await supabase
        .from('rental_bookings')
        .update({ commission_id: result.data.id })
        .eq('id', rentalBookingId)
    }
    return result
  })
}

/** Calculate new customer commission (15% on first booking) */
export async function calculateNewCustomerCommission(bookingId: string) {
  const supabase = getSupabaseAdmin()
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, customer_id, salon_id, price_cents')
    .eq('id', bookingId)
    .single()

  if (!booking) return null

  const isNew = await isNewCustomer(booking.customer_id, booking.salon_id)
  if (!isNew) return null

  const rate = await getRate('new_customer')

  // Record first visit
  await recordFirstVisit(booking.customer_id, booking.salon_id, booking.id)

  // Mark booking
  await supabase.from('bookings').update({ is_first_visit: true }).eq('id', bookingId)

  return recordCommission({
    type: 'new_customer',
    sourceType: 'booking',
    sourceId: booking.id,
    beneficiaryType: 'platform',
    ratePercent: rate,
    baseAmountCents: booking.price_cents,
  })
}

/** Calculate product recommendation commission (split: salon + platform) */
export async function calculateProductRecommendationCommission(orderItemId: string, recommendationId: string) {
  const supabase = getSupabaseAdmin()

  const { data: orderItem } = await supabase
    .from('order_items')
    .select('id, total_cents, seller_id')
    .eq('id', orderItemId)
    .single()

  if (!orderItem) return null

  const { data: rec } = await supabase
    .from('product_recommendations')
    .select('salon_id')
    .eq('id', recommendationId)
    .single()

  if (!rec) return null

  const salonRate = await getRate('product_recommendation_salon')
  const platformRate = await getRate('product_recommendation_platform')

  // Salon commission
  const salonResult = await recordCommission({
    type: 'product_recommendation',
    sourceType: 'recommendation',
    sourceId: recommendationId,
    beneficiaryType: 'salon',
    beneficiaryId: rec.salon_id,
    ratePercent: salonRate,
    baseAmountCents: orderItem.total_cents,
  })

  // Platform commission
  const platformResult = await recordCommission({
    type: 'product_recommendation',
    sourceType: 'order_item',
    sourceId: orderItem.id,
    beneficiaryType: 'platform',
    ratePercent: platformRate,
    baseAmountCents: orderItem.total_cents,
  })

  // Mark recommendation as purchased
  await supabase
    .from('product_recommendations')
    .update({ is_purchased: true, purchased_order_item_id: orderItemId })
    .eq('id', recommendationId)

  return { salon: salonResult, platform: platformResult }
}
