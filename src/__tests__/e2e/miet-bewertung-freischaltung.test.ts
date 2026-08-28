// @vitest-environment node
/**
 * E2E: der VOLLE Weg einer Miet-Bewertung — abgeben → unsichtbar bleiben →
 * freigeschaltet werden → oeffentlich erscheinen.
 *
 * Track 22 hat die Ursache behoben (der Cron schaltet selbst frei, statt
 * `publish_review_pair()` zu rufen, das in `bookings` statt in
 * `rental_bookings` sucht). Belegt war danach das VERHALTEN DES CRON — dass
 * er zaehlt, was er wirklich geschrieben hat, und bei Ausfall 503 meldet.
 *
 * Nicht belegt war die WIRKUNG, und genau darum geht es hier: dass eine
 * einseitig abgegebene Bewertung nach 14 Tagen tatsaechlich in der
 * oeffentlichen Antwort von `GET /api/reviews/rental?userId=…` auftaucht.
 * Das ist die Zusage, die die Oberflaeche woertlich gibt:
 *
 *     „… sichtbar, sobald beide Seiten bewertet haben (spaetestens nach
 *      14 Tagen)."
 *
 * Der Test laeuft ueber DREI Endpunkte in ihrer echten Reihenfolge —
 * Abgabe (POST), Hintergrundlauf (Cron), oeffentliche Sicht (GET) — und
 * ueber echte Zeit: die Uhr wird zwischen den Schritten vorgestellt. Ein
 * Test, der nur `published` in der Tabelle umschaltet, haette den Befund aus
 * Track 22 nicht gefunden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, postRequest, rawRequest, getRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

process.env.CRON_SECRET ??= 'cron-test-secret'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as { user: { id: string; email: string; name: string; role: string } } | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({ auth: async () => state.session }))

import { POST as rentalReviewPost, GET as rentalReviewGet } from '@/app/api/reviews/rental/route'
import { GET as publishReviewsCron } from '@/app/api/cron/publish-reviews/route'

const CRON_HEADERS = { authorization: `Bearer ${process.env.CRON_SECRET}` }

/** Beendete Miet-Buchung: die Mieterin hatte den Stuhl des Inhabers. */
const MIETE = '88888888-8888-4888-8888-88888888aaaa'

function db(): FakeSupabase {
  return state.db
}

function cronLauf() {
  return publishReviewsCron(
    rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', { headers: CRON_HEADERS }),
  )
}

/** Oeffentliche Sicht auf die Bewertungen ueber eine Person. */
async function oeffentlicheBewertungen(userId: string) {
  const res = await rentalReviewGet(
    getRequest(`https://www.chairmatch.de/api/reviews/rental?userId=${userId}`),
  )
  return (await res.json()).reviews as Array<{ reviewType: string; rating: number }>
}

/** Die Bewertungszeile, die die Mieterin abgegeben hat. */
function bewertungDerMieterin(): Row | undefined {
  return db()
    .rows('reviews')
    .find(r => r.booking_id === MIETE && r.reviewer_id === IDS.customer)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // Die Buchung endete am 31.08.; bewertet wird ab dem 01.09.
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))

  state.db = createDb()
  state.session = sessionFor('customer')

  db().replace('reviews', [])
  db().rows('rental_bookings').push({
    id: MIETE,
    equipment_id: IDS.equipment,
    renter_id: IDS.customer,
    start_date: '2026-08-25',
    end_date: '2026-08-31',
    total_cents: 30000,
    status: 'completed',
    payment_status: 'paid',
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Einseitige Bewertung — die 14-Tage-Freischaltung', () => {
  it('bleibt direkt nach der Abgabe unsichtbar (double blind)', async () => {
    const res = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
        comment: 'Sehr freundlicher Vermieter.',
      }),
    )

    expect(res.status).toBe(201)
    const zeile = bewertungDerMieterin()
    expect(zeile?.published).toBe(false)
    expect(zeile?.visible_at).toBeNull()
    expect(zeile?.review_type).toBe('tenant_to_provider')

    // Die bewertete Person sieht davon oeffentlich noch nichts.
    expect(await oeffentlicheBewertungen(IDS.owner)).toHaveLength(0)
  })

  it('bleibt am 13. Tag weiterhin unsichtbar', async () => {
    await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )

    vi.setSystemTime(new Date('2026-09-13T03:30:00.000Z'))
    const res = await cronLauf()

    expect(res.status).toBe(200)
    expect((await res.json()).published).toBe(0)
    expect(bewertungDerMieterin()?.published).toBe(false)
    expect(await oeffentlicheBewertungen(IDS.owner)).toHaveLength(0)
  })

  it('wird nach 14 Tagen freigeschaltet UND oeffentlich sichtbar', async () => {
    await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
        comment: 'Sehr freundlicher Vermieter.',
      }),
    )

    // 14 Tage weiter — der naechtliche Lauf kommt vorbei.
    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))
    const res = await cronLauf()

    expect(res.status).toBe(200)
    const bericht = await res.json()
    expect(bericht.ok).toBe(true)
    expect(bericht.published).toBe(1)
    expect(bericht.processed_bookings).toBe(1)

    // Zustand der Zeile …
    const zeile = bewertungDerMieterin()
    expect(zeile?.published).toBe(true)
    expect(zeile?.visible_at).not.toBeNull()

    // … und das, worauf es dem Produkt nach ankommt: sie ist jetzt da.
    const sichtbar = await oeffentlicheBewertungen(IDS.owner)
    expect(sichtbar).toHaveLength(1)
    expect(sichtbar[0].rating).toBe(5)
    expect(sichtbar[0].reviewType).toBe('tenant_to_provider')
  })

  it('schaltet beim zweiten Lauf nicht erneut frei (Doppelzaehlung)', async () => {
    await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 4,
      }),
    )
    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))

    const ersterLauf = await (await cronLauf()).json()
    expect(ersterLauf.published).toBe(1)

    const zweiterLauf = await (await cronLauf()).json()
    // Nichts mehr offen: die Zeile ist raus aus der `published=false`-Menge.
    expect(zweiterLauf.published).toBe(0)

    // Und die oeffentliche Sicht zeigt sie genau EINMAL.
    expect(await oeffentlicheBewertungen(IDS.owner)).toHaveLength(1)
  })
})

describe('Der Cron fasst nur an, was ihn angeht', () => {
  it('laesst Salon-Bewertungen (Kundin → Salon) unberuehrt', async () => {
    // Eine gewoehnliche Salon-Bewertung, aelter als 14 Tage und noch nicht
    // publiziert. Sie folgt einer anderen Regel und darf hier nicht
    // mitgenommen werden.
    db().rows('reviews').push({
      id: '99999999-9999-4999-8999-99999999bbbb',
      reviewer_id: IDS.otherCustomer,
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      review_type: 'customer_to_salon',
      booking_id: IDS.bookingCompleted,
      rating: 3,
      published: false,
      visible_at: null,
      created_at: '2026-08-01T10:00:00.000Z',
    })

    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))
    const bericht = await (await cronLauf()).json()

    expect(bericht.published).toBe(0)
    expect(db().row('reviews', '99999999-9999-4999-8999-99999999bbbb')?.published).toBe(false)
  })

  it('weist einen Lauf ohne gueltiges Cron-Secret mit 401 ab', async () => {
    await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )
    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))

    const res = await publishReviewsCron(
      rawRequest('https://www.chairmatch.de/api/cron/publish-reviews', {
        headers: { authorization: 'Bearer falsch' },
      }),
    )

    expect(res.status).toBe(401)
    expect(bewertungDerMieterin()?.published).toBe(false)
  })

  it('meldet 503 statt „nichts zu tun", wenn die Abfrage ausfaellt', async () => {
    db().failOn('reviews', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))
    const res = await cronLauf()

    expect(res.status).toBe(503)
    expect((await res.json()).ok).toBe(false)
  })
})

describe('Beidseitige Bewertung', () => {
  it('beide Richtungen entstehen als Entwurf und werden gemeinsam freigeschaltet', async () => {
    // Mieterin bewertet den Anbieter …
    await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )

    // … und der Anbieter die Mieterin.
    state.session = sessionFor('owner')
    const res = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 4,
      }),
    )
    expect(res.status).toBe(201)

    const beide = db().rows('reviews').filter(r => r.booking_id === MIETE)
    expect(beide).toHaveLength(2)
    expect(beide.map(r => r.review_type).sort()).toEqual([
      'provider_to_tenant',
      'tenant_to_provider',
    ])

    // Ohne angewendete Migration schaltet `publish_review_pair()` hier nichts
    // frei (die Funktion sucht in `bookings`). Der Cron ist die Schicht, die
    // ohne Migrationslauf traegt — und er holt BEIDE Richtungen.
    vi.setSystemTime(new Date('2026-09-16T03:30:00.000Z'))
    const bericht = await (await cronLauf()).json()
    expect(bericht.published).toBe(2)
    // Zwei Bewertungen, aber nur EINE Buchung.
    expect(bericht.processed_bookings).toBe(1)

    expect(await oeffentlicheBewertungen(IDS.owner)).toHaveLength(1)
    expect(await oeffentlicheBewertungen(IDS.customer)).toHaveLength(1)
  })

  it('dieselbe Person bewertet dieselbe Miete nicht zweimal', async () => {
    const ersteAbgabe = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )
    expect(ersteAbgabe.status).toBe(201)

    // Der UNIQUE-Index (reviewer_id, booking_id) meldet 23505; die Route
    // macht daraus eine erklaerende 409, keinen Serverfehler.
    db().addUniqueIndex('reviews', ['reviewer_id', 'booking_id'])

    const zweiteAbgabe = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 1,
      }),
    )

    expect(zweiteAbgabe.status).toBe(409)
    expect(db().rows('reviews').filter(r => r.booking_id === MIETE)).toHaveLength(1)
  })
})

describe('Berechtigung zur Abgabe', () => {
  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    const res = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )
    expect(res.status).toBe(401)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('lehnt eine Person ab, die an der Buchung nicht beteiligt ist', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )

    expect(res.status).toBe(403)
    expect(db().rows('reviews')).toHaveLength(0)
  })

  it('lehnt eine Bewertung vor dem Ende der Buchung ab', async () => {
    // Zurueck auf einen Tag, an dem die Miete noch laeuft.
    vi.setSystemTime(new Date('2026-08-28T09:00:00.000Z'))

    const res = await rentalReviewPost(
      postRequest('https://www.chairmatch.de/api/reviews/rental', {
        bookingId: MIETE,
        rating: 5,
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nach dem Ende/)
    expect(db().rows('reviews')).toHaveLength(0)
  })
})
