import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  createRecommendation,
  getRecommendationsForCustomer,
  markRecommendationViewed,
} from '@/modules/marketplace/recommendation.service'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const createSchema = z.object({
  bookingId: z.string().regex(UUID),
  productId: z.string().regex(UUID),
  staffId: z.string().regex(UUID).optional(),
  message: z.string().max(500).optional(),
})

const viewSchema = z.object({
  action: z.literal('view'),
  recommendationId: z.string().regex(UUID),
})

/** Get unviewed recommendations for current user */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const recs = await getRecommendationsForCustomer(session.user.id)
    return NextResponse.json(recs)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Create recommendation (provider) or mark as viewed (customer) */
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

    // Mark as viewed
    const viewParsed = viewSchema.safeParse(body)
    if (viewParsed.success) {
      await markRecommendationViewed(viewParsed.data.recommendationId, session.user.id)
      return NextResponse.json({ success: true })
    }

    // Create recommendation (provider only)
    const role = (session.user as { role?: string }).role
    if (role !== 'anbieter' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Nur für Anbieter' }, { status: 403 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    }

    const { bookingId, productId, staffId, message } = parsed.data
    const supabase = getSupabaseAdmin()

    // Booking laden, Inhaber pruefen, Kunden ableiten.
    // customerId kommt NICHT aus dem Request — wer die Empfehlung anlegt
    // bestimmt nicht, an wen sie geht. Das steht in der Buchung.
    //
    // TRACK 21: hier stand `user_id`. Diese Spalte gibt es in `bookings` live
    // nicht (Spaltensonde, siehe src/test/live-schema.ts) — sie heisst
    // `customer_id`. PostgREST beantwortet eine unbekannte Spalte mit 42703,
    // und der Fehler landete unten in `bookingErr`. Jeder Aufruf, auch der
    // vollkommen richtige des Saloninhabers, bekam damit „Buchung nicht
    // gefunden" (404): das Anlegen einer Empfehlung war seit jeher
    // unmoeglich, und die Fehlermeldung zeigte in die falsche Richtung. Die
    // Autorisierungspruefung darunter ist deshalb nie gelaufen — was diese
    // Route betrifft, war Track 17 ungetestete Theorie.
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, customer_id, salon_id, salons!inner(owner_id)')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr) {
      console.error('recommendations: Buchung nicht lesbar:', bookingErr.code, bookingErr.message)
      return NextResponse.json({ error: 'Buchung konnte nicht geladen werden' }, { status: 500 })
    }
    if (!booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    }

    const salon = booking.salons as unknown as { owner_id: string } | null
    if (salon?.owner_id !== session.user.id && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Keine Berechtigung für diesen Salon' }, { status: 403 })
    }

    const customerId = (booking as { customer_id?: string | null }).customer_id
    if (!customerId) {
      return NextResponse.json({ error: 'Buchung ohne Kunden' }, { status: 409 })
    }

    /**
     * Der Mitarbeitende muss zum Salon DIESER Buchung gehoeren — Track 21.
     *
     * `staffId` kam aus dem Request und ging ungeprueft in
     * `product_recommendations.staff_id`. Gelesen wird die Spalte in
     * `getRecommendationsForCustomer` als Einbettung `staff(name, title)`:
     * ein Anbieter konnte damit Name und Funktion einer Person aus einem
     * FREMDEN Salon in eine Empfehlung schreiben, die seiner eigenen Kundin
     * angezeigt wird. Dieselbe Luecke wie `bookings.staff_id`, siehe
     * src/modules/booking/booking.actions.ts.
     */
    if (staffId) {
      const { data: staff, error: staffErr } = await supabase
        .from('staff')
        .select('id, salon_id, is_active')
        .eq('id', staffId)
        .maybeSingle()

      if (staffErr) {
        console.error('recommendations: staff nicht lesbar:', staffErr.code, staffErr.message)
        return NextResponse.json({ error: 'Mitarbeiter konnte nicht geprüft werden' }, { status: 500 })
      }
      if (!staff || staff.salon_id !== booking.salon_id || staff.is_active === false) {
        return NextResponse.json(
          { error: 'Der Mitarbeiter gehört nicht zu diesem Salon' },
          { status: 400 },
        )
      }
    }

    /**
     * Das Produkt muss es geben und lieferbar sein.
     *
     * Bewusst KEINE Eingrenzung auf den eigenen Salon: der Shop ist eine
     * gemeinsame Flaeche, und ob ein Anbieter nur eigene Ware empfehlen darf,
     * ist eine Produktentscheidung. Was hier fehlte, ist die
     * Datenintegritaet: eine erfundene ID lief in 23503 und kam als 500
     * zurueck, eine ausgelistete fuehrte zu einer Empfehlung, die ins Leere
     * zeigt.
     */
    const { data: produkt, error: produktErr } = await supabase
      .from('products')
      .select('id, is_active')
      .eq('id', productId)
      .maybeSingle()

    if (produktErr) {
      console.error('recommendations: Produkt nicht lesbar:', produktErr.code, produktErr.message)
      return NextResponse.json({ error: 'Produkt konnte nicht geprüft werden' }, { status: 500 })
    }
    if (!produkt || produkt.is_active === false) {
      return NextResponse.json({ error: 'Produkt nicht verfügbar' }, { status: 400 })
    }

    const { data, error } = await createRecommendation({
      bookingId,
      salonId: booking.salon_id,
      staffId,
      productId,
      customerId,
      message,
    })

    if (error) return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
