// @vitest-environment node
/**
 * E2E: Bewertungs-Integritaet (Salon-Bewertungen).
 *
 * Der Miet-Zweig (/api/reviews/rental) war von Anfang an streng: Teilnahme
 * an der Buchung, Status, Enddatum, Selbstbewertungs-Sperre. Der aeltere
 * Kunden-Salon-Pfad (POST /api/reviews → createReview) war es nicht — er hat
 * eine uebergebene bookingId geladen, aber weder deren Eigentuemer noch
 * deren Salon geprueft, und ohne bookingId gar nichts.
 *
 * Zusaetzlich geprueft: Miet-Bewertungen duerfen weder in der oeffentlichen
 * Salon-Liste noch in den Salon-Sternen auftauchen — sie sind double-blind
 * und tragen aus Legacy-Gruenden trotzdem eine salon_id.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, getRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))

import { POST as reviewsPost, GET as reviewsGet } from '@/app/api/reviews/route'
import { GET as aggregateGet } from '@/app/api/reviews/aggregate/route'

function db(): FakeSupabase {
  return state.db
}

const REVIEWS_URL = 'https://www.chairmatch.de/api/reviews'

function submit(body: Record<string, unknown>) {
  return reviewsPost(postRequest(REVIEWS_URL, body))
}

/**
 * Zweiter Salon und die abgeschlossenen Buchungen leben NUR hier, nicht im
 * gemeinsamen Seed: dort zaehlen andere Tests Buchungen ab, und ein zweiter
 * Salon desselben Inhabers laesst jedes `.eq('owner_id', …).single()`
 * mehrdeutig werden.
 */
function seedReviewWorld(): void {
  db().rows('salons').push({
    id: IDS.salonZwei,
    name: 'Salon Zweitplatz',
    slug: 'salon-zweitplatz',
    category: 'friseur',
    city: 'Berlin',
    owner_id: IDS.otherCustomer,
    is_active: true,
    is_verified: true,
    avg_rating: 0,
    review_count: 0,
    subscription_tier: 'free',
  })

  const abgeschlossen = (id: string, customerId: string, salonId: string, tag: string): Row => ({
    id,
    customer_id: customerId,
    salon_id: salonId,
    service_id: IDS.service,
    staff_id: null,
    booking_date: tag,
    start_time: '09:00:00',
    end_time: '10:00:00',
    status: 'completed',
    payment_status: 'paid',
    price_cents: 5000,
    created_at: '2026-08-01T09:00:00.000Z',
  })

  db().rows('bookings').push(
    abgeschlossen(IDS.bookingCompleted, IDS.customer, IDS.salon, '2026-08-10'),
    abgeschlossen(IDS.bookingCompletedFremd, IDS.otherCustomer, IDS.salon, '2026-08-11'),
    abgeschlossen(IDS.bookingCompletedSalonZwei, IDS.customer, IDS.salonZwei, '2026-08-12'),
  )
}

/** Unveroeffentlichte Miet-Bewertung — traegt salon_id, ist aber double-blind. */
function seedRentalReview(overrides: Row = {}): Row {
  const row: Row = {
    id: '77770000-0000-4000-8000-000000000001',
    reviewer_id: IDS.otherCustomer,
    reviewee_user_id: IDS.owner,
    customer_id: IDS.otherCustomer,
    salon_id: IDS.salon,
    booking_id: IDS.rentalConfirmed,
    review_type: 'tenant_to_provider',
    rating: 1,
    comment: 'Noch nicht freigeschaltet',
    published: false,
    visible_at: null,
    created_at: '2026-08-26T10:00:00.000Z',
    ...overrides,
  }
  db().rows('reviews').push(row)
  return row
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  seedReviewWorld()
  state.session = sessionFor('customer')
})

// ────────────────────────────────────────────────────────────────
describe('Bewertung abgeben (POST /api/reviews)', () => {
  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    const res = await submit({ salonId: IDS.salon, rating: 5, comment: 'Top' })
    expect(res.status).toBe(401)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('speichert eine Bewertung mit Typ, Reviewer und published-Flag', async () => {
    const res = await submit({ salonId: IDS.salon, rating: 5, comment: 'Sehr gut' })
    expect(res.status).toBe(201)

    const review = db().rows('reviews')[0]
    expect(review).toMatchObject({
      customer_id: IDS.customer,
      reviewer_id: IDS.customer,
      review_type: 'customer_to_salon',
      salon_id: IDS.salon,
      rating: 5,
      published: true,
    })
    // Ohne reviewer_id/review_type greift der Unique-Index
    // reviews_unique_per_reviewer_booking nicht — deshalb explizit geprueft.
    expect(review.reviewer_id).not.toBeNull()
    expect(review.visible_at).toBeTruthy()
  })

  it('laesst dieselbe Person denselben Salon nicht zweimal frei bewerten', async () => {
    expect((await submit({ salonId: IDS.salon, rating: 5 })).status).toBe(201)

    const res = await submit({ salonId: IDS.salon, rating: 1 })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/bereits bewertet/i)
    expect(db().rows('reviews')).toHaveLength(1)
    expect(db().row('salons', IDS.salon)?.avg_rating).toBe(5)
  })

  it('erlaubt einer zweiten Person weiterhin eine eigene Bewertung', async () => {
    await submit({ salonId: IDS.salon, rating: 5 })
    state.session = sessionFor('otherCustomer')
    expect((await submit({ salonId: IDS.salon, rating: 3 })).status).toBe(201)
    expect(db().rows('reviews')).toHaveLength(2)
    expect(db().row('salons', IDS.salon)?.avg_rating).toBe(4)
  })

  it('akzeptiert die eigene abgeschlossene Buchung als Beleg', async () => {
    const res = await submit({
      salonId: IDS.salon,
      bookingId: IDS.bookingCompleted,
      rating: 4,
    })
    expect(res.status).toBe(201)
    expect(db().rows('reviews')[0]?.booking_id).toBe(IDS.bookingCompleted)
  })

  it('weist eine FREMDE Buchung ab, statt in ihrem Namen zu bewerten', async () => {
    const res = await submit({
      salonId: IDS.salon,
      bookingId: IDS.bookingCompletedFremd,
      rating: 1,
    })
    expect(res.status).toBe(400)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('verraet nicht, ob die fremde Buchung ueberhaupt existiert', async () => {
    const fremd = await submit({
      salonId: IDS.salon,
      bookingId: IDS.bookingCompletedFremd,
      rating: 1,
    })
    const erfunden = await submit({
      salonId: IDS.salon,
      bookingId: IDS.unknown,
      rating: 1,
    })
    expect(await fremd.json()).toEqual(await erfunden.json())
  })

  it('laesst eine Buchung bei Salon A nicht als Beleg fuer Salon B durchgehen', async () => {
    const res = await submit({
      salonId: IDS.salon,
      bookingId: IDS.bookingCompletedSalonZwei,
      rating: 1,
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht zu diesem Salon/i)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('verlangt eine abgeschlossene Buchung', async () => {
    const res = await submit({
      salonId: IDS.salon,
      bookingId: IDS.bookingConfirmed,
      rating: 5,
    })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/abgeschlossener Buchung/i)
  })

  it('bewertet dieselbe Buchung nicht zweimal', async () => {
    await submit({ salonId: IDS.salon, bookingId: IDS.bookingCompleted, rating: 5 })
    const res = await submit({ salonId: IDS.salon, bookingId: IDS.bookingCompleted, rating: 1 })
    expect(res.status).toBe(400)
    expect(db().rows('reviews')).toHaveLength(1)
  })

  it('weist Bewertungen ausserhalb von 1–5 ab', async () => {
    expect((await submit({ salonId: IDS.salon, rating: 0 })).status).toBe(400)
    expect((await submit({ salonId: IDS.salon, rating: 6 })).status).toBe(400)
    expect((await submit({ salonId: IDS.salon, rating: 4.5 })).status).toBe(400)
    expect(db().rows('reviews')).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Miet-Bewertungen bleiben aus der Salon-Ansicht heraus', () => {
  it('liefert unveroeffentlichte Miet-Bewertungen nicht oeffentlich aus', async () => {
    seedRentalReview()
    await submit({ salonId: IDS.salon, rating: 5, comment: 'Kundenbewertung' })

    const res = await reviewsGet(getRequest(`${REVIEWS_URL}?salonId=${IDS.salon}`))
    const list = (await res.json()) as { comment: string; review_type: string | null }[]

    expect(list).toHaveLength(1)
    expect(list[0].comment).toBe('Kundenbewertung')
    expect(list.some(r => r.review_type === 'tenant_to_provider')).toBe(false)
  })

  it('haelt auch bereits freigeschaltete Miet-Bewertungen aus der Salon-Liste heraus', async () => {
    seedRentalReview({ published: true, visible_at: '2026-08-27T00:00:00.000Z' })

    const res = await reviewsGet(getRequest(`${REVIEWS_URL}?salonId=${IDS.salon}`))
    expect(await res.json()).toEqual([])
  })

  it('mittelt Miet-Bewertungen nicht in die Salon-Sterne ein', async () => {
    seedRentalReview({ rating: 1 })

    await submit({ salonId: IDS.salon, rating: 5 })

    const salon = db().row('salons', IDS.salon)
    expect(salon?.avg_rating).toBe(5)
    expect(salon?.review_count).toBe(1)
  })

  it('haelt sie auch aus dem oeffentlichen Aggregat heraus', async () => {
    seedRentalReview({ rating: 1 })
    await submit({ salonId: IDS.salon, rating: 4 })

    const res = await aggregateGet(
      getRequest(`https://www.chairmatch.de/api/reviews/aggregate?salonId=${IDS.salon}`),
    )
    expect(await res.json()).toEqual({ avgRating: 4, reviewCount: 1 })
  })

  it('zaehlt Altzeilen ohne Typ weiterhin als Kundenbewertung', async () => {
    // Zeilen, die createReview vor dem Fix geschrieben hat: kein review_type,
    // published=false. Sie duerfen durch den neuen Filter nicht verschwinden.
    db().rows('reviews').push({
      id: '77770000-0000-4000-8000-000000000009',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      booking_id: null,
      review_type: null,
      published: false,
      rating: 3,
      comment: 'Altbestand',
      created_at: '2026-06-01T10:00:00.000Z',
    })

    const res = await reviewsGet(getRequest(`${REVIEWS_URL}?salonId=${IDS.salon}`))
    const list = (await res.json()) as { comment: string }[]
    expect(list.map(r => r.comment)).toEqual(['Altbestand'])

    const agg = await aggregateGet(
      getRequest(`https://www.chairmatch.de/api/reviews/aggregate?salonId=${IDS.salon}`),
    )
    expect(await agg.json()).toEqual({ avgRating: 3, reviewCount: 1 })
  })
})

// ────────────────────────────────────────────────────────────────
describe('Antwort auf eine Bewertung (POST /api/reviews/[id]/reply)', () => {
  it('laesst nur den Saloninhaber antworten', async () => {
    await submit({ salonId: IDS.salon, rating: 5 })
    const reviewId = db().rows('reviews')[0].id as string

    const { POST: replyRoute } = await import('@/app/api/reviews/[id]/reply/route')

    // Fremde Person
    state.session = sessionFor('otherCustomer')
    const fremd = await replyRoute(
      postRequest(`${REVIEWS_URL}/${reviewId}/reply`, { reply: 'Danke!' }),
      { params: Promise.resolve({ id: reviewId }) },
    )
    // 403, nicht 400: die Route machte bis Track 15 aus JEDEM Fehlschlag der
    // Action einen Eingabefehler — „nicht angemeldet" und „keine
    // Berechtigung" waren fuer den Aufrufer nicht zu unterscheiden.
    expect(fremd.status).toBe(403)
    expect(db().row('reviews', reviewId)?.reply).toBeUndefined()

    // Inhaber
    state.session = sessionFor('owner')
    const inhaber = await replyRoute(
      postRequest(`${REVIEWS_URL}/${reviewId}/reply`, { reply: 'Danke fuer das Feedback!' }),
      { params: Promise.resolve({ id: reviewId }) },
    )
    expect(inhaber.status).toBe(200)
    expect(db().row('reviews', reviewId)?.reply).toBe('Danke fuer das Feedback!')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Selbstbewertung des eigenen Salons', () => {
  /**
   * `checkEligibility` hat den Salon bis Track 15 NIE geladen — und damit nie
   * gefragt, wem er gehoert. Der Weg ohne Buchungsbezug hat keine
   * Vorbedingung ausser „noch nicht bewertet", also genuegte dem Inhaber ein
   * POST /api/reviews mit der eigenen salonId.
   *
   * Die Zeile entsteht mit `published: true` (Kundenbewertungen sind nicht
   * double-blind), und `updateSalonRating` schreibt sie danach nach
   * `salons.avg_rating` und `salons.review_count`. Genau diese beiden Werte
   * stehen als AggregateRating im JSON-LD der Salonseite, auf den Kacheln der
   * Startseite und in der Suche.
   */
  it('der Inhaber kann seinen eigenen Salon nicht bewerten', async () => {
    const vorher = db().row('salons', IDS.salon)
    const ratingVorher = vorher?.avg_rating
    const countVorher = vorher?.review_count

    state.session = sessionFor('owner')
    const res = await submit({ salonId: IDS.salon, rating: 5, comment: 'Bester Salon!' })

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/eigenen Salon/i)

    // Weder eine Zeile noch eine verschobene Kennzahl.
    expect(db().rows('reviews')).toHaveLength(0)
    const nachher = db().row('salons', IDS.salon)
    expect(nachher?.avg_rating).toBe(ratingVorher)
    expect(nachher?.review_count).toBe(countVorher)
  })

  it('eine Bewertung zu einem Salon, den es nicht gibt, entsteht nicht', async () => {
    const res = await submit({ salonId: IDS.unknown, rating: 5 })

    expect(res.status).toBe(400)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('eine fremde Kundin bewertet weiter — die Sperre trifft nur den Inhaber', async () => {
    state.session = sessionFor('customer')
    const res = await submit({ salonId: IDS.salon, rating: 4, comment: 'Sehr zufrieden' })

    expect(res.status).toBe(201)
    expect(db().rows('reviews')).toHaveLength(1)
  })
})
