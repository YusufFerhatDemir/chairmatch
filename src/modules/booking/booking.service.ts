import { prisma } from '@/lib/prisma'
import { VALID_TRANSITIONS } from './booking.types'

/**
 * Check if a time slot conflicts with existing bookings.
 * Uses bookingDate + startTime/endTime from the actual DB schema.
 */
export async function checkConflict(
  salonId: string,
  date: string,
  startTime: string,
  durationMinutes: number = 30
): Promise<boolean> {
  const existingBookings = await prisma.booking.findMany({
    where: {
      salonId,
      bookingDate: new Date(date),
      status: { in: ['confirmed', 'pending'] },
    },
  })

  const [startH, startM] = startTime.split(':').map(Number)
  const startMinutes = startH * 60 + startM
  const endMinutes = startMinutes + durationMinutes

  for (const booking of existingBookings) {
    // Extract hours/minutes from the Time field
    const bStart = booking.startTime.getUTCHours() * 60 + booking.startTime.getUTCMinutes()
    const bEnd = booking.endTime.getUTCHours() * 60 + booking.endTime.getUTCMinutes()

    if (startMinutes < bEnd && endMinutes > bStart) {
      return true // conflict
    }
  }

  return false
}

export async function snapshotPolicy(salonId: string) {
  const policy = await prisma.bookingPolicy.findUnique({
    where: { salonId },
  })

  return {
    depositPercent: policy?.depositPercent ?? 0,
    cancellationHours: policy?.cancellationHours ?? 24,
    noShowFeeCents: policy?.noShowFeeCents ?? 0,
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
  const promo = await prisma.promoCode.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!promo || !promo.isActive) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.maxUses !== null && (promo.usedCount ?? 0) >= promo.maxUses) {
    return { valid: false, discount: 0, type: null }
  }

  return {
    valid: true,
    discount: Number(promo.discount),
    type: promo.type as 'percent' | 'fixed',
  }
}
