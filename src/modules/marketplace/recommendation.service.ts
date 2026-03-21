import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Create a product recommendation after booking */
export async function createRecommendation(params: {
  bookingId: string
  salonId: string
  staffId?: string
  productId: string
  customerId: string
  message?: string
}) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('product_recommendations')
    .insert({
      booking_id: params.bookingId,
      salon_id: params.salonId,
      staff_id: params.staffId || null,
      product_id: params.productId,
      customer_id: params.customerId,
      message: params.message || null,
    })
    .select('*, products(name, slug, price_cents, images)')
    .single()
  return { data, error }
}

/** Get unviewed recommendations for a customer */
export async function getRecommendationsForCustomer(customerId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('product_recommendations')
    .select('*, products(id, name, slug, price_cents, images, brand), staff(name, title)')
    .eq('customer_id', customerId)
    .eq('is_viewed', false)
    .order('created_at', { ascending: false })
    .limit(10)
  return data || []
}

/** Mark recommendation as viewed */
export async function markRecommendationViewed(recommendationId: string, customerId: string) {
  const supabase = getSupabaseAdmin()
  return supabase
    .from('product_recommendations')
    .update({ is_viewed: true })
    .eq('id', recommendationId)
    .eq('customer_id', customerId)
}

/** Get recommendation stats for a salon */
export async function getRecommendationStats(salonId: string) {
  const supabase = getSupabaseAdmin()
  const { data: all } = await supabase
    .from('product_recommendations')
    .select('id, is_purchased, is_viewed')
    .eq('salon_id', salonId)

  if (!all) return { total: 0, viewed: 0, purchased: 0, conversionRate: 0 }

  const total = all.length
  const viewed = all.filter(r => r.is_viewed).length
  const purchased = all.filter(r => r.is_purchased).length
  return {
    total,
    viewed,
    purchased,
    conversionRate: total > 0 ? Math.round((purchased / total) * 100) : 0,
  }
}
