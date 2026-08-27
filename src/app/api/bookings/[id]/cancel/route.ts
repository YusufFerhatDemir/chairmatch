import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/modules/booking/booking.actions'
import { getServerSession } from '@/modules/auth/session'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const result = await cancelBooking({ bookingId: id, reason: body.reason })

    if ('error' in result) {
      // Die Action liefert 401/403 mit, wenn der Aufrufer weder Kunde noch
      // Saloninhaber/Admin dieser Buchung ist. Ohne diese Weitergabe wuerde
      // eine Berechtigungsverweigerung als 400 "Bad Request" erscheinen.
      const status = (result as { status?: number }).status ?? 400
      return NextResponse.json({ error: result.error }, { status })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
