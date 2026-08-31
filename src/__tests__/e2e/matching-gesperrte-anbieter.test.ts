// @vitest-environment node
/**
 * E2E: POST /api/match empfiehlt keine gesperrten Anbieter mehr.
 *
 * DER BEFUND
 *
 * `is_active = false` ist die Plattform-Sperre, die ein Admin auf
 * /admin/anbieter setzt („Sperren" / „Offline setzen"). Track 15 hat sie in
 * die Geldstrecken gezogen (createBooking, rental-bookings, rental-requests
 * — alle fail closed ueber `checkSalonAcceptsBusiness`), Track 15 ausserdem
 * in die Mietsuche `/api/rental-listings`, Track 20 in die oeffentliche
 * Salonseite, die seitdem mit 404 antwortet.
 *
 * `/api/match` ist dabei uebersehen worden. Die Route fragt dieselbe Tabelle
 * wie die Mietsuche, filterte aber nur `is_available` — die Eigenschaft des
 * INSERATS, nicht die des Betriebs. Ein gesperrter Salon wurde damit von der
 * Plattform aktiv WEITEREMPFOHLEN: mit Namen, Bewertung, Verifiziert-Haken
 * und einem Score, der ihn auf Platz eins setzen konnte. Der Link daneben
 * fuehrte auf eine Salonseite, die seit Track 20 nicht mehr existiert.
 *
 * Das ist die unangenehmere Haelfte des Befunds: der Nutzer bekam keine
 * kaputte Liste, sondern eine Empfehlung — die Form, in der die Plattform
 * fuer einen Anbieter einsteht.
 *
 * DIE GRENZE DES FILTERS
 *
 * Bewusst nur bei einem AUSDRUECKLICHEN `false`, wie in
 * /api/rental-listings und aus demselben Grund: ein „im Zweifel raus" wuerde
 * beim Ausfall der Einbettung jedes Ergebnis verschlucken und dem Nutzer
 * „keine Treffer" zeigen, ohne dass jemand etwas gesperrt haette. Die
 * Geldstrecken sind fail closed, eine Vorschlagsliste ist es nicht — sie
 * bucht nichts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, postRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))

import { POST as matchRoute } from '@/app/api/match/route'

function db(): FakeSupabase {
  return state.db
}

const SALON_GESPERRT = '44444444-4444-4444-8444-4444444444f0'
const EQUIP_GESPERRT = '77777777-7777-4777-8777-7777777777f0'
const SALON_OHNE_FLAG = '44444444-4444-4444-8444-4444444444f1'
const EQUIP_OHNE_FLAG = '77777777-7777-4777-8777-7777777777f1'
const EQUIP_OHNE_SALON = '77777777-7777-4777-8777-7777777777f2'

/** Suchkriterien, die auf die Berliner Friseur-Inserate der Fixtures passen. */
const SUCHE = {
  beruf: 'friseur',
  stadt: 'Berlin',
  budgetProTagCents: 9000,
  arbeitstageProWoche: 4,
  mietdauer: 'tageweise',
} as const

type Treffer = { id: string; salonName: string | null; verified: boolean; rating: number | null }

async function suchen(kriterien: Record<string, unknown> = SUCHE): Promise<Treffer[]> {
  const res = await matchRoute(postRequest('https://www.chairmatch.de/api/match', kriterien))
  expect(res.status).toBe(200)
  const json = (await res.json()) as { results: Treffer[] }
  return json.results
}

function inserat(id: string, salonId: string, name: string): Row {
  return {
    id,
    salon_id: salonId,
    type: 'stuhl',
    name,
    description: null,
    price_per_day_cents: 4000,
    price_per_month_cents: null,
    is_available: true,
    images: [],
  }
}

beforeEach(() => {
  state.db = createDb()

  // Ein gesperrter Salon — ansonsten in jeder Hinsicht attraktiv: gute
  // Bewertung, verifiziert, in der gesuchten Stadt. Genau so einer stand
  // vorher oben in der Liste.
  db().rows('salons').push({
    id: SALON_GESPERRT,
    name: 'Salon Gesperrt',
    slug: 'salon-gesperrt',
    category: 'friseur',
    city: 'Berlin',
    owner_id: IDS.owner,
    is_active: false,
    is_verified: true,
    avg_rating: 5.0,
    review_count: 120,
  })
  db().rows('rental_equipment').push(inserat(EQUIP_GESPERRT, SALON_GESPERRT, 'Stuhl Gesperrt'))
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
describe('Ein gesperrter Salon wird nicht empfohlen', () => {
  it('laesst sein Inserat aus den Treffern heraus', async () => {
    const treffer = await suchen()
    expect(treffer.map(t => t.id)).not.toContain(EQUIP_GESPERRT)
  })

  it('empfiehlt ihn auch dann nicht, wenn er der bestbewertete Treffer waere', async () => {
    const treffer = await suchen()

    // 5,0 bei 120 Bewertungen und verifiziert — ohne den Filter stuende er
    // vorn. Der Platz eins gehoert jetzt einem Salon, der auch offen hat.
    expect(treffer.length).toBeGreaterThan(0)
    expect(treffer[0].id).not.toBe(EQUIP_GESPERRT)
  })

  it('gibt weder Name noch Bewertung des gesperrten Salons preis', async () => {
    const treffer = await suchen()
    const roh = JSON.stringify(treffer)

    // Der Filter darf nicht nur den Score kappen: Name, Verifiziert-Haken
    // und Bewertung sind genau das, was die Empfehlung ausmacht.
    expect(roh).not.toContain('Salon Gesperrt')
    expect(roh).not.toContain('salon-gesperrt')
  })

  it('meldet keine Treffer, wenn nur gesperrte Anbieter passen wuerden', async () => {
    // Alle regulaeren Berliner Inserate weg — uebrig bleibt der gesperrte.
    db().rows('rental_equipment').length = 0
    db().rows('rental_equipment').push(inserat(EQUIP_GESPERRT, SALON_GESPERRT, 'Stuhl Gesperrt'))

    const treffer = await suchen()
    expect(treffer).toEqual([])
  })

  it('haelt ihn auch dann heraus, wenn sein Inserat verfuegbar gemeldet ist', async () => {
    // `is_available` gehoert dem Anbieter, `is_active` der Plattform. Der
    // gesperrte Betrieb kann seine Inserate weiter auf „verfuegbar" stellen —
    // das war der Grund, warum der alte Filter ihn durchliess.
    const zeile = db()
      .rows('rental_equipment')
      .find(r => r.id === EQUIP_GESPERRT)!
    expect(zeile.is_available).toBe(true)

    const treffer = await suchen()
    expect(treffer.map(t => t.id)).not.toContain(EQUIP_GESPERRT)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Der Filter trifft nur die Gesperrten', () => {
  it('empfiehlt einen aktiven Salon unveraendert weiter', async () => {
    const treffer = await suchen()
    expect(treffer.map(t => t.id)).toContain(IDS.equipment)
  })

  it('liefert die Angaben des aktiven Salons vollstaendig mit', async () => {
    const treffer = await suchen()
    const eigener = treffer.find(t => t.id === IDS.equipment)!
    expect(eigener.salonName).toBe('Salon Sonnenschein')
    expect(eigener.verified).toBe(true)
    expect(eigener.rating).toBe(4.6)
  })

  it('behaelt einen Salon ohne gesetztes is_active — fehlend ist nicht gesperrt', async () => {
    // Altbestand: Zeilen, die vor Einfuehrung der Spalte entstanden sind.
    // Sie sind nicht gesperrt worden, es hat sie nur nie jemand angefasst.
    db().rows('salons').push({
      id: SALON_OHNE_FLAG,
      name: 'Salon Altbestand',
      slug: 'salon-altbestand',
      category: 'friseur',
      city: 'Berlin',
      owner_id: IDS.owner,
      is_verified: false,
      avg_rating: 4.1,
      review_count: 7,
    })
    db()
      .rows('rental_equipment')
      .push(inserat(EQUIP_OHNE_FLAG, SALON_OHNE_FLAG, 'Stuhl Altbestand'))

    const treffer = await suchen()
    expect(treffer.map(t => t.id)).toContain(EQUIP_OHNE_FLAG)
  })

  it('verschluckt kein Inserat, dessen Salon-Einbettung leer bleibt', async () => {
    // Die Vorschlagsliste ist bewusst nicht fail closed: faellt die
    // Einbettung aus, wuerde ein „im Zweifel raus" dem Nutzer „keine
    // Treffer" zeigen, ohne dass jemand etwas gesperrt haette.
    db()
      .rows('rental_equipment')
      .push(inserat(EQUIP_OHNE_SALON, IDS.unknown, 'Stuhl ohne Salon'))

    const treffer = await suchen()
    expect(treffer.map(t => t.id)).toContain(EQUIP_OHNE_SALON)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Die uebrigen Filter der Route bleiben, wie sie waren', () => {
  it('blendet ein pausiertes Inserat eines aktiven Salons weiterhin aus', async () => {
    const treffer = await suchen()
    expect(treffer.map(t => t.id)).not.toContain(IDS.equipmentUnavailable)
  })

  it('antwortet bei einem DB-Ausfall weiter mit leerer Liste statt 500', async () => {
    db().failOn('rental_equipment', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    const res = await matchRoute(postRequest('https://www.chairmatch.de/api/match', SUCHE))
    expect(res.status).toBe(200)
    const json = (await res.json()) as { results: unknown[]; hinweis?: string }
    expect(json.results).toEqual([])
    expect(json.hinweis).toBeTruthy()
  })

  it('weist unvollstaendige Kriterien weiter mit 400 ab', async () => {
    const res = await matchRoute(
      postRequest('https://www.chairmatch.de/api/match', { beruf: 'friseur', stadt: 'B' }),
    )
    expect(res.status).toBe(400)
  })
})
