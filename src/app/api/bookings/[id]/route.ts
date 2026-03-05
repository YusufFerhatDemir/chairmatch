import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from '@/modules/auth/session'
import { confirmBooking, completeBooking, markNoShow } from '@/modules/booking/booking.actions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        salon: { select: { name: true, category: true, city: true } },
        service: { select: { name: true, durationMinutes: true, priceCents: true } },
        customer: { select: { fullName: true, email: true } },
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    return NextResponse.json(booking)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const { newStatus } = await request.json()

    let result
    switch (newStatus?.toLowerCase()) {
      case 'confirmed':
        result = await confirmBooking(id)
        break
      case 'completed':
        result = await completeBooking(id)
        break
      case 'no_show':
        result = await markNoShow(id)
        break
      default:
        return NextResponse.json({ error: 'Ungültiger Status' }, { status: 400 })
    }

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
