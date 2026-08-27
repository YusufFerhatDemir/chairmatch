/**
 * Feste Testdaten für die ChairMatch-E2E-Suite.
 *
 * Alle IDs sind gültige UUID-v4-Strings — der Produktivcode validiert sie mit
 * `z.string().uuid()`, ein „salon-1" würde also schon am Schema scheitern und
 * den eigentlich getesteten Pfad nie erreichen.
 */

import type { NextRequest } from 'next/server'
import { FakeSupabase, type RelationMap, type Row } from './fake-supabase'

export const IDS = {
  customer: '11111111-1111-4111-8111-111111111111',
  otherCustomer: '11111111-1111-4111-8111-111111111112',
  owner: '22222222-2222-4222-8222-222222222222',
  admin: '33333333-3333-4333-8333-333333333333',
  superAdmin: '33333333-3333-4333-8333-333333333334',
  salon: '44444444-4444-4444-8444-444444444444',
  service: '55555555-5555-4555-8555-555555555555',
  serviceHighRisk: '55555555-5555-4555-8555-555555555556',
  bookingConfirmed: '66666666-6666-4666-8666-666666666666',
  equipment: '77777777-7777-4777-8777-777777777777',
  equipmentUnavailable: '77777777-7777-4777-8777-777777777778',
  equipmentOwnSalon: '77777777-7777-4777-8777-777777777779',
  rentalConfirmed: '88888888-8888-4888-8888-888888888888',
  transaction: '99999999-9999-4999-8999-999999999999',
  orderOpen: '15151515-1515-4151-8151-151515151515',
  salonZwei: '44444444-4444-4444-8444-444444444446',
  bookingCompleted: '66666666-6666-4666-8666-666666666667',
  bookingCompletedFremd: '66666666-6666-4666-8666-666666666668',
  bookingCompletedSalonZwei: '66666666-6666-4666-8666-666666666669',
  unknown: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
} as const

/** Eingefrorene „Heute"-Zeit der Suite (siehe freezeTime()) */
export const TODAY = '2026-09-01'
/** Zukunftstag ohne Bestandsbuchung */
export const FREE_DAY = '2026-09-15'
/** Tag, an dem 10:00–11:00 bereits belegt ist */
export const BUSY_DAY = '2026-09-10'

/**
 * Beziehungen, die der Produktivcode über eingebettete Selects liest
 * (`salons!inner(owner_id)`, `rental_equipment(..., salons(...))` …).
 */
export const RELATIONS: RelationMap = {
  bookings: {
    salon: { table: 'salons', localKey: 'salon_id' },
    salons: { table: 'salons', localKey: 'salon_id' },
    service: { table: 'services', localKey: 'service_id' },
    services: { table: 'services', localKey: 'service_id' },
    customer: { table: 'profiles', localKey: 'customer_id' },
  },
  rental_bookings: {
    rental_equipment: { table: 'rental_equipment', localKey: 'equipment_id' },
  },
  reviews: {
    customer: { table: 'profiles', localKey: 'customer_id' },
    salon: { table: 'salons', localKey: 'salon_id' },
    salons: { table: 'salons', localKey: 'salon_id' },
  },
  rental_equipment: {
    salons: { table: 'salons', localKey: 'salon_id' },
    salon: { table: 'salons', localKey: 'salon_id' },
  },
}

function seed(): Record<string, Row[]> {
  return {
    profiles: [
      {
        id: IDS.customer,
        email: 'kundin@example.de',
        full_name: 'Lena Kundin',
        role: 'kunde',
        is_active: true,
      },
      {
        id: IDS.otherCustomer,
        email: 'zweite@example.de',
        full_name: 'Zweite Kundin',
        role: 'kunde',
        is_active: true,
      },
      {
        id: IDS.owner,
        email: 'inhaber@example.de',
        full_name: 'Sam Inhaber',
        role: 'anbieter',
        is_active: true,
      },
      {
        id: IDS.admin,
        email: 'admin@example.de',
        full_name: 'Admin',
        role: 'admin',
        is_active: true,
      },
      {
        id: IDS.superAdmin,
        email: 'super@example.de',
        full_name: 'Super Admin',
        role: 'super_admin',
        is_active: true,
      },
    ],
    salons: [
      {
        id: IDS.salon,
        name: 'Salon Sonnenschein',
        slug: 'salon-sonnenschein',
        category: 'friseur',
        city: 'Berlin',
        owner_id: IDS.owner,
        is_active: true,
        is_verified: true,
        avg_rating: 4.6,
        review_count: 31,
        subscription_tier: 'free',
      },
    ],
    services: [
      {
        id: IDS.service,
        salon_id: IDS.salon,
        name: 'Damenhaarschnitt',
        price_cents: 5000,
        duration_minutes: 60,
        is_active: true,
        risk_level: 'LOW',
      },
      {
        id: IDS.serviceHighRisk,
        salon_id: IDS.salon,
        name: 'Haartransplantation',
        price_cents: 250000,
        duration_minutes: 120,
        is_active: true,
        risk_level: 'HIGH',
      },
    ],
    booking_policies: [
      {
        id: '12121212-1212-4121-8121-121212121212',
        salon_id: IDS.salon,
        deposit_percent: 20,
        cancellation_hours: 48,
        no_show_fee_cents: 1500,
      },
    ],
    promo_codes: [
      {
        id: '13131313-1313-4131-8131-131313131313',
        code: 'SOMMER10',
        discount: 10,
        type: 'percent',
        is_active: true,
        expires_at: null,
        max_uses: 100,
        used_count: 3,
      },
      {
        id: '13131313-1313-4131-8131-131313131314',
        code: 'ABGELAUFEN',
        discount: 50,
        type: 'percent',
        is_active: true,
        expires_at: '2026-01-01T00:00:00.000Z',
        max_uses: null,
        used_count: 0,
      },
      {
        id: '13131313-1313-4131-8131-131313131315',
        code: 'AUSGESCHOEPFT',
        discount: 20,
        type: 'fixed',
        is_active: true,
        expires_at: null,
        max_uses: 5,
        used_count: 5,
      },
    ],
    bookings: [
      {
        id: IDS.bookingConfirmed,
        customer_id: IDS.customer,
        salon_id: IDS.salon,
        service_id: IDS.service,
        staff_id: null,
        booking_date: BUSY_DAY,
        start_time: '10:00:00',
        end_time: '11:00:00',
        status: 'confirmed',
        payment_status: 'unpaid',
        price_cents: 5000,
        notes: null,
        cancellation_reason: null,
        created_at: '2026-08-20T09:00:00.000Z',
      },
    ],
    reviews: [],
    rental_equipment: [
      {
        id: IDS.equipment,
        salon_id: IDS.salon,
        type: 'stuhl',
        name: 'Friseurstuhl am Fenster',
        description: 'Heller Platz mit eigenem Waschbecken',
        price_per_day_cents: 5000,
        price_per_month_cents: 90000,
        is_available: true,
        images: [],
      },
      {
        id: IDS.equipmentUnavailable,
        salon_id: IDS.salon,
        type: 'liege',
        name: 'Kosmetikliege (pausiert)',
        description: null,
        price_per_day_cents: 4000,
        price_per_month_cents: null,
        is_available: false,
        images: [],
      },
      {
        id: IDS.equipmentOwnSalon,
        salon_id: '44444444-4444-4444-8444-444444444445',
        type: 'stuhl',
        name: 'Eigener Stuhl',
        description: null,
        price_per_day_cents: 3000,
        price_per_month_cents: null,
        is_available: true,
        images: [],
      },
    ],
    rental_bookings: [
      {
        id: IDS.rentalConfirmed,
        equipment_id: IDS.equipment,
        renter_id: IDS.otherCustomer,
        start_date: '2026-10-01',
        end_date: '2026-10-07',
        total_cents: 35000,
        status: 'confirmed',
        payment_status: 'paid',
        stripe_session_id: 'cs_test_bestand',
        stripe_payment_intent: 'pi_test_bestand',
        created_at: '2026-08-25T10:00:00.000Z',
      },
    ],
    platform_transactions: [
      {
        id: IDS.transaction,
        type: 'chair_rental',
        amount_cents: 35000,
        platform_fee_cents: 3500,
        provider_share_cents: 31500,
        currency: 'eur',
        stripe_payment_intent_id: 'pi_test_bestand',
        stripe_transfer_id: null,
        provider_user_id: IDS.owner,
        customer_user_id: IDS.otherCustomer,
        rental_id: IDS.rentalConfirmed,
        status: 'succeeded',
      },
    ],
    payments: [],
    audit_logs: [],
    consents: [],
    consent_logs: [],
    error_logs: [],
    login_attempts: [],
    orders: [
      {
        id: IDS.orderOpen,
        order_number: 'CM-20260901-001',
        customer_id: IDS.customer,
        subtotal_cents: 4000,
        shipping_cents: 499,
        total_cents: 4499,
        status: 'pending',
        payment_status: 'unpaid',
        stripe_session_id: null,
        stripe_payment_intent: null,
        shipping_name: 'Lena Kundin',
        shipping_street: 'Hauptstr. 1',
        shipping_city: 'Berlin',
        shipping_postal_code: '10115',
        created_at: '2026-08-30T12:00:00.000Z',
      },
    ],
    provider_stripe_accounts: [
      {
        id: '14141414-1414-4141-8141-141414141414',
        user_id: IDS.owner,
        stripe_account_id: 'acct_test_owner',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
      },
    ],
  }
}

/** Frisch befüllte Fake-DB — pro Test neu, damit kein Zustand überläuft. */
export function createDb(): FakeSupabase {
  return new FakeSupabase(seed(), RELATIONS)
}

/**
 * DB mit aktivem EXCLUDE-Constraint `rental_bookings_no_overlap`
 * (Migration 20260705_rental_booking_constraints.sql). Nur so lässt sich der
 * Race testen, bei dem der App-seitige SELECT-Check zu spät kommt.
 */
export function enableOverlapConstraint(db: FakeSupabase): void {
  db.onInsert((table, row) => {
    if (table !== 'rental_bookings') return null
    const active = ['pending', 'confirmed', 'active']
    if (!active.includes(String(row.status))) return null
    const clash = db
      .rows('rental_bookings')
      .some(
        existing =>
          existing.id !== row.id &&
          existing.equipment_id === row.equipment_id &&
          active.includes(String(existing.status)) &&
          String(existing.start_date) <= String(row.end_date) &&
          String(existing.end_date) >= String(row.start_date),
      )
    if (!clash) return null
    return {
      code: '23P01',
      message:
        'conflicting key value violates exclusion constraint "rental_bookings_no_overlap"',
      details: null,
      hint: null,
    }
  })
}

export interface TestSession {
  user: { id: string; email: string; name: string; role: string }
}

export function sessionFor(
  who: 'customer' | 'otherCustomer' | 'owner' | 'admin' | 'superAdmin',
): TestSession {
  const map = {
    customer: { id: IDS.customer, email: 'kundin@example.de', name: 'Lena Kundin', role: 'kunde' },
    otherCustomer: {
      id: IDS.otherCustomer,
      email: 'zweite@example.de',
      name: 'Zweite Kundin',
      role: 'kunde',
    },
    owner: { id: IDS.owner, email: 'inhaber@example.de', name: 'Sam Inhaber', role: 'anbieter' },
    admin: { id: IDS.admin, email: 'admin@example.de', name: 'Admin', role: 'admin' },
    superAdmin: {
      id: IDS.superAdmin,
      email: 'super@example.de',
      name: 'Super Admin',
      role: 'super_admin',
    },
  }
  return { user: map[who] }
}

/**
 * Request im Format, das die Route-Handler erwarten.
 *
 * Die Handler sind auf `NextRequest` typisiert, nutzen aber nur die
 * Web-Standard-API (`json()`, `text()`, `headers`). Ein echtes `Request`
 * reicht deshalb zur Laufzeit vollstaendig aus — der Cast haelt nur den
 * Typecheck ruhig, statt jede Aufrufstelle mit `as never` zu pflastern.
 */
export function rawRequest(url: string, init?: RequestInit): NextRequest {
  return new Request(url, init) as unknown as NextRequest
}

/** GET-Request an einen Route-Handler. */
export function getRequest(url: string): NextRequest {
  return rawRequest(url)
}

/** POST-Request mit JSON-Body. */
export function postRequest(
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return rawRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'https://www.chairmatch.de', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** POST-Request mit absichtlich kaputtem JSON-Body. */
export function brokenJsonRequest(url: string): NextRequest {
  return rawRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{ das ist kein json',
  })
}

/** Next-15-Route-Kontext: params sind ein Promise. */
export function ctx<T extends Record<string, string>>(params: T): { params: Promise<T> } {
  return { params: Promise.resolve(params) }
}
