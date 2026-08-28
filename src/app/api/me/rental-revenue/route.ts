import { NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { RevenueBooking, RevenueEquipment } from '@/modules/rentals/rental-listing.types'

/**
 * Echte Miet-Einnahmen des eingeloggten Vermieters — GET /api/me/rental-revenue
 *
 * Warum serverseitig: /vermieter/mein-inserat/umsatz hat die Zahlen bis
 * 2026-08-27 im Browser geholt und dafuer `supabase.auth.getSession()`
 * benutzt. Angemeldet wird bei ChairMatch aber ueber NextAuth
 * (`signIn('credentials')` in /auth) — der Browser-Supabase-Client bekommt
 * dabei NIE eine Session. Der Aufruf lieferte also ausnahmslos `null`, die
 * Funktion warf „keine Session", und der `catch`-Zweig legte erfundene
 * Umsaetze vor: Monatsbalken, „Einnahmen gesamt", eine Auslastung und daraus
 * abgeleitet den Rat, den Preis zu erhoehen. Jeder Vermieter sah dieselben
 * erfundenen Zahlen — als seine eigenen.
 *
 * Zweiter, unabhaengiger Grund: `rental_bookings` ist mit dem ANON-Key nicht
 * lesbar. Selbst mit Supabase-Session waere die Abfrage an RLS gescheitert.
 *
 * Diese Route liefert ROHDATEN in Cent, keine Kennzahlen. Gerechnet wird in
 * der Oberflaeche — und nur mit dem, was hier steht.
 */

export const dynamic = 'force-dynamic'

/**
 * Stornierte und abgelehnte Buchungen zaehlen nicht als Umsatz. Bewusst als
 * Ausschlussliste: ein neuer Status soll sichtbar sein, nicht stillschweigend
 * verschwinden.
 */
const NON_REVENUE_STATUSES = new Set(['cancelled', 'canceled', 'declined', 'rejected', 'refunded'])

/**
 * Umsatz ist Geld, das angekommen ist — nicht Geld, das jemand angekuendigt
 * hat (Track 22).
 *
 * Bis hierher hing `countsAsRevenue` allein am `status`. 'pending' steht auf
 * keiner Ausschlussliste, also zaehlte eine Buchung, die noch KEINE Zahlung
 * hat, als Einnahme — und /vermieter/mein-inserat/umsatz filtert genau auf
 * dieses Feld, summiert daraus „Einnahmen gesamt", rechnet die Auslastung
 * und leitet daraus eine Preisempfehlung ab („Senke deinen Tagessatz um
 * 10 %"). Der Leerzustand derselben Seite verspricht dabei woertlich:
 * „Sobald die erste Buchung BEZAHLT ist, erscheinen hier echte Zahlen."
 *
 * Wer solche Zeilen anlegt, muss dafuer nichts bezahlen: POST
 * /api/rental-bookings legt `status: 'pending' / payment_status: 'unpaid'`
 * an, BEVOR Stripe ueberhaupt gefragt wird. Bricht man den Checkout ab,
 * bleibt die Zeile bis zum naechtlichen Cleanup-Cron stehen (bis zu ~28 h).
 * Ein beliebiges angemeldetes Konto konnte damit die Umsatzkurve, die
 * Auslastung und die Preisempfehlung eines fremden Vermieters bestimmen.
 *
 * Bewusst als Positivliste auf dem ZAHLUNGSstatus: ein neuer Buchungsstatus
 * soll nicht versehentlich Umsatz werden, nur weil er auf keiner
 * Ausschlussliste steht.
 */
const REVENUE_PAYMENT_STATUSES = new Set(['paid', 'succeeded'])

interface EquipmentRow {
  id: string
  name: string | null
  price_per_day_cents: number | null
}

interface BookingRow {
  id: string
  equipment_id: string
  start_date: string | null
  end_date: string | null
  total_cents: number | null
  status: string | null
  payment_status: string | null
}

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()

    const { data: salonRows, error: salonError } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', session.user.id)

    if (salonError) {
      console.error('rental-revenue salon lookup failed:', salonError)
      return NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status: 500 })
    }

    const salonIds = ((salonRows ?? []) as Array<{ id: string }>).map((s) => s.id)
    if (salonIds.length === 0) {
      return NextResponse.json({ hasSalon: false, equipment: [], bookings: [] })
    }

    const { data: equipmentRows, error: equipmentError } = await supabase
      .from('rental_equipment')
      .select('id, name, price_per_day_cents')
      .in('salon_id', salonIds)

    if (equipmentError) {
      console.error('rental-revenue equipment lookup failed:', equipmentError)
      return NextResponse.json({ error: 'Mietobjekte konnten nicht geladen werden' }, { status: 500 })
    }

    const equipment: RevenueEquipment[] = ((equipmentRows ?? []) as EquipmentRow[]).map((e) => ({
      id: e.id,
      name: e.name ?? 'Mietobjekt',
      pricePerDayCents: e.price_per_day_cents ?? null,
    }))

    if (equipment.length === 0) {
      return NextResponse.json({ hasSalon: true, equipment: [], bookings: [] })
    }

    // `rental_bookings` hat KEINE `salon_id` (Spaltensonde 2026-08-27) — der
    // Salonbezug laeuft ausschliesslich ueber die Mietobjekte. Ein Filter auf
    // `salon_id` liefe hier in 42703.
    const { data: bookingRows, error: bookingError } = await supabase
      .from('rental_bookings')
      .select('id, equipment_id, start_date, end_date, total_cents, status, payment_status')
      .in(
        'equipment_id',
        equipment.map((e) => e.id),
      )
      .order('start_date', { ascending: false })
      .limit(500)

    if (bookingError) {
      console.error('rental-revenue booking lookup failed:', bookingError)
      return NextResponse.json({ error: 'Buchungen konnten nicht geladen werden' }, { status: 500 })
    }

    const bookings: RevenueBooking[] = ((bookingRows ?? []) as BookingRow[]).map((b) => {
      const status = b.status ?? 'pending'
      const paymentStatus = b.payment_status ?? null
      return {
        id: b.id,
        equipmentId: b.equipment_id,
        startDate: b.start_date ?? null,
        endDate: b.end_date ?? null,
        totalCents: b.total_cents ?? 0,
        status,
        paymentStatus,
        countsAsRevenue:
          !NON_REVENUE_STATUSES.has(status.toLowerCase()) &&
          REVENUE_PAYMENT_STATUSES.has(String(paymentStatus ?? '').toLowerCase()),
      }
    })

    return NextResponse.json({ hasSalon: true, equipment, bookings })
  } catch (err) {
    console.error('rental-revenue GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
