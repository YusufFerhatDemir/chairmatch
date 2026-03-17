import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateICS } from '@/lib/calendar'
import { getServerSession } from '@/modules/auth/session'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const bookingId = searchParams.get('bookingId')

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId ist erforderlich' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        end_time,
        notes,
        salon:salons!inner(name, street, house_number, postal_code, city),
        service:services!inner(name)
      `)
      .eq('id', bookingId)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    // Normalize joined relations — Supabase may return an array for !inner joins
    const salon = Array.isArray(booking.salon) ? booking.salon[0] : booking.salon
    const service = Array.isArray(booking.service) ? booking.service[0] : booking.service

    const calendarBooking = {
      id: booking.id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      end_time: booking.end_time,
      notes: booking.notes,
      salon: salon ?? null,
      service: service ?? null,
    }

    const icsContent = generateICS(calendarBooking)
    const serviceName = service?.name || 'Termin'
    const filename = `chairmatch-${serviceName.replace(/\s+/g, '-').toLowerCase()}.ics`

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
