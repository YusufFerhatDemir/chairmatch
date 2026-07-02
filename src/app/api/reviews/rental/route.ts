/**
 * Bidirektionale Marketplace-Bewertungen (Stuhl-Vermietung).
 *
 * POST — Mieter bewertet Anbieter (tenant_to_provider) bzw.
 *        Anbieter bewertet Mieter (provider_to_tenant), abhängig davon,
 *        wer der eingeloggte User relativ zum rental_booking ist.
 *        Double-blind: Insert mit published=false / visible_at=null —
 *        Freischaltung via publish_review_pair() bzw. Cron
 *        (src/app/api/cron/publish-reviews/route.ts).
 *
 * GET ?userId=...  — öffentlich: publizierte Bewertungen über einen User
 *                    (beide Richtungen) + Aggregat-Felder aus profiles.
 * GET ?me=1        — authentifiziert: eigene Reputation, erhaltene
 *                    publizierte Bewertungen + offene (noch unbewertete)
 *                    abgeschlossene Buchungen. Versorgt die Seite
 *                    /mieter/mein-bereich/bewertungen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export const dynamic = 'force-dynamic'

/* ── Typen ──────────────────────────────────────────────────── */

type RentalBookingRow = {
  id: string
  equipment_id: string
  renter_id: string
  start_date: string
  end_date: string
  total_cents: number
  status: string
}

type EquipmentRow = { id: string; name: string; salon_id: string }
type SalonRow = { id: string; owner_id: string; name: string }

type ReviewRow = {
  id: string
  rating: number
  comment: string | null
  review_type: string
  visible_at: string | null
  created_at: string
  booking_id: string | null
}

type ReputationFields = {
  avg_rating_as_tenant: number | string | null
  review_count_as_tenant: number | null
  avg_rating_as_provider: number | string | null
  review_count_as_provider: number | null
}

/* ── Helfer ─────────────────────────────────────────────────── */

const REVIEWABLE_STATUS = new Set(['completed', 'confirmed'])
const RENTAL_REVIEW_TYPES = ['tenant_to_provider', 'provider_to_tenant']

const HINWEIS =
  'Deine Bewertung wird sichtbar, sobald beide Seiten bewertet haben (spätestens nach 14 Tagen).'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Buchung beendet? (Datums-Vergleich als YYYY-MM-DD-String) */
function bookingEnded(endDate: string): boolean {
  return String(endDate).slice(0, 10) < todayIso()
}

function toNumberOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function normalizeReputation(row: ReputationFields | null) {
  return {
    avgRatingAsTenant: toNumberOrNull(row?.avg_rating_as_tenant),
    reviewCountAsTenant: row?.review_count_as_tenant ?? 0,
    avgRatingAsProvider: toNumberOrNull(row?.avg_rating_as_provider),
    reviewCountAsProvider: row?.review_count_as_provider ?? 0,
  }
}

function mapReview(r: ReviewRow) {
  return {
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    reviewType: r.review_type,
    visibleAt: r.visible_at,
    createdAt: r.created_at,
    bookingId: r.booking_id,
  }
}

/* ── POST: Bewertung abgeben ────────────────────────────────── */

const postSchema = z.object({
  bookingId: z.uuid({ error: 'Ungültige Buchungs-ID.' }),
  rating: z
    .number({ error: 'Bitte wähle 1 bis 5 Sterne.' })
    .int({ error: 'Die Bewertung muss eine ganze Zahl sein.' })
    .min(1, { error: 'Bitte wähle mindestens 1 Stern.' })
    .max(5, { error: 'Maximal 5 Sterne möglich.' }),
  comment: z
    .string()
    .trim()
    .max(2000, { error: 'Der Kommentar darf höchstens 2000 Zeichen lang sein.' })
    .optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json(
        { error: 'Bitte melde dich an, um eine Bewertung abzugeben.' },
        { status: 401 },
      )
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 })
    }

    const parsed = postSchema.safeParse(raw)
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Ungültige Eingabe.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const { bookingId, rating, comment } = parsed.data

    const supabase = getSupabaseAdmin()

    // 1) Buchung laden
    const { data: booking, error: bookingErr } = await supabase
      .from('rental_bookings')
      .select('id, equipment_id, renter_id, start_date, end_date, total_cents, status')
      .eq('id', bookingId)
      .maybeSingle()

    if (bookingErr) {
      return NextResponse.json(
        { error: 'Die Buchung konnte nicht geladen werden. Bitte versuche es später erneut.' },
        { status: 500 },
      )
    }
    if (!booking) {
      return NextResponse.json({ error: 'Buchung nicht gefunden.' }, { status: 404 })
    }
    const b = booking as RentalBookingRow

    // 2) Buchung muss beendet sein
    if (!REVIEWABLE_STATUS.has(String(b.status).toLowerCase())) {
      return NextResponse.json(
        { error: 'Diese Buchung kann nicht bewertet werden (Status nicht abgeschlossen).' },
        { status: 400 },
      )
    }
    if (!bookingEnded(b.end_date)) {
      return NextResponse.json(
        { error: 'Eine Bewertung ist erst nach dem Ende der Buchung möglich.' },
        { status: 400 },
      )
    }

    // 3) Salon-Inhaber über equipment → salon auflösen
    const { data: equipment } = await supabase
      .from('rental_equipment')
      .select('id, name, salon_id')
      .eq('id', b.equipment_id)
      .maybeSingle()

    const eq = (equipment as EquipmentRow | null) ?? null
    if (!eq) {
      return NextResponse.json(
        { error: 'Das gebuchte Objekt konnte nicht gefunden werden.' },
        { status: 404 },
      )
    }

    const { data: salon } = await supabase
      .from('salons')
      .select('id, owner_id, name')
      .eq('id', eq.salon_id)
      .maybeSingle()

    const sal = (salon as SalonRow | null) ?? null
    if (!sal) {
      return NextResponse.json(
        { error: 'Der zugehörige Salon konnte nicht gefunden werden.' },
        { status: 404 },
      )
    }

    // 4) Richtung bestimmen: Wer bewertet wen?
    let reviewType: 'tenant_to_provider' | 'provider_to_tenant'
    let revieweeUserId: string
    if (userId === b.renter_id) {
      reviewType = 'tenant_to_provider'
      revieweeUserId = sal.owner_id
    } else if (userId === sal.owner_id) {
      reviewType = 'provider_to_tenant'
      revieweeUserId = b.renter_id
    } else {
      return NextResponse.json(
        { error: 'Du bist an dieser Buchung nicht beteiligt.' },
        { status: 403 },
      )
    }

    if (revieweeUserId === userId) {
      return NextResponse.json(
        { error: 'Du kannst dich nicht selbst bewerten.' },
        { status: 400 },
      )
    }

    // 5) Insert — double-blind: published=false, visible_at=null
    const { error: insertErr } = await supabase.from('reviews').insert({
      reviewer_id: userId,
      reviewee_user_id: revieweeUserId,
      review_type: reviewType,
      booking_id: b.id,
      rating,
      comment: comment && comment.length > 0 ? comment : null,
      published: false,
      visible_at: null,
      // Legacy-Pflichtfelder der ursprünglichen reviews-Tabelle:
      customer_id: userId,
      salon_id: sal.id,
    })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return NextResponse.json(
          { error: 'Du hast diese Buchung bereits bewertet.' },
          { status: 409 },
        )
      }
      return NextResponse.json(
        { error: 'Deine Bewertung konnte nicht gespeichert werden. Bitte versuche es später erneut.' },
        { status: 500 },
      )
    }

    // 6) Double-blind-Freischaltung prüfen (beide Seiten bewertet → sofort publish).
    //    Best-effort — der tägliche Cron übernimmt die 14-Tage-Regel.
    try {
      await supabase.rpc('publish_review_pair', { p_booking_id: b.id })
    } catch {
      /* Cron holt das nach */
    }

    return NextResponse.json({ ok: true, hinweis: HINWEIS }, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Interner Fehler. Bitte versuche es später erneut.' },
      { status: 500 },
    )
  }
}

/* ── GET: Reputation abfragen ───────────────────────────────── */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const me = searchParams.get('me')
    const userIdParam = searchParams.get('userId')

    if (me === '1') {
      return await handleGetMe()
    }

    if (userIdParam) {
      const parsedId = z.uuid().safeParse(userIdParam)
      if (!parsedId.success) {
        return NextResponse.json({ error: 'Ungültige User-ID.' }, { status: 400 })
      }
      return await handleGetPublic(parsedId.data)
    }

    return NextResponse.json(
      { error: 'Parameter userId oder me=1 erforderlich.' },
      { status: 400 },
    )
  } catch {
    return NextResponse.json(
      { error: 'Interner Fehler. Bitte versuche es später erneut.' },
      { status: 500 },
    )
  }
}

/** Öffentlich: publizierte Bewertungen über einen User + Aggregate. */
async function handleGetPublic(userId: string) {
  const supabase = getSupabaseAdmin()

  const [{ data: profile }, { data: reviews, error: reviewsErr }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'avg_rating_as_tenant, review_count_as_tenant, avg_rating_as_provider, review_count_as_provider',
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('reviews')
      .select('id, rating, comment, review_type, visible_at, created_at, booking_id')
      .eq('reviewee_user_id', userId)
      .eq('published', true)
      .in('review_type', RENTAL_REVIEW_TYPES)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (reviewsErr) {
    return NextResponse.json(
      { error: 'Bewertungen konnten nicht geladen werden.' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    ok: true,
    reputation: normalizeReputation((profile as ReputationFields | null) ?? null),
    reviews: ((reviews as ReviewRow[] | null) ?? []).map(mapReview),
  })
}

/** Authentifiziert: eigene Reputation + offene Bewertungen. */
async function handleGetMe() {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const today = todayIso()

  // Reputation + erhaltene publizierte Bewertungen
  const [{ data: profile }, { data: received }] = await Promise.all([
    supabase
      .from('profiles')
      .select(
        'avg_rating_as_tenant, review_count_as_tenant, avg_rating_as_provider, review_count_as_provider',
      )
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('reviews')
      .select('id, rating, comment, review_type, visible_at, created_at, booking_id')
      .eq('reviewee_user_id', userId)
      .eq('published', true)
      .in('review_type', RENTAL_REVIEW_TYPES)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  // Beendete Buchungen als Mieter
  const { data: renterBookings } = await supabase
    .from('rental_bookings')
    .select('id, equipment_id, renter_id, start_date, end_date, total_cents, status')
    .eq('renter_id', userId)
    .lt('end_date', today)
    .in('status', ['completed', 'confirmed'])
    .order('end_date', { ascending: false })
    .limit(25)

  // Beendete Buchungen als Salon-Inhaber (Anbieter-Seite)
  let ownerBookings: RentalBookingRow[] = []
  const { data: ownSalons } = await supabase
    .from('salons')
    .select('id, owner_id, name')
    .eq('owner_id', userId)

  const ownSalonRows = (ownSalons as SalonRow[] | null) ?? []
  let ownEquipment: EquipmentRow[] = []
  if (ownSalonRows.length > 0) {
    const { data: eqRows } = await supabase
      .from('rental_equipment')
      .select('id, name, salon_id')
      .in('salon_id', ownSalonRows.map((s) => s.id))
    ownEquipment = (eqRows as EquipmentRow[] | null) ?? []
    if (ownEquipment.length > 0) {
      const { data: obRows } = await supabase
        .from('rental_bookings')
        .select('id, equipment_id, renter_id, start_date, end_date, total_cents, status')
        .in('equipment_id', ownEquipment.map((e) => e.id))
        .lt('end_date', today)
        .in('status', ['completed', 'confirmed'])
        .order('end_date', { ascending: false })
        .limit(25)
      ownerBookings = (obRows as RentalBookingRow[] | null) ?? []
    }
  }

  const asRenter = (renterBookings as RentalBookingRow[] | null) ?? []
  const allBookings = [
    ...asRenter.map((b) => ({ ...b, role: 'mieter' as const })),
    ...ownerBookings
      .filter((b) => b.renter_id !== userId)
      .map((b) => ({ ...b, role: 'anbieter' as const })),
  ]

  // Eigene Reviews zu diesen Buchungen → herausfiltern
  let reviewedBookingIds = new Set<string>()
  if (allBookings.length > 0) {
    const { data: ownReviews } = await supabase
      .from('reviews')
      .select('booking_id')
      .eq('reviewer_id', userId)
      .in('booking_id', allBookings.map((b) => b.id))
    reviewedBookingIds = new Set(
      (((ownReviews as { booking_id: string | null }[] | null) ?? [])
        .map((r) => r.booking_id)
        .filter(Boolean)) as string[],
    )
  }

  const open = allBookings.filter((b) => !reviewedBookingIds.has(b.id))

  // Anzeige-Namen (Equipment + Salon) für offene Buchungen auflösen
  const missingEqIds = Array.from(
    new Set(open.map((b) => b.equipment_id).filter((id) => !ownEquipment.some((e) => e.id === id))),
  )
  let extraEquipment: EquipmentRow[] = []
  if (missingEqIds.length > 0) {
    const { data: eqRows } = await supabase
      .from('rental_equipment')
      .select('id, name, salon_id')
      .in('id', missingEqIds)
    extraEquipment = (eqRows as EquipmentRow[] | null) ?? []
  }
  const equipmentById = new Map<string, EquipmentRow>(
    [...ownEquipment, ...extraEquipment].map((e) => [e.id, e]),
  )

  const missingSalonIds = Array.from(
    new Set(
      open
        .map((b) => equipmentById.get(b.equipment_id)?.salon_id)
        .filter((id): id is string => Boolean(id) && !ownSalonRows.some((s) => s.id === id)),
    ),
  )
  let extraSalons: SalonRow[] = []
  if (missingSalonIds.length > 0) {
    const { data: salonRows } = await supabase
      .from('salons')
      .select('id, owner_id, name')
      .in('id', missingSalonIds)
    extraSalons = (salonRows as SalonRow[] | null) ?? []
  }
  const salonById = new Map<string, SalonRow>(
    [...ownSalonRows, ...extraSalons].map((s) => [s.id, s]),
  )

  const openBookings = open.map((b) => {
    const eq = equipmentById.get(b.equipment_id)
    const sal = eq ? salonById.get(eq.salon_id) : undefined
    return {
      bookingId: b.id,
      role: b.role,
      equipmentName: eq?.name ?? 'Arbeitsplatz',
      salonName: sal?.name ?? 'Salon',
      startDate: b.start_date,
      endDate: b.end_date,
      totalCents: b.total_cents,
    }
  })

  return NextResponse.json({
    ok: true,
    reputation: normalizeReputation((profile as ReputationFields | null) ?? null),
    receivedReviews: ((received as ReviewRow[] | null) ?? []).map(mapReview),
    openBookings,
  })
}
