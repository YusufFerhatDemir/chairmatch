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
        'id, salon_id, type, name, description, price_per_day_cents, price_per_month_cents, is_available, images, salon:salons(id, name, slug, city, avg_rating, review_count, is_verified, category)'
      )
      .eq('is_available', true)
      .limit(500)

    if (error) throw error

    const listings = (data ?? []) as unknown as MatchListing[]
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
