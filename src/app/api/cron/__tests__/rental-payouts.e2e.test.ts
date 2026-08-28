// @vitest-environment node
/**
 * E2E: Miet-Auszahlung (GET /api/cron/rental-payouts).
 *
 * Der Cron ist die Stelle, an der ChairMatch Geld AUS der Hand gibt: er
 * ueberweist `provider_share_cents` an den Connect-Account des Anbieters,
 * sobald der Mietbeginn erreicht ist. Bis Track 16 hat er dafuer
 * ausschliesslich die eigenen Spalten befragt (`rental_bookings.status`,
 * `payment_status`) — nie die Charge, aus der das Geld kommt. Zwei Loecher
 * steckten darin:
 *
 *  - Eine Rueckbuchung (Chargeback) wurde vom Webhook ueberhaupt nicht
 *    verarbeitet: die Buchung blieb 'confirmed'/'paid', und der Cron zahlte
 *    den vollen Anbieteranteil aus, nachdem Stripe das Geld bereits wieder
 *    eingezogen hatte.
 *  - Eine Teilerstattung setzt seit Track 16 bewusst keinen Storno mehr
 *    (siehe payment-flow.test.ts) — ohne diese Pruefung waere daraus die
 *    Auszahlung des VOLLEN Anteils auf einen teilweise zurueckgezahlten
 *    Betrag geworden.
 *
 * Dazu der Connect-Account-Lookup, der mit `.maybeSingle()` auf zwei Zeilen
 * still zu „kein Account" wurde und den Anbieter damit dauerhaft von jeder
 * Auszahlung ausgeschlossen hat, ohne dass irgendwo etwas stand.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, rawRequest, IDS } from '@/__tests__/e2e/_harness/fixtures'
import { createStripeHarness } from '@/__tests__/e2e/_harness/stripe-harness'
import type { FakeSupabase } from '@/__tests__/e2e/_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('@/__tests__/e2e/_harness/fake-supabase').FakeSupabase,
  stripe: undefined as unknown as ReturnType<
    typeof import('@/__tests__/e2e/_harness/stripe-harness').createStripeHarness
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  getStripe: () => state.stripe.stripe,
}))

import { GET as payoutCron } from '@/app/api/cron/rental-payouts/route'

const CRON_SECRET = 'cron_test_secret'

function db(): FakeSupabase {
  return state.db
}

function cronRequest(auth: string | null = `Bearer ${CRON_SECRET}`) {
  const headers: Record<string, string> = {}
  if (auth) headers.authorization = auth
  return rawRequest('https://www.chairmatch.de/api/cron/rental-payouts', { headers })
}

/**
 * Fixture-Ausgangslage: die Miete aus `IDS.rentalConfirmed` ist bezahlt, die
 * Plattform-Transaktion steht auf 'succeeded' ohne Transfer. Faellig wird sie,
 * sobald der Mietbeginn erreicht ist, und ausgezahlt wird sie nur mit einem
 * Connect-Account, dessen Payouts aktiv sind.
 */
function auszahlungsreif(): void {
  db().row('rental_bookings', IDS.rentalConfirmed)!.start_date = '2026-08-01'
  const account = db()
    .rows('provider_stripe_accounts')
    .find(a => a.user_id === IDS.owner)!
  account.payouts_enabled = true
  account.details_submitted = true
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T04:00:00.000Z'))
  process.env.CRON_SECRET = CRON_SECRET
  state.db = createDb()
  state.stripe = createStripeHarness()
  auszahlungsreif()
})

afterEach(() => {
  vi.useRealTimers()
  delete process.env.CRON_SECRET
})

describe('Autorisierung', () => {
  it('antwortet ohne Bearer-Token mit 401 und zahlt nichts aus', async () => {
    const res = await payoutCron(cronRequest(null))
    expect(res.status).toBe(401)
    expect(state.stripe.transfers).toHaveLength(0)
  })
})

describe('Regulaere Auszahlung', () => {
  it('ueberweist den Anbieteranteil und merkt den Transfer an der Transaktion', async () => {
    const res = await payoutCron(cronRequest())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.transferred).toBe(1)
    expect(state.stripe.transfers).toEqual([
      { amount: 31500, destination: 'acct_test_owner', sourceTransaction: 'ch_pi_test_bestand' },
    ])
    expect(db().row('platform_transactions', IDS.transaction)?.stripe_transfer_id).toBe('tr_test_1')
    // Mietbeginn erreicht → laufende Miete
    expect(db().row('rental_bookings', IDS.rentalConfirmed)?.status).toBe('active')
  })

  it('zahlt vor dem Mietbeginn noch nicht aus', async () => {
    db().row('rental_bookings', IDS.rentalConfirmed)!.start_date = '2026-12-01'
    const body = await (await payoutCron(cronRequest())).json()
    expect(body.transferred).toBe(0)
    expect(state.stripe.transfers).toHaveLength(0)
  })
})

describe('Der Zustand der Charge entscheidet mit (Track 16)', () => {
  it('haelt die Auszahlung bei einer Teilerstattung zurueck', async () => {
    state.stripe.paymentIntentsRetrieve.mockResolvedValueOnce({
      id: 'pi_test_bestand',
      latest_charge: {
        id: 'ch_pi_test_bestand',
        amount: 35000,
        amount_refunded: 500,
        refunded: false,
        disputed: false,
      },
    })

    const body = await (await payoutCron(cronRequest())).json()

    expect(body.transferred).toBe(0)
    expect(state.stripe.transfers).toHaveLength(0)
    expect(body.errors.join(' ')).toMatch(/erstattet/)
    expect(db().row('platform_transactions', IDS.transaction)?.stripe_transfer_id).toBeFalsy()
  })

  it('haelt die Auszahlung bei einer Rueckbuchung zurueck', async () => {
    state.stripe.paymentIntentsRetrieve.mockResolvedValueOnce({
      id: 'pi_test_bestand',
      latest_charge: {
        id: 'ch_pi_test_bestand',
        amount: 35000,
        amount_refunded: 0,
        refunded: false,
        disputed: true,
      },
    })

    const body = await (await payoutCron(cronRequest())).json()

    expect(body.transferred).toBe(0)
    expect(state.stripe.transfers).toHaveLength(0)
    expect(body.errors.join(' ')).toMatch(/angefochten/)
  })

  it('haelt die Auszahlung bei vollstaendiger Erstattung zurueck', async () => {
    state.stripe.paymentIntentsRetrieve.mockResolvedValueOnce({
      id: 'pi_test_bestand',
      latest_charge: {
        id: 'ch_pi_test_bestand',
        amount: 35000,
        amount_refunded: 35000,
        refunded: true,
        disputed: false,
      },
    })

    const body = await (await payoutCron(cronRequest())).json()
    expect(body.transferred).toBe(0)
    expect(state.stripe.transfers).toHaveLength(0)
  })
})

describe('Connect-Account des Anbieters (Track 16)', () => {
  it('zahlt nichts aus, wenn dem Anbieter zwei Konten zugeordnet sind', async () => {
    db().rows('provider_stripe_accounts').push({
      id: '14141414-1414-4141-8141-141414141415',
      user_id: IDS.owner,
      stripe_account_id: 'acct_test_owner_2',
      charges_enabled: true,
      payouts_enabled: true,
      details_submitted: true,
    })

    const body = await (await payoutCron(cronRequest())).json()

    expect(body.transferred).toBe(0)
    expect(state.stripe.transfers).toHaveLength(0)
    // Vorher war dieser Zustand unsichtbar: `.maybeSingle()` lieferte
    // PGRST116, der Fehler wurde nicht angesehen, und die Transaktion fiel
    // stillschweigend als „kein Connect-Account" durch.
    expect(body.errors.join(' ')).toMatch(/Connect-Accounts/)
  })

  it('macht einen Lesefehler sichtbar, statt ihn als „kein Konto" zu lesen', async () => {
    db().failOn('provider_stripe_accounts', 'select', {
      code: '08006',
      message: 'connection to server failed',
      details: null,
      hint: null,
    })

    const body = await (await payoutCron(cronRequest())).json()

    expect(body.transferred).toBe(0)
    expect(body.errors.join(' ')).toMatch(/nicht lesbar/)
  })
})
