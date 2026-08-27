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
    return apiError(result.error ?? 'Buchung konnte nicht erstellt werden', 400)
  }

  return NextResponse.json(result, { status: 201 })
})

/**
 * Eigene Termine lesen.
 *
 * Ohne `salonId` sind das die Termine, die der Aufrufer als Kunde gebucht hat.
 * Mit `salonId` die Termine SEINES Salons — die Anbieter-Sicht.
 *
 * Die Berechtigung dafuer wird bewusst nicht hier geprueft, sondern in
 * `getBookings`: ein fremder `salonId` liefert dort eine leere Liste, weil die
 * Action den Eigentuemer gegen die Session haelt. Das ist die Stelle, die auch
 * ein direkter Server-Action-Aufruf durchlaufen muss — eine zweite Pruefung
 * hier waere die, die irgendwann auseinanderlaeuft.
 */
export const GET = withApi(async (request: Request) => {
  const session = await getServerSession()
  if (!session?.user) {
    return apiError('Nicht authentifiziert', 401)
  }

  const salonId = new URL(request.url).searchParams.get('salonId')

  const bookings = salonId
    ? await getBookings({ salonId })
    : await getBookings({ customerId: session.user.id })

  return NextResponse.json(bookings)
})
