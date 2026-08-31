import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { rankListings, type MatchCriteria, type MatchListing } from '@/lib/matching/match-engine'

export const dynamic = 'force-dynamic'

const criteriaSchema = z.object({
  beruf: z.enum(['friseur', 'barber', 'kosmetik', 'lash', 'nail', 'massage', 'arzt']),
  stadt: z.string().min(2).max(80),
  budgetProTagCents: z.number().int().min(500).max(100000),
  arbeitstageProWoche: z.number().int().min(1).max(7),
  mietdauer: z.enum(['tageweise', 'monatlich']).default('tageweise'),
  prioritaeten: z.array(z.enum(['preis', 'lage', 'bewertung', 'ausstattung'])).max(4).optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
  }

  const parsed = criteriaSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Bitte fülle alle Felder korrekt aus.' }, { status: 400 })
  }
  const criteria: MatchCriteria = parsed.data

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('rental_equipment')
      .select(
        'id, salon_id, type, name, description, price_per_day_cents, price_per_month_cents, is_available, images, salon:salons(id, name, slug, city, avg_rating, review_count, is_verified, category, is_active)'
      )
      .eq('is_available', true)
      .limit(500)

    if (error) throw error

    // Gesperrte Anbieter fliegen aus dem Matching.
    //
    // Track 15 hat diesen Filter in /api/rental-listings eingezogen, die
    // Geldstrecken (createBooking, rental-bookings, rental-requests) sind
    // seitdem fail closed. Das Matching ist danach die letzte oeffentliche
    // Liste ohne den Riegel geblieben: es fragte dieselbe Tabelle, filterte
    // aber nur `is_available` — die Eigenschaft des Inserats, nicht die des
    // Betriebs. Ein von /admin/anbieter gesperrter Salon wurde damit von der
    // Plattform aktiv weiterempfohlen, mit Namen, Bewertung und Verifiziert-
    // Haken, und der Link fuehrte auf eine Salonseite, die seit Track 20 mit
    // 404 antwortet.
    //
    // Bewusst nur bei einem AUSDRUECKLICHEN `false` — wie in
    // /api/rental-listings und aus demselben Grund: ein „im Zweifel raus"
    // wuerde beim Ausfall der Einbettung jedes Ergebnis verschlucken und dem
    // Nutzer „keine Treffer" zeigen, ohne dass jemand etwas gesperrt haette.
    const listings = ((data ?? []) as unknown as MatchListing[]).filter(
      (l) => l.salon?.is_active !== false,
    )
    const ranked = rankListings(criteria, listings).slice(0, 20)

    return NextResponse.json({
      results: ranked.map(({ listing, match }) => ({
        id: listing.id,
        name: listing.name,
        type: listing.type,
        priceDayCents: listing.price_per_day_cents,
        priceMonthCents: listing.price_per_month_cents,
        salonName: listing.salon?.name ?? null,
        salonSlug: listing.salon?.slug ?? null,
        city: listing.salon?.city ?? null,
        rating: listing.salon?.avg_rating ?? null,
        reviewCount: listing.salon?.review_count ?? null,
        verified: listing.salon?.is_verified ?? false,
        score: match.score,
        gruende: match.gruende,
        preisEinschaetzung: match.preisEinschaetzung,
      })),
    })
  } catch {
    // DB nicht erreichbar — leeres Ergebnis statt Fehler, UI zeigt Empty-State
    return NextResponse.json({
      results: [],
      hinweis: 'Inserate konnten gerade nicht geladen werden — bitte versuch es gleich nochmal.',
    })
  }
}
