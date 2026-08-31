// @vitest-environment node
/**
 * E2E: Absage und Ablehnung eines Termins — Track C.
 *
 * Drei Befunde dieser Runde, alle am selben Pfad:
 *
 *  1. Der Anbieter konnte eine OFFENE Anfrage nicht ablehnen. `pending ->
 *     cancelled` stand in `VALID_TRANSITIONS` nur fuer `customer`, und
 *     `PATCH /api/bookings/[id]` kannte den Zielstatus `cancelled` gar
 *     nicht. Eine Anfrage, die der Salon nicht annehmen kann, blieb offen
 *     stehen — und `pending` belegt den Slot (`BLOCKING_STATUSES`).
 *
 *  2. Alle vier Statuswechsel schrieben `update(...)` ohne die Antwort
 *     auszuwerten und meldeten danach bedingungslos Erfolg. supabase-js wirft
 *     bei DB-Fehlern nicht, es gibt `{ error }` zurueck: ein Rechte- oder
 *     Verbindungsfehler ergab „Termin bestaetigt" bei unveraenderter Zeile.
 *
 *  3. Eine Absage benachrichtigte NIEMANDEN — weder den Kunden, dem der
 *     Salon abgesagt hat, noch den Salon, dessen Kunde abgesagt hat.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, postRequest, rawRequest, ctx, IDS, BUSY_DAY } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  emails: {
    provider: [] as { to: string; type: string; details: Record<string, unknown> }[],
    cancellation: [] as { to: string; details: Record<string, unknown> }[],
  },
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async () => ({ ok: true }),
  sendProviderNotification: async (to: string, type: string, details: Record<string, unknown>) => {
    state.emails.provider.push({ to, type, details })
    return { ok: true }
  },
  sendBookingCancellation: async (to: string, details: Record<string, unknown>) => {
    state.emails.cancellation.push({ to, details })
    return { ok: true }
  },
}))

import { PATCH as patchBookingRoute } from '@/app/api/bookings/[id]/route'
import { POST as cancelBookingRoute } from '@/app/api/bookings/[id]/cancel/route'

function db(): FakeSupabase {
  return state.db
}

function patchRequest(url: string, body: unknown) {
  return rawRequest(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', origin: 'https://www.chairmatch.de' },
    body: JSON.stringify(body),
  })
}

const OFFEN = '66666666-6666-4666-8666-66666666aaaa'

/** Eine zweite Buchung im Status `pending` — die Anfrage, die abgelehnt wird. */
function seedOffeneAnfrage(): Row {
  const row: Row = {
    id: OFFEN,
    customer_id: IDS.customer,
    salon_id: IDS.salon,
    service_id: IDS.service,
    staff_id: null,
    booking_date: BUSY_DAY,
    start_time: '14:00:00',
    end_time: '15:00:00',
    status: 'pending',
    payment_status: 'unpaid',
    price_cents: 5000,
    notes: null,
    cancellation_reason: null,
    created_at: '2026-08-22T09:00:00.000Z',
  }
  db().rows('bookings').push(row)
  return row
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('owner')
  state.emails.provider.length = 0
  state.emails.cancellation.length = 0
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Der Anbieter kann eine offene Anfrage ablehnen', () => {
  it('PATCH cancelled setzt den Status und gibt den Slot frei', async () => {
    seedOffeneAnfrage()

    const res = await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${OFFEN}`, {
        newStatus: 'cancelled',
        reason: 'An dem Tag im Urlaub',
      }),
      ctx({ id: OFFEN }),
    )

    expect(res.status).toBe(200)
    expect(db().row('bookings', OFFEN)?.status).toBe('cancelled')
    expect(db().row('bookings', OFFEN)?.cancellation_reason).toBe('An dem Tag im Urlaub')
  })

  it('benachrichtigt die Kundin — in der App und per Mail, mit Grund', async () => {
    seedOffeneAnfrage()

    await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${OFFEN}`, {
        newStatus: 'cancelled',
        reason: 'Krankheitsfall',
      }),
      ctx({ id: OFFEN }),
    )

    const nachrichten = db()
      .rows('notification_log')
      .filter(n => n.user_id === IDS.customer)
    expect(nachrichten.length).toBe(1)
    expect(String(nachrichten[0].title)).toContain('abgesagt')
    expect(nachrichten[0].reference_id).toBe(OFFEN)

    expect(state.emails.cancellation.length).toBe(1)
    expect(state.emails.cancellation[0].to).toBe('kundin@example.de')
    expect(state.emails.cancellation[0].details.cancelledBy).toBe('provider')
    expect(state.emails.cancellation[0].details.reason).toBe('Krankheitsfall')
  })

  it('sagt auch einen bereits bestaetigten Termin ab', async () => {
    const res = await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}`, {
        newStatus: 'cancelled',
      }),
      ctx({ id: IDS.bookingConfirmed }),
    )

    expect(res.status).toBe(200)
    expect(db().row('bookings', IDS.bookingConfirmed)?.status).toBe('cancelled')
  })

  it('ein fremder Anbieter darf nicht absagen', async () => {
    seedOffeneAnfrage()
    state.session = sessionFor('otherCustomer')

    const res = await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${OFFEN}`, { newStatus: 'cancelled' }),
      ctx({ id: OFFEN }),
    )

    expect(res.status).toBe(403)
    expect(db().row('bookings', OFFEN)?.status).toBe('pending')
  })
})

describe('Die Kundin sagt ab — der Salon erfaehrt es', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  it('legt eine Benachrichtigung fuer den Saloninhaber an und schickt ihm eine Mail', async () => {
    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {
        reason: 'Doch keine Zeit',
      }),
      ctx({ id: IDS.bookingConfirmed }),
    )

    expect(res.status).toBe(200)

    const anInhaber = db()
      .rows('notification_log')
      .filter(n => n.user_id === IDS.owner)
    expect(anInhaber.length).toBe(1)
    expect(String(anInhaber[0].body)).toContain('abgesagt')

    expect(state.emails.provider.map(m => m.type)).toContain('cancellation')
    expect(state.emails.provider[0].to).toBe('inhaber@example.de')
  })
})

describe('Ein fehlgeschlagener Statuswechsel meldet keinen Erfolg', () => {
  it('bestaetigen: DB-Fehler wird 503, der Status bleibt pending', async () => {
    seedOffeneAnfrage()
    db().failOn('bookings', 'update', {
      code: '42501',
      message: 'permission denied for table bookings',
      details: null,
      hint: null,
    })

    const res = await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${OFFEN}`, { newStatus: 'confirmed' }),
      ctx({ id: OFFEN }),
    )

    expect(res.status).toBe(503)
    expect(db().row('bookings', OFFEN)?.status).toBe('pending')
  })

  it('absagen: DB-Fehler wird 503, der Status bleibt stehen — und niemand wird benachrichtigt', async () => {
    state.session = sessionFor('customer')
    db().failOn('bookings', 'update', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    })

    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${IDS.bookingConfirmed}/cancel`, {}),
      ctx({ id: IDS.bookingConfirmed }),
    )

    expect(res.status).toBe(503)
    expect(db().row('bookings', IDS.bookingConfirmed)?.status).toBe('confirmed')
    expect(state.emails.provider.length).toBe(0)
    expect(db().rows('notification_log').length).toBe(0)
  })

  it('ein Wechsel auf einen inzwischen anderen Status meldet 409 statt Erfolg', async () => {
    seedOffeneAnfrage()
    // Zwischen Lesen und Schreiben faellt der Status auf `cancelled` —
    // die Bestaetigung darf danach nichts mehr melden.
    db().raceBefore('bookings', 'update', () => {
      const row = db().row('bookings', OFFEN)
      if (row) row.status = 'cancelled'
    })

    const res = await patchBookingRoute(
      patchRequest(`https://www.chairmatch.de/api/bookings/${OFFEN}`, { newStatus: 'confirmed' }),
      ctx({ id: OFFEN }),
    )

    expect(res.status).toBe(409)
    expect(db().row('bookings', OFFEN)?.status).toBe('cancelled')
  })
})
