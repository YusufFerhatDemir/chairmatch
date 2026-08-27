// @vitest-environment node
/**
 * Track 8, zweite Runde.
 *
 * A) DASHBOARD-ZAHLEN. Auf allen drei Rollen-Dashboards standen die Kennzahlen
 *    fest im Quelltext — bei jedem Nutzer dieselben:
 *
 *      /anbieter/mein-salon    Termine heute 12 · Bewertung 4,9 · Umsatz 480 EUR
 *      /vermieter/mein-inserat Anfragen offen 5 · Buchungen 22 · Umsatz 90 EUR
 *      /mieter/mein-bereich    Anfragen offen 8 · Bestaetigt 2 · Ø Tag 85 EUR
 *
 *    Dazu Badges ("5 offene Anfragen", "3 neue Bewertungen"), die wie offene
 *    Vorgaenge aussahen. Seit Track 7 liegt hinter der Anfragen-Kachel die
 *    echte Liste — ein Vermieter mit Badge 5 fand dort null.
 *
 * B) MERKLISTE. /api/favorites las `const { data } = …` ohne `error` und
 *    antwortete bei jedem Datenbankfehler `{ favorites: [] }` mit HTTP 200:
 *    "kaputt" und "leer" waren nicht zu unterscheiden. Dieselbe Bauart hat in
 *    Track 6/7 schon Termine und Anfragen verschwinden lassen.
 *
 * Getestet wird gegen die echten Handler; ersetzt sind nur Supabase und die
 * Session (siehe _harness/).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, getRequest, postRequest, IDS } from './_harness/fixtures'
import { pgError } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  signOut: async () => undefined,
}))

import { GET as statsRoute } from '@/app/api/me/dashboard-stats/route'
import { GET as favGet, POST as favPost } from '@/app/api/favorites/route'

const HEUTE = new Date().toISOString().slice(0, 10)
const MONATSSTART = (() => {
  const j = new Date()
  return new Date(Date.UTC(j.getUTCFullYear(), j.getUTCMonth(), 1)).toISOString().slice(0, 10)
})()

beforeEach(() => {
  state.db = createDb()
  state.session = null
})

// ══════════════════════════════════════════════════════════════════════
// A) Dashboard-Zahlen
// ══════════════════════════════════════════════════════════════════════

describe('GET /api/me/dashboard-stats', () => {
  it('gibt ohne Anmeldung keine Zahlen heraus', async () => {
    const res = await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=anbieter'))
    expect(res.status).toBe(401)
  })

  it('weist eine unbekannte Rolle ab, statt irgendetwas zu liefern', async () => {
    state.session = sessionFor('owner')
    const res = await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=chef'))
    expect(res.status).toBe(400)
  })

  it('zaehlt fuer den Anbieter nur die Termine von heute', async () => {
    state.session = sessionFor('owner')
    state.db.rows('bookings').push(
      { id: 'b-heute-1', salon_id: IDS.salon, booking_date: HEUTE, status: 'confirmed', payment_status: 'unpaid', price_cents: 4000 },
      { id: 'b-heute-2', salon_id: IDS.salon, booking_date: HEUTE, status: 'pending', payment_status: 'unpaid', price_cents: 3000 },
      // storniert zaehlt nicht mit
      { id: 'b-heute-3', salon_id: IDS.salon, booking_date: HEUTE, status: 'cancelled', payment_status: 'unpaid', price_cents: 9900 },
    )
    const res = await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=anbieter'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.termineHeute).toBe(2)
  })

  it('zaehlt als Umsatz nur, was wirklich bezahlt wurde', async () => {
    state.session = sessionFor('owner')
    state.db.rows('bookings').push(
      { id: 'b-bez', salon_id: IDS.salon, booking_date: MONATSSTART, status: 'confirmed', payment_status: 'paid', price_cents: 7000 },
      { id: 'b-offen', salon_id: IDS.salon, booking_date: MONATSSTART, status: 'confirmed', payment_status: 'unpaid', price_cents: 5000 },
      { id: 'b-storno', salon_id: IDS.salon, booking_date: MONATSSTART, status: 'cancelled', payment_status: 'paid', price_cents: 12000 },
    )
    const body = await (await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=anbieter'))).json()
    // Nur die eine bezahlte, nicht stornierte Buchung.
    expect(body.umsatzMonatCents).toBe(7000)
  })

  it('nimmt die Bewertung aus dem Salon und erfindet keine', async () => {
    state.session = sessionFor('owner')
    const body = await (await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=anbieter'))).json()
    expect(body.bewertung).toBe(4.6)
    expect(body.bewertungAnzahl).toBe(31)
    // Der alte Quelltext behauptete 4,9 fuer jeden.
    expect(body.bewertung).not.toBe(4.9)
  })

  it('sagt "kein Salon", statt Zahlen zu einem nicht vorhandenen Salon zu bilden', async () => {
    state.session = sessionFor('customer')
    const body = await (await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=anbieter'))).json()
    expect(body.hasSalon).toBe(false)
    expect(body.umsatzMonatCents).toBeUndefined()
  })

  it('zaehlt fuer den Vermieter nur die an ihn gerichteten offenen Anfragen', async () => {
    state.session = sessionFor('owner')
    state.db.rows('rental_requests').push(
      { id: 'r1', recipient_id: IDS.owner, requester_id: IDS.customer, status: 'open' },
      { id: 'r2', recipient_id: IDS.owner, requester_id: IDS.customer, status: 'accepted' },
      // fremde Anfrage — darf nicht mitgezaehlt werden
      { id: 'r3', recipient_id: IDS.otherCustomer, requester_id: IDS.customer, status: 'open' },
    )
    const body = await (await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=vermieter'))).json()
    expect(body.anfragenOffen).toBe(1)
  })

  it('gibt dem Mieter nur seine eigenen Anfragen und keinen erfundenen Tagespreis', async () => {
    state.session = sessionFor('customer')
    state.db.rows('rental_requests').push(
      { id: 'r1', requester_id: IDS.customer, recipient_id: IDS.owner, status: 'open' },
      { id: 'r2', requester_id: IDS.customer, recipient_id: IDS.owner, status: 'accepted' },
      { id: 'r3', requester_id: IDS.otherCustomer, recipient_id: IDS.owner, status: 'open' },
    )
    const body = await (await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=mieter'))).json()
    expect(body.anfragenOffen).toBe(1)
    expect(body.anfragenBestaetigt).toBe(1)
    // Es gibt keine belastbare Quelle — also null, keine Schaetzung.
    expect(body.durchschnittTagCents).toBeNull()
  })

  it('meldet einen Datenbankfehler, statt Nullen zu liefern', async () => {
    state.session = sessionFor('customer')
    state.db.failOn('rental_requests', 'select', pgError('42501', 'permission denied'))
    const res = await statsRoute(getRequest('http://x/api/me/dashboard-stats?role=mieter'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.anfragenOffen).toBeUndefined()
  })
})

// ══════════════════════════════════════════════════════════════════════
// B) Merkliste
// ══════════════════════════════════════════════════════════════════════

describe('/api/favorites', () => {
  it('verlangt fuer Aenderungen eine Anmeldung', async () => {
    const res = await favPost(postRequest('http://x/api/favorites', { salonId: IDS.salon, action: 'add' }))
    expect(res.status).toBe(401)
  })

  it('nimmt den Besitzer aus der Session, nicht aus dem Request', async () => {
    state.session = sessionFor('customer')
    // Ein mitgeschicktes customer_id darf nichts bewirken.
    await favPost(
      postRequest('http://x/api/favorites', {
        salonId: IDS.salon,
        action: 'add',
        customer_id: IDS.otherCustomer,
      }),
    )
    const zeilen = state.db.rows('favorites')
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0].customer_id).toBe(IDS.customer)
  })

  it('weist eine ID ab, die keine UUID ist', async () => {
    state.session = sessionFor('customer')
    const res = await favPost(postRequest('http://x/api/favorites', { salonId: 'pfusch', action: 'add' }))
    expect(res.status).toBe(400)
    expect(state.db.rows('favorites')).toHaveLength(0)
  })

  it('verlangt genau ein Ziel — nicht beide, nicht keines', async () => {
    state.session = sessionFor('customer')
    const beide = await favPost(
      postRequest('http://x/api/favorites', { salonId: IDS.salon, equipmentId: IDS.equipment, action: 'add' }),
    )
    expect(beide.status).toBe(400)
    const keines = await favPost(postRequest('http://x/api/favorites', { action: 'add' }))
    expect(keines.status).toBe(400)
  })

  it('meldet eine unbekannte Ziel-ID als 404, nicht als Serverfehler', async () => {
    state.session = sessionFor('customer')
    state.db.failOn('favorites', 'insert', pgError('23503', 'insert violates foreign key constraint'))
    const res = await favPost(
      postRequest('http://x/api/favorites', { salonId: '44444444-4444-4444-8444-40000000dead', action: 'add' }),
    )
    expect(res.status).toBe(404)
  })

  it('sagt klar, wenn equipment_id noch nicht in der Datenbank steht', async () => {
    // 42703 = Spalte fehlt. Vorher waere das ein nacktes 500 gewesen, das wie
    // ein Serverausfall aussieht — dabei fehlt nur die Migration.
    state.session = sessionFor('customer')
    state.db.failOn('favorites', 'insert', pgError('42703', 'column favorites.equipment_id does not exist'))
    const res = await favPost(
      postRequest('http://x/api/favorites', { equipmentId: IDS.equipment, action: 'add' }),
    )
    expect(res.status).toBe(503)
  })

  it('meldet beim Lesen einen Datenbankfehler, statt eine leere Merkliste vorzugeben', async () => {
    state.session = sessionFor('customer')
    state.db.failOn('favorites', 'select', pgError('42501', 'permission denied for table favorites'))
    const res = await favGet()
    expect(res.status).toBe(500)
    const body = await res.json()
    // Der alte Code antwortete hier 200 mit { favorites: [] }.
    expect(body.favorites).toBeUndefined()
  })

  it('unterscheidet "nicht angemeldet" von "nichts gemerkt"', async () => {
    const res = await favGet()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.authenticated).toBe(false)
  })
})
