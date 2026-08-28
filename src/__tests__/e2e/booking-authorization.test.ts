// @vitest-environment node
/**
 * Autorisierung im Buchungs-Flow.
 *
 * Diese Suite haelt die Luecke fest, die am 27.08.2026 geschlossen wurde:
 * die Actions in `booking.actions.ts` haben den Aufrufer nie mit der Buchung
 * in Beziehung gesetzt.
 *
 *   - `cancelBooking` schloss aus "nicht der Kunde" auf "also der Anbieter" —
 *     jede fremde eingeloggte Person konnte jede Buchung stornieren, und zwar
 *     mit den weiter reichenden Anbieter-Rechten.
 *   - `confirmBooking` / `completeBooking` / `markNoShow` pruefen gar nichts.
 *   - `getBookings()` ohne Filter gab mit dem Service-Role-Client alle
 *     Buchungen der Plattform zurueck.
 *
 * Getestet wird gegen die echten Handler und Actions; ersetzt sind nur
 * Supabase und die Session (siehe _harness/).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, postRequest, ctx, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
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
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  stripe: {},
  createBookingCheckout: async () => ({ id: 'cs_test_fremd', url: 'https://checkout.stripe.com/cs_test_fremd' }),
  createSubscriptionCheckout: async () => ({ id: 'cs_test_sub', url: 'https://checkout.stripe.com/cs_test_sub' }),
  createProductOrderCheckout: async () => ({ id: 'cs_test_order', url: 'https://checkout.stripe.com/cs_test_order' }),
  createRentalCheckout: async () => ({ id: 'cs_test_rental', url: 'https://checkout.stripe.com/cs_test_rental' }),
}))

import { POST as cancelRoute } from '@/app/api/bookings/[id]/cancel/route'
import { POST as checkoutRoute } from '@/app/api/stripe/checkout/route'
import { PATCH as patchRoute } from '@/app/api/bookings/[id]/route'
import {
  cancelBooking,
  confirmBooking,
  completeBooking,
  markNoShow,
  getBookings,
} from '@/modules/booking/booking.actions'

function db(): FakeSupabase {
  return state.db
}

function bookingRow(id: string): Row {
  const row = db().row('bookings', id)
  if (!row) throw new Error(`Buchung ${id} nicht in der Fake-DB`)
  return row
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Fremde Buchung stornieren (POST /api/bookings/[id]/cancel)', () => {
  it('antwortet einer unbeteiligten Kundin mit 403 und laesst die Buchung stehen', async () => {
    state.session = sessionFor('otherCustomer')
    const id = IDS.bookingConfirmed

    const res = await cancelRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${id}/cancel`, {
        reason: 'nicht meine Buchung',
      }),
      ctx({ id }),
    )

    expect(res.status).toBe(403)
    expect(bookingRow(id).status).toBe('confirmed')
    expect(bookingRow(id).cancellation_reason).toBeNull()
  })

  it('schreibt bei verweigerter Stornierung kein Audit-Log', async () => {
    state.session = sessionFor('otherCustomer')
    await cancelRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(db().rows('audit_logs').filter(a => a.action === 'BOOKING_CANCELLED')).toHaveLength(0)
  })

  it('laesst Kundin, Saloninhaber und Admin weiterhin stornieren', async () => {
    for (const who of ['customer', 'owner', 'admin'] as const) {
      state.db = createDb()
      state.session = sessionFor(who)
      const res = await cancelRoute(
        postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
        ctx({ id: IDS.bookingConfirmed }),
      )
      expect(res.status, `Rolle ${who}`).toBe(200)
      expect(bookingRow(IDS.bookingConfirmed).status).toBe('cancelled')
    }
  })

  it('vermerkt die Kundin als "customer" und nicht als "provider"', async () => {
    state.session = sessionFor('customer')
    await cancelRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
      ctx({ id: IDS.bookingConfirmed }),
    )
    const audit = db().rows('audit_logs').find(a => a.action === 'BOOKING_CANCELLED')
    expect((audit?.details as { actor: string }).actor).toBe('customer')
  })

  it('verweigert die Action auch beim Direktaufruf ohne Route-Handler', async () => {
    state.session = sessionFor('otherCustomer')
    const result = await cancelBooking({ bookingId: IDS.bookingConfirmed })
    expect(result).toMatchObject({ status: 403 })
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('confirmed')
  })

  it('verweigert die Action ohne Session mit 401', async () => {
    state.session = null
    const result = await cancelBooking({ bookingId: IDS.bookingConfirmed })
    expect(result).toMatchObject({ status: 401 })
  })
})

// ────────────────────────────────────────────────────────────────
describe('Statuswechsel durch Unbeteiligte', () => {
  const cases = [
    ['confirmBooking', confirmBooking],
    ['completeBooking', completeBooking],
    ['markNoShow', markNoShow],
  ] as const

  it.each(cases)('%s verweigert einer fremden Kundin den Zugriff', async (_name, action) => {
    state.session = sessionFor('otherCustomer')
    const result = await action(IDS.bookingConfirmed)
    expect(result).toMatchObject({ status: 403 })
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('confirmed')
  })

  it.each(cases)('%s verweigert auch der eigenen Kundin den Zugriff', async (_name, action) => {
    // Der Kunde ist Beteiligter, darf den Status aber nicht selbst setzen.
    state.session = sessionFor('customer')
    const result = await action(IDS.bookingConfirmed)
    expect(result).toMatchObject({ status: 403 })
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('confirmed')
  })

  it('laesst den Saloninhaber den Termin abschliessen', async () => {
    state.session = sessionFor('owner')
    const result = await completeBooking(IDS.bookingConfirmed)
    expect(result).toEqual({ success: true })
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('completed')
  })

  it('gibt der fremden Kundin ueber PATCH weiterhin 403', async () => {
    state.session = sessionFor('otherCustomer')
    const res = await patchRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}`, {
        newStatus: 'completed',
      }),
      ctx({ id: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(403)
    expect(bookingRow(IDS.bookingConfirmed).status).toBe('confirmed')
  })
})

// ────────────────────────────────────────────────────────────────
describe('getBookings() als Server Action', () => {
  it('gibt ohne Session nichts zurueck', async () => {
    state.session = null
    expect(await getBookings()).toEqual([])
  })

  it('gibt ohne Filter nur die eigenen Buchungen zurueck', async () => {
    db().rows('bookings').push({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      service_id: IDS.service,
      booking_date: '2026-09-20',
      start_time: '12:00:00',
      end_time: '13:00:00',
      status: 'confirmed',
      price_cents: 5000,
      created_at: '2026-08-21T09:00:00.000Z',
    })

    state.session = sessionFor('customer')
    const rows = (await getBookings()) as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].customer_id).toBe(IDS.customer)
  })

  it('ignoriert einen fremden customerId-Filter', async () => {
    state.session = sessionFor('customer')
    expect(await getBookings({ customerId: IDS.otherCustomer })).toEqual([])
  })

  it('verweigert den salonId-Filter fuer einen fremden Salon', async () => {
    state.session = sessionFor('otherCustomer')
    expect(await getBookings({ salonId: IDS.salon })).toEqual([])
  })

  it('erlaubt dem Saloninhaber die Buchungen seines Salons', async () => {
    state.session = sessionFor('owner')
    const rows = (await getBookings({ salonId: IDS.salon })) as Row[]
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.bookingConfirmed)
  })

  it('laesst Admins plattformweit lesen', async () => {
    state.session = sessionFor('admin')
    const rows = (await getBookings()) as Row[]
    expect(rows).toHaveLength(1)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Checkout zu einer fremden Buchung (POST /api/stripe/checkout)', () => {
  const url = 'https://www.chairmatch.de/api/stripe/checkout'

  it('findet die fremde Buchung nicht und laesst sie unangetastet', async () => {
    // Regression: der booking-Zweig fragte nur nach der ID. Die Antwort war
    // eine gueltige Stripe-URL zum Termin eines Dritten — und das Update
    // darunter hat dessen payment_status und stripe_session_id ueberschrieben.
    const before = { ...bookingRow(IDS.bookingConfirmed) }
    state.session = sessionFor('otherCustomer')

    const res = await checkoutRoute(
      postRequest(url, { type: 'booking', bookingId: IDS.bookingConfirmed }),
    )

    expect(res.status).toBe(404)
    const after = bookingRow(IDS.bookingConfirmed)
    expect(after.payment_status).toBe(before.payment_status)
    expect(after.stripe_session_id ?? null).toBe(before.stripe_session_id ?? null)
  })

  it('gibt der eigenen Kundin weiterhin eine Checkout-URL', async () => {
    state.session = sessionFor('customer')
    const res = await checkoutRoute(
      postRequest(url, { type: 'booking', bookingId: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).url).toContain('checkout.stripe.com')
    expect(bookingRow(IDS.bookingConfirmed).payment_status).toBe('pending')
  })

  it('laesst eine bereits bezahlte Buchung nicht erneut bezahlen', async () => {
    bookingRow(IDS.bookingConfirmed).payment_status = 'paid'
    state.session = sessionFor('customer')
    const res = await checkoutRoute(
      postRequest(url, { type: 'booking', bookingId: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(409)
    expect(bookingRow(IDS.bookingConfirmed).payment_status).toBe('paid')
  })

  it('laesst eine stornierte Buchung nicht bezahlen', async () => {
    bookingRow(IDS.bookingConfirmed).status = 'cancelled'
    state.session = sessionFor('customer')
    const res = await checkoutRoute(
      postRequest(url, { type: 'booking', bookingId: IDS.bookingConfirmed }),
    )
    expect(res.status).toBe(409)
  })
})
