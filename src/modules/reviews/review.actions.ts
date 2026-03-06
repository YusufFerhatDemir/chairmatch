'use server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createReviewSchema, replySchema } from './review.schemas'
import { checkEligibility, updateSalonRating } from './review.service'
import { getServerSession } from '@/modules/auth/session'

export async function createReview(input: unknown) {
  const parsed = createReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const session = await getServerSession()
  const customerId = session?.user?.id
  if (!customerId) {
    return { error: 'Nicht authentifiziert.' }
  }

  // Check eligibility
  if (data.bookingId) {
    const eligibility = await checkEligibility(
      customerId,
      data.salonId,
      data.bookingId,
    )
    if (!eligibility.eligible) {
      return { error: eligibility.reason }
    }
  }

  const supabase = getSupabaseAdmin()

  // Step 1: Create review
  const { data: newReview, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      customer_id: customerId,
      salon_id: data.salonId,
      booking_id: data.bookingId || null,
      rating: data.rating,
      comment: data.comment || null,
    })
    .select()
    .single()

  if (reviewError || !newReview) {
    return { error: 'Bewertung konnte nicht erstellt werden.' }
  }

  // Step 2: Audit log (best effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id: customerId,
      action: 'REVIEW_CREATED',
      entity: 'review',
      entity_id: newReview.id,
      details: {
        salonId: data.salonId,
        rating: data.rating,
      },
    })
  } catch {
    console.error('Failed to create audit log')
  }

  // Update salon aggregate (outside transaction for performance)
  await updateSalonRating(data.salonId)

  return { success: true, reviewId: newReview.id }
}

export async function replyToReview(input: unknown) {
  const parsed = replySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { reviewId, reply } = parsed.data
  const session = await getServerSession()
  if (!session?.user) {
    return { error: 'Nicht authentifiziert.' }
  }

  const supabase = getSupabaseAdmin()

  const { data: review } = await supabase
    .from('reviews')
    .select(`
      *,
      salon:salons!inner(owner_id)
    `)
    .eq('id', reviewId)
    .single()

  if (!review) {
    return { error: 'Bewertung nicht gefunden.' }
  }

  // Only salon owner can reply
  if (review.salon.owner_id !== session.user.id) {
    return { error: 'Keine Berechtigung.' }
  }

  await supabase
    .from('reviews')
    .update({ reply, replied_at: new Date().toISOString() })
    .eq('id', reviewId)

  return { success: true }
}

export async function flagReview(reviewId: string) {
  const session = await getServerSession()
  if (!session?.user) {
    return { error: 'Nicht authentifiziert.' }
  }

  const supabase = getSupabaseAdmin()

  await supabase.from('audit_logs').insert({
    user_id: session.user.id,
    action: 'REVIEW_FLAGGED',
    entity: 'review',
    entity_id: reviewId,
  })

  return { success: true }
}

export async function getReviews(salonId: string) {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('reviews')
    .select(`
      *,
      customer:profiles!reviews_customer_id_fkey(full_name)
    `)
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })

  return data || []
}
