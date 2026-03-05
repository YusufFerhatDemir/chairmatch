'use server'

import { prisma } from '@/lib/prisma'
import { createBookingSchema, cancelBookingSchema } from './booking.schemas'
import { checkConflict, snapshotPolicy, validateTransition, validatePromoCode, calculatePrice } from './booking.service'
import { getServerSession } from '@/modules/auth/session'

export async function createBooking(input: unknown) {
  const parsed = createBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const session = await getServerSession()
  const customerId = session?.user?.id
  if (!customerId) {
    return { error: 'Nicht authentifiziert. Bitte melden Sie sich an.' }
  }

  // Load service to get duration and price
  const service = await prisma.service.findUnique({
    where: { id: data.serviceId },
  })
  if (!service) {
    return { error: 'Dienstleistung nicht gefunden.' }
  }

  // Check for slot conflict
  const hasConflict = await checkConflict(
    data.salonId,
    data.date,
    data.startTime,
    service.durationMinutes
  )
  if (hasConflict) {
    return { error: 'Dieser Zeitslot ist bereits belegt.' }
  }

  // Snapshot policy
  const policy = await snapshotPolicy(data.salonId)

  // Validate promo code
  let finalPriceCents = service.priceCents
  if (data.promoCode) {
    const promo = await validatePromoCode(data.promoCode)
    if (promo.valid) {
      finalPriceCents = calculatePrice(service.priceCents, promo.discount, promo.type)
    }
  }

  // Calculate end time from start time + duration
  const [startH, startM] = data.startTime.split(':').map(Number)
  const endMinutes = startH * 60 + startM + service.durationMinutes
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

  // Transaction: create booking + update promo usage + audit log
  const booking = await prisma.$transaction(async (tx) => {
    const newBooking = await tx.booking.create({
      data: {
        customerId,
        salonId: data.salonId,
        serviceId: data.serviceId,
        staffId: data.staffId || null,
        bookingDate: new Date(data.date),
        startTime: new Date(`1970-01-01T${data.startTime}:00Z`),
        endTime: new Date(`1970-01-01T${endTimeStr}:00Z`),
        status: 'pending',
        priceCents: finalPriceCents,
        notes: data.notes || null,
      },
    })

    // Increment promo usage
    if (data.promoCode && finalPriceCents < service.priceCents) {
      await tx.promoCode.update({
        where: { code: data.promoCode.toUpperCase() },
        data: { usedCount: { increment: 1 } },
      })
    }

    // Audit log
    await tx.auditLog.create({
      data: {
        userId: customerId,
        action: 'BOOKING_CREATED',
        entity: 'booking',
        entityId: newBooking.id,
        details: {
          salonId: data.salonId,
          serviceId: data.serviceId,
          date: data.date,
          startTime: data.startTime,
          priceCents: finalPriceCents,
          policySnapshot: policy,
        },
      },
    })

    return newBooking
  })

  return { success: true, bookingId: booking.id }
}

export async function cancelBooking(input: unknown) {
  const parsed = cancelBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const session = await getServerSession()
  const { bookingId, reason } = parsed.data

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  })

  if (!booking) {
    return { error: 'Buchung nicht gefunden.' }
  }

  // Determine actor
  const isCustomer = session?.user?.id === booking.customerId
  const actor: 'customer' | 'provider' = isCustomer ? 'customer' : 'provider'

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'CANCELLED', actor)) {
    return { error: 'Stornierung nicht möglich.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancellationReason: reason || null,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: session?.user?.id || null,
        action: 'BOOKING_CANCELLED',
        entity: 'booking',
        entityId: bookingId,
        details: { reason, actor },
      },
    })
  })

  return { success: true }
}

export async function confirmBooking(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'CONFIRMED', 'provider')) {
    return { error: 'Bestätigung nicht möglich.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'confirmed' },
    })
    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: 'BOOKING_CONFIRMED',
        entity: 'booking',
        entityId: bookingId,
      },
    })
  })

  return { success: true }
}

export async function completeBooking(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'COMPLETED', 'provider')) {
    return { error: 'Abschluss nicht möglich.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'completed' },
    })
    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: 'BOOKING_COMPLETED',
        entity: 'booking',
        entityId: bookingId,
      },
    })
  })

  return { success: true }
}

export async function markNoShow(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } })
  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'NO_SHOW', 'provider')) {
    return { error: 'No-Show Markierung nicht möglich.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: 'no_show' },
    })
    await tx.auditLog.create({
      data: {
        userId: session.user!.id,
        action: 'BOOKING_NO_SHOW',
        entity: 'booking',
        entityId: bookingId,
      },
    })
  })

  return { success: true }
}

export async function getBookings(filters?: { customerId?: string; salonId?: string }) {
  return prisma.booking.findMany({
    where: {
      ...(filters?.customerId && { customerId: filters.customerId }),
      ...(filters?.salonId && { salonId: filters.salonId }),
    },
    include: {
      salon: { select: { name: true, category: true, city: true } },
      service: { select: { name: true, durationMinutes: true, priceCents: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}
