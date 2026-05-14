'use server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createReviewSchema, replySchema } from './review.schemas'
import { checkEligibilityV2, updateSalonRating } from './review.service'
import { getServerSession } from '@/modules/auth/session'
import { logger } from '@/lib/logger'

export async function createReview(input: unknown) {
  const parsed = createReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const session = await getServerSession()
  const reviewerId = session?.user?.id
  if (!reviewerId) {
    return { error: 'Nicht authentifiziert.' }
  }

  // Eligibility-Check (Booking existiert, completed, korrekte Rolle, kein Doppel-Review)
  const eligibility = await checkEligibilityV2(reviewerId, data.bookingId, data.reviewType)
  if (!eligibility.eligible) {
    return { error: eligibility.reason }
  }

  const supabase = getSupabaseAdmin()

  // Double-Blind: customer_to_salon ist sofort published, P2T/T2P sind draft
  const isImmediatelyPublished = data.reviewType === 'customer_to_salon'
  const targetSalonId = eligibility.salonId || data.salonId || null

  const { data: newReview, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      reviewer_id: reviewerId,
      reviewee_user_id: eligibility.revieweeUserId || null,
      review_type: data.reviewType,
      salon_id: targetSalonId,
      booking_id: data.bookingId,
      rating: data.rating,
      comment: data.comment || null,
      // Backward-Compat: customer_id für alte Queries
      customer_id: data.reviewType === 'customer_to_salon' ? reviewerId : null,
      published: isImmediatelyPublished,
      visible_at: isImmediatelyPublished ? new Date().toISOString() : null,
    })
    .select()
    .single()

  if (reviewError || !newReview) {
    return { error: 'Bewertung konnte nicht erstellt werden.' }
  }

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      user_id: reviewerId,
      action: 'review.created',
      entity_type: 'review',
      entity_id: newReview.id,
      metadata: {
        booking_id: data.bookingId,
        review_type: data.reviewType,
        rating: data.rating,
      },
    })
  } catch {
    logger.warn('reviews.audit_log_failed', {})
  }

  // Double-Blind-Trigger: prüft ob die Gegen-Seite schon bewertet hat
  if (data.reviewType === 'tenant_to_provider' || data.reviewType === 'provider_to_tenant') {
    try {
      await supabase.rpc('publish_review_pair', { p_booking_id: data.bookingId })
    } catch (e) {
      logger.warn('reviews.publish_pair_failed', { err: String(e) })
    }
  }

  // Salon-Aggregate aktualisieren (nur bei customer_to_salon — User-Aggregates kommen via Trigger)
  if (data.reviewType === 'customer_to_salon' && targetSalonId) {
    await updateSalonRating(targetSalonId)
  }

  return {
    success: true,
    reviewId: newReview.id,
    published: isImmediatelyPublished,
    note: isImmediatelyPublished
      ? undefined
      : 'Deine Bewertung wird sichtbar, sobald auch die andere Seite bewertet hat (oder nach 14 Tagen).',
  }
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

  // Nur published Reviews für Salon-Detail-Page anzeigen
  // (customer_to_salon ist sofort published, tenant_to_provider erst nach Double-Blind)
  const { data } = await supabase
    .from('reviews')
    .select(`
      *,
      customer:profiles!reviews_customer_id_fkey(full_name)
    `)
    .eq('salon_id', salonId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  return data || []
}

/**
 * Bewertungen für einen User abrufen (als Mieter ODER als Anbieter).
 * Nur published Reviews — Drafts bleiben privat bis zur Freischaltung.
 */
export async function getUserReviews(userId: string, type?: 'tenant_to_provider' | 'provider_to_tenant') {
  const supabase = getSupabaseAdmin()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('reviews')
    .select(`
      id, rating, comment, review_type, created_at, visible_at,
      reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)
    `)
    .eq('reviewee_user_id', userId)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (type) q = q.eq('review_type', type)

  const { data } = await q
  return (data || []) as Array<{
    id: string
    rating: number
    comment: string | null
    review_type: string
    created_at: string
    visible_at: string | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reviewer?: any
  }>
}

/**
 * Pending Reviews — Bookings die der User noch bewerten könnte/sollte.
 * Zeigt im Dashboard "Du hast 2 offene Bewertungen!"
 */
export async function getPendingReviews(userId: string) {
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Bookings, in denen der User involviert war und die completed sind in letzten 14 Tagen
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, customer_id, tenant_id, provider_id, salon_id, end_at, updated_at')
    .eq('status', 'completed')
    .gte('updated_at', since)
    .or(`customer_id.eq.${userId},tenant_id.eq.${userId},provider_id.eq.${userId}`)
    .limit(50)

  if (!bookings || bookings.length === 0) return []

  // Welche Bookings hat der User schon bewertet?
  const bookingIds = bookings.map((b) => b.id)
  const { data: myReviews } = await supabase
    .from('reviews')
    .select('booking_id, review_type')
    .eq('reviewer_id', userId)
    .in('booking_id', bookingIds)

  const reviewedSet = new Set(
    (myReviews || []).map((r) => `${r.booking_id}:${r.review_type}`)
  )

  // Pro Booking: welche Rolle hat User → welcher Review-Type ist offen?
  const pending: Array<{ bookingId: string; reviewType: string }> = []
  for (const b of bookings) {
    if (b.customer_id === userId && !reviewedSet.has(`${b.id}:customer_to_salon`)) {
      pending.push({ bookingId: b.id, reviewType: 'customer_to_salon' })
    }
    if (b.tenant_id === userId && !reviewedSet.has(`${b.id}:tenant_to_provider`)) {
      pending.push({ bookingId: b.id, reviewType: 'tenant_to_provider' })
    }
    if (b.provider_id === userId && !reviewedSet.has(`${b.id}:provider_to_tenant`)) {
      pending.push({ bookingId: b.id, reviewType: 'provider_to_tenant' })
    }
  }
  return pending
}
