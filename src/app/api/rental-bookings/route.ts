import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createRentalCheckout } from '@/lib/stripe'
import { createNotification } from '@/lib/notifications'
import { appOriginFromRequest } from '@/lib/app-origin'
import { SALON_SUSPENDED_MESSAGE, salonAcceptsBusiness } from '@/lib/salon-status'
import { berlinToday } from '@/lib/berlin-time'
import { inclusiveDayCount, isCalendarDate } from '@/lib/iso-date'
import { stripeUnavailable } from '@/lib/stripe-availability'

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

/**
 * Anzahl Miettage (inklusive Start- und Endtag).
 *
 * Seit Track 22 in src/lib/iso-date.ts, weil die Rechnung hier NaN liefern
 * konnte und NaN an beiden Riegeln darunter vorbeigekommen ist. Siehe dort.
 */
const rentalDays = inclusiveDayCount

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
    // Der Fehlerpfad weiter unten legt die Buchung an, merkt beim Checkout,
    // dass Stripe fehlt, und loescht sie wieder (502). Das Ergebnis stimmt,
    // der Weg dahin ist unnoetig: ist gar kein Schluessel gesetzt, steht das
    // schon hier fest — dann entsteht erst gar keine Zeile.
    const nichtVerfuegbar = stripeUnavailable()
    if (nichtVerfuegbar) return nichtVerfuegbar

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

    // Die Zod-Regex prueft die FORM, nicht den Tag: `2026-02-30` und
    // `2026-13-45` kommen bis hierher durch. Siehe src/lib/iso-date.ts.
    if (!isCalendarDate(startDate) || !isCalendarDate(endDate)) {
      return NextResponse.json({ error: 'Ungültiges Datum' }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: 'endDate liegt vor startDate' }, { status: 400 })
    }
    const today = berlinToday()
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
      .select('id, salon_id, type, name, price_per_day_cents, price_per_month_cents, is_available, salons(name, owner_id, is_active)')
      .eq('id', equipmentId)
      .single()

    if (eqError || !equipment) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (!equipment.is_available) {
      return NextResponse.json({ error: 'Mietobjekt ist nicht verfügbar' }, { status: 409 })
    }

    const salon = (equipment as {
      salons?: { name?: string; owner_id?: string; is_active?: boolean | null } | null
    }).salons

    // Der Salon hinter dem Mietobjekt wurde bis Track 15 nur nach Name und
    // Inhaber gefragt, nie nach seinem Zustand. Ein gesperrter Anbieter
    // (is_active = false) bekam hier weiterhin eine Stripe-Checkout-Session:
    // das Geld wurde eingezogen, der Webhook bestaetigte die Buchung, und der
    // Payout-Cron ueberwies es beim Mietbeginn an genau den Anbieter, den die
    // Plattform angehalten hatte. Siehe src/lib/salon-status.ts.
    if (!salonAcceptsBusiness(salon)) {
      return NextResponse.json({ error: SALON_SUSPENDED_MESSAGE }, { status: 409 })
    }

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
    const origin = appOriginFromRequest(req)
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

      // Merkposten fuer den Mieter: bricht er den Checkout ab, findet er die
      // offene Buchung ueber die Benachrichtigung wieder.
      await createNotification(
        session.user.id,
        'Mietbuchung reserviert',
        `${equipment.name} vom ${startDate} bis ${endDate} \u2014 Zahlung offen (${(totalCents / 100).toFixed(2)} \u20AC).`,
        'booking',
        booking.id,
        'rental_booking',
      )

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
