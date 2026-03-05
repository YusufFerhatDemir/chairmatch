import { prisma } from '@/lib/prisma'
import type { AggregateRatings } from './review.types'

export async function checkEligibility(
  customerId: string,
  salonId: string,
  bookingId?: string,
): Promise<{ eligible: boolean; reason?: string }> {
  if (bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    })

    if (!booking) {
      return { eligible: false, reason: 'Buchung nicht gefunden.' }
    }

    if (booking.status !== 'completed') {
      return { eligible: false, reason: 'Bewertung nur nach abgeschlossener Buchung möglich.' }
    }

    // Check if review already exists for this booking
    const existing = await prisma.review.findFirst({
      where: { bookingId },
    })

    if (existing) {
      return { eligible: false, reason: 'Bereits bewertet.' }
    }
  }

  return { eligible: true }
}

export async function updateSalonRating(salonId: string): Promise<void> {
  const stats = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
    _count: true,
  })

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      avgRating: stats._avg.rating || 0,
      reviewCount: stats._count,
    },
  })
}

export async function getAggregateRatings(salonId: string): Promise<AggregateRatings> {
  const stats = await prisma.review.aggregate({
    where: { salonId },
    _avg: { rating: true },
    _count: true,
  })

  return {
    avgRating: stats._avg.rating || 0,
    reviewCount: stats._count,
  }
}
