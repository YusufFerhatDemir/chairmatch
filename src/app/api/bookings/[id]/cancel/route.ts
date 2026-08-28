import { NextRequest, NextResponse } from 'next/server'
import { cancelBooking } from '@/modules/booking/booking.actions'
import { getServerSession } from '@/modules/auth/session'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

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
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })

    const body = await request.json().catch(() => ({}))
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : body.reason
    const result = await cancelBooking({ bookingId: id, reason })

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
