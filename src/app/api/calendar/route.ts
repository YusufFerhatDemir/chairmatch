import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { generateICS } from '@/lib/calendar'
import { getServerSession } from '@/modules/auth/session'
import { isUuid } from '@/lib/uuid'
import { attachmentDisposition } from '@/lib/content-disposition'

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
    // Ohne diese Pruefung ging eine Nicht-UUID in die Abfrage, PostgREST
    // antwortete 22P02, und `error || !booking` machte daraus "Buchung nicht
    // gefunden" — eine Falscheingabe war von einer fremden ID nicht zu
    // unterscheiden.
    if (!isUuid(bookingId)) {
      return NextResponse.json({ error: 'Ungültige bookingId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        booking_date,
        start_time,
        end_time,
        notes,
        salon:salons!inner(name, street, house_number, postal_code, city, owner_id),
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

    const role = (session.user as { role?: string }).role || ''
    const isCustomer = booking.customer_id === session.user.id
    const isSalonOwner = salon?.owner_id === session.user.id
    const isAdmin = ['admin', 'super_admin'].includes(role)

    if (!isCustomer && !isSalonOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
    }

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
    // `serviceName` schreibt der Anbieter (POST /api/provider/services, 2-120
    // Zeichen, sonst ohne Einschraenkung). Bis Track 19 ging der Name roh in
    // den Header: ein Anfuehrungszeichen brach aus dem `filename`-Wert aus,
    // ein Zeilenumbruch machte den Header ungueltig und den Download der
    // Kundin damit zu einem 500. attachmentDisposition() raeumt das auf.
    const filename = `chairmatch-${serviceName.replace(/\s+/g, '-').toLowerCase()}.ics`

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': attachmentDisposition(filename, 'chairmatch-termin.ics'),
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
