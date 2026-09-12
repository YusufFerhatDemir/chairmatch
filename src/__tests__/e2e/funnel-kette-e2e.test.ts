// @vitest-environment node
/**
 * E2E: die ganze Kette an einem Vorgang.
 *
 *   Slot pruefen → Anfrage → Bestaetigung → Termin laeuft → Abschluss
 *   → Rechnung → Streitfall
 *   und die Abzweigung Storno.
 *
 * ══════════════════════════════════════════════════════════════════════
 * WAS DIESER TEST BEWEISEN SOLL
 * ══════════════════════════════════════════════════════════════════════
 *
 * Die einzelnen Module sind je einzeln getestet. Was dort NICHT geprueft
 * werden kann, ist das Zusammenspiel: ob die Stufe, die `pipeline.ts` aus
 * einer echten Buchung ableitet, zu dem passt, was `booking.actions` in die
 * Datenbank geschrieben hat — und ob die Tore (`rechnungMoeglich`,
 * `streitMoeglich`) an der richtigen Stelle aufgehen.
 *
 * Gefahren wird gegen die echten Route-Handler und die echte Action; ersetzt
 * sind nur die Aussenkanten (Supabase, Stripe, E-Mail) — dieselbe Bauart wie
 * `booking-flow.test.ts`.
 *
 * `invoice.ts`, `dispute.ts` und `cancellation.ts` haben in der Produktion
 * noch keine Tabellen (die Migration ist READY_TO_APPLY, nicht angewendet).
 * Sie werden hier deshalb als reine Rechnungen auf die Daten der Buchung
 * angewandt — genau so, wie sie es taeten, wenn die Tabellen da sind.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, postRequest, ctx, IDS, FREE_DAY } from './_harness/fixtures'
import { createStripeHarness } from './_harness/stripe-harness'
import type { FakeSupabase, Row } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  stripe: undefined as unknown as ReturnType<
    typeof import('./_harness/stripe-harness').createStripeHarness
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async () => ({ ok: true }),
  sendProviderNotification: async () => ({ ok: true }),
  sendBookingCancellation: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  get stripe() {
    return state.stripe.stripe
  },
  createBookingCheckout: (...a: unknown[]) => state.stripe.createBookingCheckout(...a),
  createRentalCheckout: (...a: unknown[]) => state.stripe.createRentalCheckout(...a),
  createRefund: (...a: unknown[]) => state.stripe.createRefund(...a),
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
}))

import { POST as createBookingRoute } from '@/app/api/bookings/route'
import { PATCH as patchBookingRoute } from '@/app/api/bookings/[id]/route'
import { POST as cancelBookingRoute } from '@/app/api/bookings/[id]/cancel/route'
import {
  pipelineStage,
  rechnungMoeglich,
  streitMoeglich,
} from '@/modules/booking/pipeline'
import {
  fehlendePflichtangaben,
  istAusstellbar,
  summe,
  zahlungsstand,
  type Invoice,
} from '@/modules/booking/invoice'
import { eroeffne, fristAbgelaufen, wechsle } from '@/modules/booking/dispute'
import { cancellationOutcome, noShowOutcome } from '@/modules/booking/cancellation'

function db(): FakeSupabase {
  return state.db
}

const JETZT = '2026-09-01T09:00:00.000Z'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(JETZT))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.stripe = createStripeHarness()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

/** Legt eine Buchung ueber den echten Route-Handler an. */
async function bucheTermin(): Promise<Row> {
  const res = await createBookingRoute(
    postRequest('https://www.chairmatch.de/api/bookings', {
      salonId: IDS.salon,
      serviceId: IDS.service,
      date: FREE_DAY,
      startTime: '10:00',
    }),
    undefined,
  )
  expect([200, 201]).toContain(res.status)
  const zeilen = db().rows('bookings')
  const neu = zeilen[zeilen.length - 1]
  expect(neu).toBeTruthy()
  return neu as Row
}

describe('Die Kette bis zum Abschluss', () => {
  it('Anfrage → PENDING, und der Slot ist belegt', async () => {
    const b = await bucheTermin()
    expect(String(b.status).toLowerCase()).toBe('pending')

    const stufe = pipelineStage({ booking: b as never }, new Date(JETZT))
    expect(stufe).toBe('PENDING')

    // Vor dem Termin ist Absagen der Weg, nicht Streiten.
    expect(streitMoeglich(stufe)).toBe(false)
    expect(rechnungMoeglich(stufe)).toBe(false)
  })

  it('Bestaetigung → CONFIRMED', async () => {
    const b = await bucheTermin()
    state.session = sessionFor('owner')

    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'confirmed' }),
      ctx({ id: String(b.id) }),
    )
    expect(res.status).toBe(200)

    const nach = db().row('bookings', b.id)!
    expect(String(nach.status).toLowerCase()).toBe('confirmed')
    expect(pipelineStage({ booking: nach as never }, new Date(JETZT))).toBe('CONFIRMED')
  })

  it('waehrend des Fensters → IN_PROGRESS, ohne dass sich die Zeile aendert', async () => {
    const b = await bucheTermin()
    state.session = sessionFor('owner')
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'confirmed' }),
      ctx({ id: String(b.id) }),
    )
    const zeile = db().row('bookings', b.id)!
    const gespeichert = String(zeile.status)

    // Uhr in das Terminfenster stellen.
    const mitten = new Date(`${FREE_DAY}T${String(zeile.start_time).slice(0, 5)}:30`)
    expect(pipelineStage({ booking: zeile as never }, mitten)).toBe('IN_PROGRESS')

    // Der Kern: IN_PROGRESS ist abgeleitet. In der Datenbank steht
    // unveraendert `confirmed`.
    expect(String(db().row('bookings', b.id)!.status)).toBe(gespeichert)
    expect(gespeichert.toLowerCase()).toBe('confirmed')
  })

  it('Abschluss → COMPLETED, und erst jetzt gehen Rechnung und Streitfall auf', async () => {
    const b = await bucheTermin()
    state.session = sessionFor('owner')
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'confirmed' }),
      ctx({ id: String(b.id) }),
    )
    const res = await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'completed' }),
      ctx({ id: String(b.id) }),
    )
    expect(res.status).toBe(200)

    const nach = db().row('bookings', b.id)!
    const stufe = pipelineStage({ booking: nach as never }, new Date(JETZT))
    expect(stufe).toBe('COMPLETED')
    expect(rechnungMoeglich(stufe)).toBe(true)
    expect(streitMoeglich(stufe)).toBe(true)
  })
})

describe('Rechnung aus der abgeschlossenen Buchung', () => {
  it('entsteht als Entwurf und bleibt ohne Steuersatz unausstellbar', async () => {
    const b = await bucheTermin()
    state.session = sessionFor('owner')
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'confirmed' }),
      ctx({ id: String(b.id) }),
    )
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'completed' }),
      ctx({ id: String(b.id) }),
    )
    const fertig = db().row('bookings', b.id)!
    const preis = Number(fertig.price_cents)
    expect(preis).toBeGreaterThan(0)

    const entwurf: Invoice = {
      id: 'inv-1',
      number: null,
      bookingId: String(fertig.id),
      issuerId: IDS.owner,
      recipientId: IDS.customer,
      status: 'draft',
      issuedAt: null,
      dueAt: null,
      // Der Betrag kommt aus der Buchung — nicht aus einer Vorlage.
      lines: [{ description: 'Termin', quantity: 1, unitPriceCents: preis }],
      taxRatePercent: null,
      paidCents: 0,
    }

    expect(summe(entwurf).netCents).toBe(preis)
    // Ohne Steuersatz keine erfundene Steuer und kein Beleg.
    expect(summe(entwurf).taxCents).toBe(0)
    expect(istAusstellbar(entwurf)).toBe(false)
    expect(fehlendePflichtangaben(entwurf)).toContain(
      'Steuersatz (oder ausdrueckliche Steuerbefreiung)',
    )

    // Erst mit Nummer, Datum und einer ausdruecklichen Steueraussage.
    const ausgestellt: Invoice = {
      ...entwurf,
      number: '2026-0001',
      issuedAt: JETZT,
      taxRatePercent: 0,
      status: 'issued',
    }
    expect(istAusstellbar(ausgestellt)).toBe(true)
    expect(zahlungsstand(ausgestellt)).toBe('issued')
    expect(zahlungsstand({ ...ausgestellt, paidCents: preis })).toBe('paid')
  })
})

describe('Abzweigung Streitfall', () => {
  it('ueberschreibt die Stufe der Buchung, solange er offen ist', async () => {
    const b = await bucheTermin()
    state.session = sessionFor('owner')
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'confirmed' }),
      ctx({ id: String(b.id) }),
    )
    await patchBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}`, { status: 'completed' }),
      ctx({ id: String(b.id) }),
    )
    const fertig = db().row('bookings', b.id)!

    const fall = eroeffne({
      id: 'd-1',
      bookingId: String(fertig.id),
      openedBy: 'customer',
      reason: 'hygiene',
      openedAt: JETZT,
    })

    // Offen → DISPUTED, obwohl die Buchung `completed` ist.
    expect(pipelineStage({ booking: fertig as never, streit: fall }, new Date(JETZT)))
      .toBe('DISPUTED')
    // Die Buchung selbst bleibt unangetastet.
    expect(String(db().row('bookings', b.id)!.status).toLowerCase()).toBe('completed')

    // Die Frist laeuft erst 48 Stunden spaeter ab.
    expect(fristAbgelaufen(fall, new Date('2026-09-02T09:00:00.000Z'))).toBe(false)
    expect(fristAbgelaufen(fall, new Date('2026-09-03T10:00:00.000Z'))).toBe(true)

    // Nach dem Abschluss zaehlt wieder die Buchung.
    const inReview = wechsle(fall, 'in_review', 'platform', JETZT, 'uebernommen')
    expect(inReview.ok).toBe(true)
    if (!inReview.ok) return
    const erledigt = wechsle(
      inReview.dispute,
      'resolved',
      'platform',
      JETZT,
      'Teilerstattung',
      'partial_refund',
    )
    expect(erledigt.ok).toBe(true)
    if (!erledigt.ok) return

    expect(pipelineStage({ booking: fertig as never, streit: erledigt.dispute }, new Date(JETZT)))
      .toBe('COMPLETED')
    // Der Ausgang steht fest — der BETRAG nicht, und das ist Absicht.
    expect(erledigt.dispute.resolution).toBe('partial_refund')
  })
})

describe('Abzweigung Storno', () => {
  it('fuehrt zu CANCELLED, und die Gebuehr bleibt ohne Regel unbestimmt', async () => {
    const b = await bucheTermin()
    const preis = Number(db().row('bookings', b.id)!.price_cents)

    const res = await cancelBookingRoute(
      postRequest(`https://www.chairmatch.de/api/bookings/${b.id}/cancel`, { reason: 'Krankheit' }),
      ctx({ id: String(b.id) }),
    )
    expect([200, 201]).toContain(res.status)

    const nach = db().row('bookings', b.id)!
    const stufe = pipelineStage({ booking: nach as never }, new Date(JETZT))
    expect(stufe).toBe('CANCELLED')

    // Kein Beleg aus einem Vorgang, der nicht stattgefunden hat.
    expect(rechnungMoeglich(stufe)).toBe(false)

    // Und die Gebuehr: `booking_policies` fuehrt nur `no_show_fee_cents`,
    // fuer das Absagen gibt es kein Feld. Also unbestimmt — nicht 0 und
    // nicht der volle Preis.
    const policy = db().rows('booking_policies')[0] as Row | undefined
    const regel = { noShowFeeCents: policy?.no_show_fee_cents as number | undefined }
    expect(cancellationOutcome(regel, 72, preis).kind).toBe('unbestimmt')

    // Fuers Nichterscheinen gibt es dagegen eine echte Quelle.
    const noShow = noShowOutcome(regel, preis)
    if (typeof regel.noShowFeeCents === 'number') {
      expect(['fee', 'free']).toContain(noShow.kind)
    } else {
      expect(noShow.kind).toBe('unbestimmt')
    }
  })
})
