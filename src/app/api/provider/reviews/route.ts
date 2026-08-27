import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { ListingError, getOwnedSalon } from '@/modules/rentals/listing.service'
import { isSalonReview } from '@/modules/reviews/review.service'
import { kuerzeName } from '@/lib/display-name'

/**
 * GET /api/provider/reviews — die Bewertungen des eigenen Salons.
 *
 * Angelegt, weil /anbieter/mein-salon/bewertungen bis Track 10 gar keine
 * Quelle hatte: die Seite zeigte fest verdrahtet "4,9 ★", "47 Bewertungen"
 * und drei erfundene Rezensionen ("Anna K.", "Max R.", "Lisa M.") — jedem
 * Saloninhaber dieselben, unabhaengig davon, ob sein Salon jemals bewertet
 * wurde. Eine erfundene Reputation sagt dem Betreiber, wie Kunden ihn sehen;
 * das ist die Sorte Zahl, nach der Preise und Werbung ausgerichtet werden.
 *
 * Zwei Entscheidungen, die nicht offensichtlich sind:
 *
 *  - Gefiltert wird mit `isSalonReview`, nicht ueber `booking_id`.
 *    Miet-Bewertungen (`tenant_to_provider` / `provider_to_tenant`) tragen
 *    dieselbe `salon_id`, sind aber double-blind und bis zur Freischaltung
 *    durch den Cron ausdruecklich nicht sichtbar. Ohne den Filter haette
 *    diese Route sie ausgeliefert und damit dieselbe Sperre ausgehebelt,
 *    die in `getReviews` schon einmal gefallen war.
 *  - Der Schnitt wird aus den gelieferten Zeilen gerechnet, nicht aus
 *    `salons.avg_rating` genommen. Dort steht ein Aggregat, das an anderer
 *    Stelle gepflegt wird und mit der angezeigten Liste auseinanderlaufen
 *    kann; was oben als Schnitt steht, gehoert zu dem, was darunter steht.
 */

/**
 * Was der Anbieter von einer Bewertung sehen darf. Bewusst OHNE
 * `customer_id` und `reported_by` — das sind auth.users-IDs; der Anzeigename
 * kommt gekuerzt aus `profiles`.
 */
const REVIEW_COLUMNS =
  'id, salon_id, booking_id, review_type, rating, comment, reply, replied_at, created_at, customer:profiles!reviews_customer_id_fkey(full_name)'

interface ReviewRow {
  id: string
  review_type: string | null
  rating: number
  comment: string | null
  reply: string | null
  replied_at: string | null
  created_at: string
  customer: { full_name: string | null } | null
}

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  let salonId: string
  try {
    const salon = await getOwnedSalon(getSupabaseAdmin(), session.user.id)
    if (!salon) {
      // Kein Salon ist kein Fehler — der Anbieter steht noch im Onboarding.
      return NextResponse.json({ salonId: null, reviews: [], reviewCount: 0, avgRating: null })
    }
    salonId = salon.id
  } catch (err) {
    const status = err instanceof ListingError ? err.status : 500
    return NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status })
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })

  if (error) {
    // Kein leeres Ergebnis vortaeuschen: "0 Bewertungen" und "Abruf
    // fehlgeschlagen" sind fuer den Betreiber zwei sehr verschiedene Saetze.
    console.error('provider/reviews GET failed:', error)
    return NextResponse.json({ error: 'Bewertungen konnten nicht geladen werden' }, { status: 500 })
  }

  // Die n:1-Einbettung kommt als Objekt zurueck; der Typ-Parser von
  // supabase-js haelt sie bei explizit genannten Spalten fuer eine Liste.
  // Beides wird akzeptiert, statt eine der Formen per Cast zu behaupten.
  const reviews = ((data ?? []) as unknown as Array<Omit<ReviewRow, 'customer'> & { customer: unknown }>)
    .filter(isSalonReview)
    .map(r => {
      const roh = Array.isArray(r.customer) ? r.customer[0] : r.customer
      return { ...r, customer: (roh as { full_name: string | null } | null) ?? null } as ReviewRow
    })

  const bewertungen = reviews.map(r => Number(r.rating)).filter(n => Number.isFinite(n))
  const avgRating =
    bewertungen.length > 0
      ? bewertungen.reduce((a, b) => a + b, 0) / bewertungen.length
      : null

  return NextResponse.json({
    salonId,
    reviewCount: reviews.length,
    avgRating,
    reviews: reviews.map(r => ({
      id: r.id,
      rating: Number(r.rating),
      comment: r.comment,
      reply: r.reply,
      repliedAt: r.replied_at,
      createdAt: r.created_at,
      authorLabel: kuerzeName(r.customer?.full_name ?? null),
    })),
  })
}
