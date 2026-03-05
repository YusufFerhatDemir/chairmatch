'use server'

import { prisma } from '@/lib/prisma'
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

  const review = await prisma.$transaction(async (tx) => {
    const newReview = await tx.review.create({
      data: {
        customerId: customerId,
        salonId: data.salonId,
        bookingId: data.bookingId || null,
        rating: data.rating,
        comment: data.comment || null,
      },
    })

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: 'REVIEW_CREATED',
        entity: 'review',
        entityId: newReview.id,
        details: {
          salonId: data.salonId,
          rating: data.rating,
        },
      },
    })

    return newReview
  })

  // Update salon aggregate (outside transaction for performance)
  await updateSalonRating(data.salonId)

  return { success: true, reviewId: review.id }
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

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { salon: { select: { ownerId: true } } },
  })

  if (!review) {
    return { error: 'Bewertung nicht gefunden.' }
  }

  // Only salon owner can reply
  if (review.salon.ownerId !== session.user.id) {
    return { error: 'Keine Berechtigung.' }
  }

  await prisma.review.update({
    where: { id: reviewId },
    data: { reply, repliedAt: new Date() },
  })

  return { success: true }
}

export async function flagReview(reviewId: string) {
  const session = await getServerSession()
  if (!session?.user) {
    return { error: 'Nicht authentifiziert.' }
  }

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: 'REVIEW_FLAGGED',
      entity: 'review',
      entityId: reviewId,
    },
  })

  return { success: true }
}

export async function getReviews(salonId: string) {
  return prisma.review.findMany({
    where: { salonId },
    include: {
      customer: { select: { fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
