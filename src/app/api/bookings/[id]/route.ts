import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { confirmBooking, completeBooking, markNoShow } from '@/modules/booking/booking.actions'
import { createNotification } from '@/lib/notifications'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })
    const supabase = getSupabaseAdmin()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        salon:salons!inner(name, category, city, owner_id),
        service:services!inner(name, duration_minutes, price_cents),
        customer:profiles!bookings_customer_id_fkey(full_name, email)
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })
    }

    // Only allow booking owner, salon owner, or admin to view
    const role = (session.user as { role?: string }).role || ''
    const isCustomer = booking.customer_id === session.user.id
    const isSalonOwner = (booking.salon as { owner_id?: string })?.owner_id === session.user.id
    const isAdmin = ['admin', 'super_admin'].includes(role)

    if (!isCustomer && !isSalonOwner && !isAdmin) {
      return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 })
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
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })

    // Verify the user is salon owner or admin before allowing status changes
    const supabase = getSupabaseAdmin()
    const { data: booking } = await supabase
      .from('bookings')
      .select('salon_id, customer_id, booking_date, start_time, salons!inner(owner_id)')
      .eq('id', id)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    const role = (session.user as { role?: string }).role || ''
    const isSalonOwner = (booking.salons as { owner_id?: string })?.owner_id === session.user.id
    const isAdmin = ['admin', 'super_admin'].includes(role)

    if (!isSalonOwner && !isAdmin) {
      return NextResponse.json({ error: 'Nur Saloninhaber oder Admins können den Status ändern' }, { status: 403 })
    }

    const body = await request.json()
    const newStatus = body.newStatus || body.status

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
      const status = (result as { status?: number }).status ?? 400
      return NextResponse.json({ error: result.error }, { status })
    }

    // Statuswechsel ist fuer den Kunden die eigentliche Nachricht — bisher
    // erfuhr er davon nur, wenn er die Terminliste zufaellig neu lud.
    const statusLabels: Record<string, string> = {
      confirmed: 'Termin bestaetigt',
      completed: 'Termin abgeschlossen',
      no_show: 'Termin als nicht wahrgenommen markiert',
    }
    const label = statusLabels[String(newStatus).toLowerCase()]
    if (label && booking.customer_id) {
      await createNotification(
        booking.customer_id as string,
        label,
        `Dein Termin am ${booking.booking_date ?? ''} ${booking.start_time ?? ''} wurde aktualisiert: ${label}.`,
        'booking',
        id,
        'booking',
      )
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
