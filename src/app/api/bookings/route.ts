import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createBooking, getBookings } from '@/modules/booking/booking.actions'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'
import { getIdempotentResponse, storeIdempotentResponse } from '@/lib/idempotency'

/**
 * Whitelist-basiertes Schema für Booking-POST.
 *
 * H2-Fix: Vorher wurde der gesamte Request-Body per Spread an createBooking
 * durchgeschleust — inkl. price_cents, status, customerId, was Manipulation
 * von Preis ("1 Cent") oder Status ("automatically confirmed") erlaubte.
 * Jetzt: Nur diese erlaubten Felder werden übernommen, alles andere wird
 * stillschweigend verworfen. customerId kommt AUSSCHLIESSLICH aus der
 * Session und kann nicht im Body überschrieben werden.
 */
const bookingPostSchema = z.object({
  salonId: z.string().uuid().optional().nullable(),
  serviceId: z.string().min(1),
  staffId: z.string().min(1).optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum muss YYYY-MM-DD sein'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Zeit muss HH:MM sein'),
  notes: z.string().max(1000).optional().nullable(),
  promoCode: z.string().max(40).regex(/^[A-Z0-9_-]*$/i).optional().nullable(),
  customerName: z.string().max(120).optional().nullable(),
  customerEmail: z.string().email().optional().nullable(),
  customerPhone: z.string().max(40).optional().nullable(),
  consentGiven: z.boolean().optional(),
})

export const POST = withApi(async (request: Request) => {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return apiError('Nicht authentifiziert', 401)
  }

  const raw = await (request as NextRequest).json().catch(() => null)
  if (!raw || typeof raw !== 'object') {
    return apiError('Ungültige Anfrage', 400)
  }

  const parsed = bookingPostSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return apiError(first?.message || 'Ungültige Eingabe', 400)
  }

  // Idempotency-Key: wenn vorhanden, gegen Cache-Tabelle prüfen
  const idempotencyKey = request.headers.get('x-idempotency-key') || ''
  if (idempotencyKey) {
    const cached = await getIdempotentResponse(idempotencyKey, session.user.id, 'booking')
    if (cached) {
      return NextResponse.json(cached.body, { status: cached.status })
    }
  }

  const result = await createBooking({
    ...parsed.data,
    customerId: session.user.id, // IMMUTABLE — aus Session, NICHT aus Body
  })

  if ('error' in result) {
    return apiError(result.error ?? 'Buchung konnte nicht erstellt werden', 400)
  }

  // Erfolgreichen Outcome cachen (fire-and-forget)
  if (idempotencyKey) {
    void storeIdempotentResponse(
      idempotencyKey,
      session.user.id,
      'booking',
      ('bookingId' in result && typeof result.bookingId === 'string') ? result.bookingId : null,
      201,
      result,
    )
  }

  return NextResponse.json(result, { status: 201 })
})

export const GET = withApi(async () => {
  const session = await getServerSession()
  if (!session?.user) {
    return apiError('Nicht authentifiziert', 401)
  }

  const bookings = await getBookings({ customerId: session.user.id })
  return NextResponse.json(bookings)
})
