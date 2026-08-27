'use server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createReviewSchema, replySchema } from './review.schemas'
import { checkEligibility, updateSalonRating, isSalonReview, SALON_REVIEW_TYPE } from './review.service'
import { getServerSession } from '@/modules/auth/session'

export async function createReview(input: unknown) {
  const parsed = createReviewSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const session = await getServerSession()
  const customerId = session?.user?.id
  if (!customerId) {
    return { error: 'Nicht authentifiziert.' }
  }

  // Die Pruefung lief bis 2026-08-27 NUR mit Buchungsbezug. Ohne bookingId
  // wurde gar nichts geprueft — auch nicht, ob dieselbe Person den Salon
  // schon bewertet hat. Sie laeuft jetzt in beiden Faellen; welche Regeln
  // greifen, entscheidet checkEligibility.
  const eligibility = await checkEligibility(customerId, data.salonId, data.bookingId)
  if (!eligibility.eligible) {
    return { error: eligibility.reason }
  }

  const supabase = getSupabaseAdmin()

  // Step 1: Create review
  //
  // `reviewer_id` und `review_type` fehlten bisher. Das hatte zwei Folgen:
  // der Unique-Index reviews_unique_per_reviewer_booking greift auf
  // (reviewer_id, booking_id, review_type) und lief wegen NULL ins Leere —
  // der Doppelbewertungs-Schutz existierte also nur in der Anwendung. Und
  // ohne Typ war die Zeile von einer Miet-Bewertung nicht zu unterscheiden.
  //
  // Kundenbewertungen sind nicht double-blind (es gibt keine Gegenseite, die
  // zurueckbewertet), deshalb published=true ab Sekunde eins — genau das,
  // was Migration 20260515 den Altzeilen zugewiesen hat.
  const now = new Date().toISOString()
  const { data: newReview, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      customer_id: customerId,
      reviewer_id: customerId,
      review_type: SALON_REVIEW_TYPE,
      salon_id: data.salonId,
      booking_id: data.bookingId || null,
      rating: data.rating,
      comment: data.comment || null,
      published: true,
      visible_at: now,
    })
    .select()
    .single()

  if (reviewError || !newReview) {
    return { error: 'Bewertung konnte nicht erstellt werden.' }
  }

  // Step 2: Audit log (best effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id: customerId,
      action: 'REVIEW_CREATED',
      entity: 'review',
      entity_id: newReview.id,
      details: {
        salonId: data.salonId,
        rating: data.rating,
      },
    })
  } catch {
    console.error('Failed to create audit log')
  }

  // Update salon aggregate (outside transaction for performance)
  await updateSalonRating(data.salonId)

  return { success: true, reviewId: newReview.id }
}

export async function replyToReview(input: unknown) {
  const parsed = replySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { reviewId, reply } = parsed.data
  const session = await getServerSession()
  if (!session?.user) {
    return { error: 'Nicht authentifiziert.' }
  }

  const supabase = getSupabaseAdmin()

  const { data: review } = await supabase
    .from('reviews')
    .select(`
      *,
      salon:salons!inner(owner_id)
    `)
    .eq('id', reviewId)
    .single()

  if (!review) {
    return { error: 'Bewertung nicht gefunden.' }
  }

  // Only salon owner can reply
  if (review.salon.owner_id !== session.user.id) {
    return { error: 'Keine Berechtigung.' }
  }

  await supabase
    .from('reviews')
    .update({ reply, replied_at: new Date().toISOString() })
    .eq('id', reviewId)

  return { success: true }
}

export async function flagReview(reviewId: string) {
  const session = await getServerSession()
  if (!session?.user) {
    return { error: 'Nicht authentifiziert.' }
  }

  const supabase = getSupabaseAdmin()

  await supabase.from('audit_logs').insert({
    user_id: session.user.id,
    action: 'REVIEW_FLAGGED',
    entity: 'review',
    entity_id: reviewId,
  })

  return { success: true }
}

/**
 * Oeffentliche Bewertungen eines Salons.
 *
 * Der Filter auf den Bewertungstyp ist nicht kosmetisch: Miet-Bewertungen
 * tragen dieselbe `salon_id`, sind aber double-blind und bis zur
 * Freischaltung ausdruecklich nicht sichtbar. Ohne den Filter hat dieser
 * Endpunkt sie ausgeliefert — inklusive der noch unveroeffentlichten — und
 * damit die gesamte Sperrlogik aus /api/reviews/rental ausgehebelt.
 *
 * Die Spaltenliste ist eine Positivliste, seit Track 10. Hier stand `*`, und
 * das Ergebnis geht ueber `GET /api/reviews?salonId=` unveraendert an jeden
 * angemeldeten Aufrufer: `customer_id` (die auth.users-ID des Bewertenden)
 * und `reported_by` (wer die Bewertung gemeldet hat) waren damit zu jeder
 * Bewertung abrufbar. Dieselbe Sorte Fund wie `select('*')` in
 * /api/salons/[id] in Track 9 — deshalb dieselbe Antwort: neue Spalten sind
 * standardmaessig NICHT oeffentlich, wer eine braucht, traegt sie hier ein.
 *
 * `review_type` bleibt drin, weil `isSalonReview` genau darauf filtert.
 *
 * Die Liste steht als ein Literal da und nicht als `[...].join(', ')`: der
 * Typ-Parser von supabase-js liest die Spalten aus dem String-Literal und
 * kann einen zusammengesetzten String nicht aufloesen — das Ergebnis waere
 * `ParserError` statt der Zeilen.
 */
export async function getReviews(salonId: string) {
  const supabase = getSupabaseAdmin()

  const { data } = await supabase
    .from('reviews')
    .select(
      'id, salon_id, booking_id, review_type, rating, comment, reply, replied_at, created_at, customer:profiles!reviews_customer_id_fkey(full_name)',
    )
    .eq('salon_id', salonId)
    .order('created_at', { ascending: false })

  // PostgREST liefert fuer eine n:1-Einbettung ein Objekt, der Typ-Parser von
  // supabase-js haelt sie bei explizit genannten Spalten aber fuer eine Liste.
  // Statt das per Cast wegzuerklaeren wird hier beides akzeptiert und auf
  // eine Form gebracht — die Form, die die Salonseite und `/api/reviews`
  // ohnehin schon erwarten.
  return (data || []).filter(isSalonReview).map(r => {
    const roh = (r as { customer?: unknown }).customer
    const customer = (Array.isArray(roh) ? roh[0] : roh) as { full_name: string | null } | null
    return { ...r, customer: customer ?? null }
  })
}
