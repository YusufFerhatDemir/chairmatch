import { NextRequest, NextResponse } from 'next/server'
import { createBooking, getBookings } from '@/modules/booking/booking.actions'
import { getServerSession } from '@/modules/auth/session'
import { withApi, apiError } from '@/lib/api-wrapper'

export const POST = withApi(async (request: Request) => {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return apiError('Nicht authentifiziert', 401)
  }

  const body = await (request as NextRequest).json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return apiError('Ungültige Anfrage', 400)
  }

  const result = await createBooking({ ...body, customerId: session.user.id })

  if ('error' in result) {
    return apiError(result.error, 400)
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
