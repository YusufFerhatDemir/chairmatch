import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Echte Kennzahlen fuer die drei Rollen-Dashboards — GET /api/me/dashboard-stats
 *
 * Bis 2026-08-27 standen die Zahlen auf /anbieter/mein-salon,
 * /vermieter/mein-inserat und /mieter/mein-bereich fest im Quelltext:
 *
 *   mein-salon    "Termine heute 12"   "Bewertung 4,9"   "Umsatz Monat 480 EUR"
 *   mein-inserat  "Anfragen offen 5"   "Buchungen 22"    "Umsatz Monat 90 EUR"
 *   mein-bereich  "Anfragen offen 8"   "Bestaetigt 2"    "Ø Tag 85 EUR"
 *
 * Jeder Nutzer sah dieselben Zahlen — als seine eigenen. Dazu Badges an den
 * Kacheln ("5 offene Anfragen", "3 neue Bewertungen"), die wie offene Vorgaenge
 * aussahen und keine waren: seit Track 7 liegt hinter der Anfragen-Kachel die
 * echte Liste, ein Vermieter mit Badge 5 fand dort null.
 *
 * Diese Route liefert ROHDATEN, keine fertigen Kennzahlen — Betraege in Cent,
 * Zaehlungen als Zahl. Gerechnet und formatiert wird in der Oberflaeche.
 *
 * Wichtig: ein Feld ist `null`, wenn es dafuer KEINE belastbare Quelle gibt.
 * Die Oberflaeche laesst die Kachel dann weg. Es wird nichts geschaetzt,
 * hochgerechnet oder ersatzweise gefuellt — genau das war der Fehler.
 */

export const dynamic = 'force-dynamic'

/** Storniert/abgelehnt zaehlt nirgends mit. Ausschlussliste, damit ein neuer
 *  Status auffaellt statt still zu verschwinden. */
const NICHT_GEZAEHLT = new Set(['cancelled', 'canceled', 'declined', 'rejected', 'refunded'])

/** Nur tatsaechlich eingegangenes Geld zaehlt als Umsatz. */
const BEZAHLT = new Set(['paid', 'succeeded'])

function monatsStart(): string {
  const jetzt = new Date()
  return new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

function heute(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const userId = session.user.id

    const rolle = new URL(req.url).searchParams.get('role')
    if (rolle !== 'anbieter' && rolle !== 'vermieter' && rolle !== 'mieter') {
      return NextResponse.json({ error: 'Unbekannte Rolle' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // ── Mieter: haengt an nichts als den eigenen Anfragen ────────────────
    if (rolle === 'mieter') {
      const { data, error } = await supabase
        .from('rental_requests')
        .select('status')
        .eq('requester_id', userId)
        .limit(500)

      if (error) {
        console.error('[dashboard-stats] rental_requests (mieter):', error)
        return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
      }

      const zeilen = data ?? []
      return NextResponse.json({
        role: 'mieter',
        anfragenOffen: zeilen.filter((r) => r.status === 'open').length,
        anfragenBestaetigt: zeilen.filter((r) => r.status === 'accepted').length,
        // Ein Tagesdurchschnitt liesse sich nur aus abgeschlossenen Miet-
        // buchungen bilden; `rental_bookings` haengt am Vermieter, nicht am
        // Mieter, und `estimated_cents` einer Anfrage ist eine Schaetzung des
        // Anfragenden, kein gezahlter Preis. Lieber keine Kachel als eine
        // erfundene Zahl.
        durchschnittTagCents: null,
      })
    }

    // ── Anbieter und Vermieter brauchen beide den eigenen Salon ──────────
    const { data: salon, error: salonFehler } = await supabase
      .from('salons')
      .select('id, avg_rating, review_count')
      .eq('owner_id', userId)
      .maybeSingle()

    if (salonFehler) {
      console.error('[dashboard-stats] salons:', salonFehler)
      return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
    }
    if (!salon) {
      return NextResponse.json({ role: rolle, hasSalon: false })
    }

    if (rolle === 'anbieter') {
      const [termine, umsatz, dienste] = await Promise.all([
        supabase
          .from('bookings')
          .select('status')
          .eq('salon_id', salon.id)
          .eq('booking_date', heute())
          .limit(500),
        supabase
          .from('bookings')
          .select('price_cents, status, payment_status')
          .eq('salon_id', salon.id)
          .gte('booking_date', monatsStart())
          .limit(1000),
        supabase
          .from('services')
          .select('id')
          .eq('salon_id', salon.id)
          .eq('is_active', true)
          .limit(500),
      ])

      const fehler = termine.error || umsatz.error || dienste.error
      if (fehler) {
        console.error('[dashboard-stats] anbieter:', fehler)
        return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
      }

      const umsatzCents = (umsatz.data ?? [])
        .filter((b) => !NICHT_GEZAEHLT.has(String(b.status ?? '').toLowerCase()))
        .filter((b) => BEZAHLT.has(String(b.payment_status ?? '').toLowerCase()))
        .reduce((s, b) => s + (b.price_cents ?? 0), 0)

      return NextResponse.json({
        role: 'anbieter',
        hasSalon: true,
        termineHeute: (termine.data ?? []).filter(
          (b) => !NICHT_GEZAEHLT.has(String(b.status ?? '').toLowerCase()),
        ).length,
        // avg_rating pflegt die Datenbank, nicht diese Route.
        bewertung: salon.avg_rating ?? null,
        bewertungAnzahl: salon.review_count ?? 0,
        umsatzMonatCents: umsatzCents,
        aktiveServices: (dienste.data ?? []).length,
      })
    }

    // ── Vermieter ────────────────────────────────────────────────────────
    const { data: geraete, error: geraeteFehler } = await supabase
      .from('rental_equipment')
      .select('id')
      .eq('salon_id', salon.id)
      .limit(500)

    if (geraeteFehler) {
      console.error('[dashboard-stats] rental_equipment:', geraeteFehler)
      return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
    }

    const geraeteIds = (geraete ?? []).map((e) => e.id)

    const [anfragen, buchungen] = await Promise.all([
      supabase
        .from('rental_requests')
        .select('status')
        .eq('recipient_id', userId)
        .limit(500),
      geraeteIds.length
        ? supabase
            .from('rental_bookings')
            .select('total_cents, status, payment_status, start_date')
            .in('equipment_id', geraeteIds)
            .gte('start_date', monatsStart())
            .limit(1000)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (anfragen.error || buchungen.error) {
      console.error('[dashboard-stats] vermieter:', anfragen.error || buchungen.error)
      return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
    }

    const gezaehlt = (buchungen.data ?? []).filter(
      (b) => !NICHT_GEZAEHLT.has(String(b.status ?? '').toLowerCase()),
    )

    return NextResponse.json({
      role: 'vermieter',
      hasSalon: true,
      anfragenOffen: (anfragen.data ?? []).filter((r) => r.status === 'open').length,
      buchungenMonat: gezaehlt.length,
      umsatzMonatCents: gezaehlt
        .filter((b) => BEZAHLT.has(String(b.payment_status ?? '').toLowerCase()))
        .reduce((s, b) => s + (b.total_cents ?? 0), 0),
    })
  } catch (e) {
    console.error('[dashboard-stats] unerwartet:', e)
    return NextResponse.json({ error: 'Zahlen konnten nicht geladen werden' }, { status: 500 })
  }
}
