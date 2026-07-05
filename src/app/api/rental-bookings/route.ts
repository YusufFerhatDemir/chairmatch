import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createRentalCheckout } from '@/lib/stripe'

/**
 * Rental-Bookings API — der fehlende End-to-End-Pfad für Stuhl-/Liegen-/Raum-Miete.
 *
 * POST: legt eine rental_booking an (pending/unpaid), prüft Datums-Overlap
 *       gegen bestehende Buchungen und erstellt direkt die Stripe-Checkout-Session.
 *       Preis wird IMMER server-seitig aus rental_equipment berechnet — der Client
 *       liefert nur equipmentId + Zeitraum.
 * GET:  listet eigene Buchungen (als Mieter) inkl. Equipment-/Salon-Basisdaten.
 *
 * Bezahlbestätigung läuft über den Stripe-Webhook (type 'rental_payment').
 */

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate: YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'endDate: YYYY-MM-DD'),
})

/** Anzahl Miettage (inklusive Start- und Endtag) */
function rentalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T12:00:00Z').getTime()
  const end = new Date(endDate + 'T12:00:00Z').getTime()
  return Math.round((end - start) / 86_400_000) + 1
}

/**
 * Server-seitige Preisberechnung:
 * volle 30-Tage-Blöcke zum Monatspreis (falls vorhanden & günstiger),
 * Rest zum Tagespreis.
 */
function computeTotalCents(
  days: number,
  pricePerDayCents: number,
  pricePerMonthCents: number | null,
): number {
  if (pricePerMonthCents && pricePerMonthCents < pricePerDayCents * 30) {
    const months = Math.floor(days / 30)
    const restDays = days % 30
    // Resttage nie teurer als ein weiterer Monatsblock
    const restCents = Math.min(restDays * pricePerDayCents, pricePerMonthCents)
    return months * pricePerMonthCents + restCents
  }
  return days * pricePerDayCents
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const { equipmentId, startDate, endDate } = parsed.data

    if (endDate < startDate) {
      return NextResponse.json({ error: 'endDate liegt vor startDate' }, { status: 400 })
    }
    const today = new Date().toISOString().slice(0, 10)
    if (startDate < today) {
      return NextResponse.json({ error: 'startDate liegt in der Vergangenheit' }, { status: 400 })
    }
    const days = rentalDays(startDate, endDate)
    if (days > 366) {
      return NextResponse.json({ error: 'Maximale Mietdauer: 12 Monate' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Equipment + Salon laden (Preisquelle + Anzeige)
    const { data: equipment, error: eqError } = await supabase
      .from('rental_equipment')
      .select('id, salon_id, type, name, price_per_day_cents, price_per_month_cents, is_available, salons(name, owner_id)')
      .eq('id', equipmentId)
      .single()

    if (eqError || !equipment) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (!equipment.is_available) {
      return NextResponse.json({ error: 'Mietobjekt ist nicht verfügbar' }, { status: 409 })
    }

    const salon = (equipment as { salons?: { name?: string; owner_id?: string } | null }).salons
    if (salon?.owner_id && salon.owner_id === session.user.id) {
      return NextResponse.json({ error: 'Eigenes Mietobjekt kann nicht gebucht werden' }, { status: 400 })
    }

    // Overlap-Check: bestehende aktive Buchungen im Zeitraum?
    // Overlap-Bedingung: existing.start <= new.end AND existing.end >= new.start
    const { data: conflicts, error: confError } = await supabase
      .from('rental_bookings')
      .select('id, start_date, end_date')
      .eq('equipment_id', equipmentId)
      .in('status', ['pending', 'confirmed', 'active'])
      .lte('start_date', endDate)
      .gte('end_date', startDate)
      .limit(1)

    if (confError) {
      console.error('rental-bookings overlap check failed:', confError)
      return NextResponse.json({ error: 'Verfügbarkeitsprüfung fehlgeschlagen' }, { status: 500 })
    }
    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Zeitraum ist bereits belegt', conflict: conflicts[0] },
        { status: 409 },
      )
    }

    const totalCents = computeTotalCents(
      days,
      equipment.price_per_day_cents,
      equipment.price_per_month_cents,
    )
    if (totalCents <= 0) {
      return NextResponse.json({ error: 'Ungültiger Mietpreis' }, { status: 422 })
    }

    // Buchung anlegen (pending/unpaid) — bestätigt wird erst nach Zahlung (Webhook)
    const { data: booking, error: insError } = await supabase
      .from('rental_bookings')
      .insert({
        equipment_id: equipmentId,
        renter_id: session.user.id,
        start_date: startDate,
        end_date: endDate,
        total_cents: totalCents,
        status: 'pending',
        payment_status: 'unpaid',
      })
      .select()
      .single()

    if (insError || !booking) {
      // 23P01 = exclusion_violation (rental_bookings_no_overlap): ein paralleler
      // Request hat denselben Zeitraum gerade gebucht — der DB-Constraint ist
      // die harte Wahrheit hinter dem (nicht-atomaren) SELECT-Check oben.
      if (insError?.code === '23P01') {
        return NextResponse.json({ error: 'Zeitraum ist bereits belegt' }, { status: 409 })
      }
      console.error('rental-bookings insert failed:', insError)
      return NextResponse.json({ error: 'Buchung konnte nicht angelegt werden' }, { status: 500 })
    }

    // Stripe-Checkout-Session direkt erstellen — One-Step-Flow für das Frontend
    const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
    try {
      const checkoutSession = await createRentalCheckout({
        rentalBookingId: booking.id,
        renterId: session.user.id,
        customerEmail: session.user.email || '',
        salonName: salon?.name || 'Salon',
        equipmentName: equipment.name,
        startDate,
        endDate,
        amountCents: totalCents,
        successUrl: `${origin}/rentals?payment=success&rental_id=${booking.id}`,
        cancelUrl: `${origin}/rentals?payment=cancelled&rental_id=${booking.id}`,
      })

      await supabase
        .from('rental_bookings')
        .update({ payment_status: 'pending', stripe_session_id: checkoutSession.id })
        .eq('id', booking.id)

      return NextResponse.json(
        { booking, checkoutUrl: checkoutSession.url, totalCents, days },
        { status: 201 },
      )
    } catch (stripeErr) {
      // Stripe nicht erreichbar/konfiguriert → Buchung zurückrollen, kein Zombie-Pending
      console.error('rental checkout session failed:', stripeErr)
      await supabase.from('rental_bookings').delete().eq('id', booking.id)
      return NextResponse.json(
        { error: 'Zahlung konnte nicht initialisiert werden. Bitte später erneut versuchen.' },
        { status: 502 },
      )
    }
  } catch (err) {
    console.error('rental-bookings POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('rental_bookings')
      .select('*, rental_equipment(name, type, salon_id, salons(name, city))')
      .eq('renter_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('rental-bookings GET failed:', error)
      return NextResponse.json({ error: 'Buchungen konnten nicht geladen werden' }, { status: 500 })
    }

    return NextResponse.json({ bookings: data ?? [] })
  } catch (err) {
    console.error('rental-bookings GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
