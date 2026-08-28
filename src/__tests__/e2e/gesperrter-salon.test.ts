// @vitest-environment node
/**
 * E2E: der gesperrte Salon — Track 15.
 *
 * `salons.is_active` ist der einzige Hebel, mit dem die Plattform einen
 * Anbieter anhalten kann. /admin/anbieter schreibt ihn an zwei Stellen:
 * „Sperren" (`salon-status` → `suspended`) und „Offline setzen"
 * (`salon-toggle-active`). Das ist die Reaktion auf Betrug, Beschwerden oder
 * eine fehlende Gewerbeanmeldung.
 *
 * Bis Track 15 hat dieser Hebel NUR die Schaufenster geschlossen. Die
 * oeffentlichen Listen filtern mit `.eq('is_active', true)` — Startseite,
 * Suche, Stadt- und Kategorieseiten. Jede Strecke, auf der Geld oder eine
 * Verpflichtung entsteht, hat `salons` dagegen ueberhaupt nicht angefasst:
 *
 *   - `createBooking` laedt `services` und den Salon NIE.
 *   - `/api/availability` bot weiter das volle Slot-Raster an.
 *   - `/api/rental-listings` war die EINZIGE oeffentliche Liste ohne den
 *     Filter — die Inserate des gesperrten Salons blieben im Marktplatz.
 *   - `/api/rental-bookings` legte eine echte Stripe-Checkout-Session an; der
 *     Payout-Cron ueberweist das Geld beim Mietbeginn an genau den Anbieter,
 *     den die Plattform gesperrt hat.
 *   - `/api/rental-requests` stellte ihm weiter Anfragen samt E-Mail zu.
 *
 * Die Tests unten FUEHREN das aus: Salon sperren, dann jede Strecke
 * anfassen. Und sie halten die beiden Faelle fest, in denen bewusst NICHT
 * gesperrt wird — `is_active: null` und ein noch nicht freigeschalteter
 * (`is_verified: false`) Salon.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  getRequest,
  ctx,
  IDS,
} from './_harness/fixtures'
import { createStripeHarness } from './_harness/stripe-harness'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
  /** Was der Vermieter zu sehen bekaeme — In-App und per Mail. */
  notifications: [] as Array<{ userId: string; title: string }>,
  landlordMails: [] as Array<{ requestId: string; recipientId: string }>,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async () => ({ ok: true }),
  sendProviderNotification: async () => ({ ok: true }),
}))
vi.mock('@/lib/notifications', () => ({
  NOTIFICATION_TABLE: 'notification_log',
  createNotification: async (userId: string, title: string) => {
    state.notifications.push({ userId, title })
    return { ok: true }
  },
}))
vi.mock('@/lib/rental-request-email', () => ({
  notifyLandlordOfRentalRequest: async (args: { requestId: string; recipientId: string }) => {
    state.landlordMails.push({ requestId: args.requestId, recipientId: args.recipientId })
    return { ok: true }
  },
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  get stripe() {
    return state.stripe.stripe
  },
  createRentalCheckout: (...args: unknown[]) => state.stripe.createRentalCheckout(...args),
  createBookingCheckout: (...args: unknown[]) => state.stripe.createBookingCheckout(...args),
  createRefund: (...args: unknown[]) => state.stripe.createRefund(...args),
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
}))

import { POST as createBookingRoute } from '@/app/api/bookings/route'
import { GET as availabilityRoute } from '@/app/api/availability/route'
import { POST as createRentalRoute } from '@/app/api/rental-bookings/route'
import { POST as rentalRequestRoute } from '@/app/api/rental-requests/route'
import { GET as rentalListingsRoute } from '@/app/api/rental-listings/route'
import { GET as equipmentDetailRoute } from '@/app/api/rental-equipment/[id]/route'

function db(): FakeSupabase {
  return state.db
}

const BASE = 'https://www.chairmatch.de'
/** Zukunftstag ohne Bestandsbuchung (die Suite friert „heute" auf 2026-09-01 ein). */
const TERMIN = '2026-09-16'

/** Der Zustand, den /admin/anbieter mit „Sperren" schreibt. */
function salonSperren(): void {
  const salon = db().row('salons', IDS.salon)
  if (!salon) throw new Error('Salon nicht in der Fake-DB')
  salon.is_active = false
}

function setSalon(feld: string, wert: unknown): void {
  const salon = db().row('salons', IDS.salon)
  if (!salon) throw new Error('Salon nicht in der Fake-DB')
  salon[feld] = wert
}

const terminBody = {
  salonId: IDS.salon,
  serviceId: IDS.service,
  date: TERMIN,
  startTime: '10:00',
}

const mietBody = {
  equipmentId: IDS.equipment,
  startDate: '2026-09-20',
  endDate: '2026-09-24',
}

function anfrageBody(): Row {
  return {
    equipmentId: IDS.equipment,
    requestType: 'miete',
    preferredDate: '2026-09-25',
    durationUnit: 'day',
    units: 3,
    message: 'Ich haette Interesse an drei Probetagen.',
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
  state.notifications.length = 0
  state.landlordMails.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Termine: der gesperrte Salon nimmt keine mehr an', () => {
  it('POST /api/bookings legt fuer einen gesperrten Salon keine Buchung an', async () => {
    salonSperren()
    const vorher = db().rows('bookings').length

    const res = await createBookingRoute(postRequest(`${BASE}/api/bookings`, terminBody), undefined)

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/keine Buchungen/i)
    // Der eigentliche Beweis: es ist NICHTS entstanden.
    expect(db().rows('bookings')).toHaveLength(vorher)
  })

  it('GET /api/availability bietet dem gesperrten Salon keine Slots mehr an', async () => {
    // Oeffnungszeiten stehen nicht im gemeinsamen Seed; ohne sie antwortet
    // die Route fuer jeden Salon mit `slots: []` und der Test waere auch
    // dann gruen, wenn die Sperre gar nicht greift. Format wie in
    // src/lib/opening-hours.ts — 2026-09-16 ist ein Mittwoch.
    setSalon('opening_hours', {
      Mo: '09:00 - 18:00',
      Di: '09:00 - 18:00',
      Mi: '09:00 - 18:00',
      Do: '09:00 - 18:00',
      Fr: '09:00 - 18:00',
      Sa: 'Geschlossen',
      So: 'Geschlossen',
    })

    const offen = await availabilityRoute(
      getRequest(
        `${BASE}/api/availability?salonId=${IDS.salon}&serviceId=${IDS.service}&date=${TERMIN}`,
      ),
    )
    const offenJson = (await offen.json()) as { slots: string[] }
    // Vorbedingung: ohne Sperre gibt es echte Slots — sonst wuerde der Test
    // unten auch dann gruen, wenn die Slot-Rechnung selbst kaputt ist.
    expect(offenJson.slots.length).toBeGreaterThan(0)

    salonSperren()
    const res = await availabilityRoute(
      getRequest(
        `${BASE}/api/availability?salonId=${IDS.salon}&serviceId=${IDS.service}&date=${TERMIN}`,
      ),
    )
    const json = (await res.json()) as { slots: string[]; unavailable?: string }
    expect(json.slots).toEqual([])
    expect(json.unavailable).toBe('salon_inactive')
  })

  it('ein aktiver Salon bleibt buchbar — die Sperre ist kein Rundumschlag', async () => {
    const res = await createBookingRoute(postRequest(`${BASE}/api/bookings`, terminBody), undefined)

    expect(res.status).toBe(201)
    expect(db().rows('bookings').some(b => b.booking_date === TERMIN)).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Miete: kein Geld mehr fuer einen gesperrten Anbieter', () => {
  it('POST /api/rental-bookings erzeugt weder Buchung noch Stripe-Session', async () => {
    salonSperren()
    const vorher = db().rows('rental_bookings').length

    const res = await createRentalRoute(postRequest(`${BASE}/api/rental-bookings`, mietBody))

    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/keine Buchungen/i)
    expect(db().rows('rental_bookings')).toHaveLength(vorher)
    // Ohne diese Zeile bliebe der teuerste Teil des Befundes ungeprueft: die
    // Sperre muss VOR der Zahlung greifen, nicht danach.
    expect(state.stripe.createRentalCheckout).not.toHaveBeenCalled()
  })

  it('POST /api/rental-requests stellt dem gesperrten Anbieter nichts mehr zu', async () => {
    salonSperren()

    const res = await rentalRequestRoute(
      postRequest(`${BASE}/api/rental-requests`, anfrageBody()),
    )

    expect(res.status).toBe(409)
    expect(db().rows('rental_requests')).toHaveLength(0)
    expect(state.notifications).toHaveLength(0)
    expect(state.landlordMails).toHaveLength(0)
  })

  it('GET /api/rental-listings nimmt das Inserat aus der Mietsuche', async () => {
    const vorher = (await (
      await rentalListingsRoute(getRequest(`${BASE}/api/rental-listings`))
    ).json()) as { listings: Array<{ id: string }> }
    expect(vorher.listings.map(l => l.id)).toContain(IDS.equipment)

    salonSperren()

    const nachher = (await (
      await rentalListingsRoute(getRequest(`${BASE}/api/rental-listings`))
    ).json()) as { listings: Array<{ id: string }> }
    expect(nachher.listings.map(l => l.id)).not.toContain(IDS.equipment)
  })

  it('GET /api/rental-equipment/[id] laesst das Formular gar nicht erst aufgehen', async () => {
    salonSperren()

    const res = await equipmentDetailRoute(
      getRequest(`${BASE}/api/rental-equipment/${IDS.equipment}`),
      ctx({ id: IDS.equipment }),
    )

    expect(res.status).toBe(409)
  })

  it('ein aktiver Anbieter vermietet weiter', async () => {
    const res = await createRentalRoute(postRequest(`${BASE}/api/rental-bookings`, mietBody))

    expect(res.status).toBe(201)
    expect(state.stripe.createRentalCheckout).toHaveBeenCalled()
  })
})

// ────────────────────────────────────────────────────────────────
describe('Der selbst registrierte, nie freigeschaltete Salon', () => {
  /**
   * Der Zustand, den /api/register-provider schreibt:
   *
   *   is_active: false, is_verified: false
   *
   * Das ist NICHT nur der Admin-Hebel — es ist der Startzustand jedes
   * Anbieters, der sich selbst registriert. Das Admin-Dashboard zeigt ihn
   * als „suspended" und bietet „Freischalten" an, das beide Flags setzt.
   *
   * Damit war das Freischalt-Tor bisher eine Spalte ohne Verhalten: aus den
   * oeffentlichen Listen war so ein Salon schon ausgeschlossen (die filtern
   * alle `.eq('is_active', true)`), geblieben waren ihm die Mietsuche und
   * jeder Direktlink — und darueber nahm er echtes Geld entgegen.
   */
  beforeEach(() => {
    setSalon('is_active', false)
    setSalon('is_verified', false)
  })

  it('nimmt weder Termin noch Miete an', async () => {
    const termin = await createBookingRoute(
      postRequest(`${BASE}/api/bookings`, terminBody),
      undefined,
    )
    expect(termin.status).toBe(409)

    const miete = await createRentalRoute(postRequest(`${BASE}/api/rental-bookings`, mietBody))
    expect(miete.status).toBe(409)
    expect(state.stripe.createRentalCheckout).not.toHaveBeenCalled()
  })

  it('arbeitet nach dem Freischalten durch den Admin normal', async () => {
    // Was PATCH /api/admin mit `salon-status: 'approved'` schreibt.
    setSalon('is_active', true)
    setSalon('is_verified', true)

    const miete = await createRentalRoute(postRequest(`${BASE}/api/rental-bookings`, mietBody))
    expect(miete.status).toBe(201)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Was ausdruecklich NICHT sperrt', () => {
  /**
   * `is_active: null` ist kein Sperrvermerk, sondern ein ungesetztes Feld.
   * Der Wert laesst sich mit dem ANON-Key nicht auslesen (`salons` antwortet
   * fuer `anon` mit 42501), und aus „ich kenne den Default nicht" eine Sperre
   * zu machen hiesse, laufende Buchungen auf eine Vermutung hin abzuschalten.
   * Der Admin-Hebel schreibt immer einen echten Boolean.
   */
  it('is_active = null bucht weiter', async () => {
    setSalon('is_active', null)

    const res = await createBookingRoute(postRequest(`${BASE}/api/bookings`, terminBody), undefined)

    expect(res.status).toBe(201)
  })

  /**
   * `is_verified: false` bei `is_active: true` ist kein Registrierungs-Rest
   * (die Registrierung setzt BEIDE auf false), sondern ein vom Admin
   * ausdruecklich gewaehlter Zustand: `salon-status: 'pending'` nimmt die
   * Verifizierung zurueck und laesst `is_active` stehen. Massgeblich ist
   * dann `is_active` — das Wort, das der Admin zuletzt zum Arbeiten gesagt
   * hat. Ob ein Salon zusaetzlich verifiziert sein MUSS, um Geld
   * einzunehmen, ist eine Produktentscheidung; dieser Test haelt fest, wie
   * es HEUTE ist, nicht, dass es so bleiben muss.
   */
  it('is_verified = false bei aktivem Salon bucht und vermietet weiter', async () => {
    setSalon('is_verified', false)

    const termin = await createBookingRoute(postRequest(`${BASE}/api/bookings`, terminBody), undefined)
    expect(termin.status).toBe(201)

    const miete = await createRentalRoute(postRequest(`${BASE}/api/rental-bookings`, mietBody))
    expect(miete.status).toBe(201)
  })
})
