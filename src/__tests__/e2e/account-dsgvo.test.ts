// @vitest-environment node
/**
 * E2E: DSGVO-Pfade (Art. 15/17/20) und die Cron-Autorisierung.
 *
 * Die Konto-Loeschung ist der einzige Endpunkt der Anwendung, der Daten
 * unwiderruflich zerstoert UND den Nutzer anschliessend aussperrt
 * (`is_active = false` sperrt den Login). Sie hatte weder eine Bestaetigung
 * noch einen Schutz gegen Wiederholung.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDb, sessionFor, postRequest, getRequest, rawRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const state = vi.hoisted(() => ({
  db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
  session: null as import('./_harness/fixtures').TestSession | null,
  signOut: undefined as unknown as import('vitest').Mock<(...a: unknown[]) => Promise<unknown>>,
  deleteUser: undefined as unknown as import('vitest').Mock<
    (id: string) => Promise<{ data: null; error: null }>
  >,
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({ getServerSession: async () => state.session }))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  signOut: (...a: unknown[]) => state.signOut(...a),
}))

import { POST as deleteRoute } from '@/app/api/account/delete/route'
import { GET as exportRoute } from '@/app/api/account/export/route'
import { GET as hardDeleteCron } from '@/app/api/cron/hard-delete/route'

function db(): FakeSupabase {
  return state.db
}

const DELETE_URL = 'https://www.chairmatch.de/api/account/delete'
const CRON_URL = 'https://www.chairmatch.de/api/cron/hard-delete'
const CRON_SECRET = 'cron-geheimnis-fuer-den-test'

function cronRequest(header: string | null) {
  return rawRequest(CRON_URL, header ? { headers: { authorization: header } } : {})
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.session = sessionFor('customer')
  state.signOut = vi.fn(async () => undefined)
  process.env.CRON_SECRET = CRON_SECRET
  // Die Fake-DB bildet auth.admin.updateUserById nach; deleteUser fehlt.
  state.deleteUser = vi.fn(async () => ({ data: null, error: null }))
  ;(db().auth.admin as Record<string, unknown>).deleteUser = state.deleteUser
})

// ────────────────────────────────────────────────────────────────
describe('Konto-Loeschung (POST /api/account/delete)', () => {
  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    const res = await deleteRoute(postRequest(DELETE_URL, { confirmEmail: 'kundin@example.de' }))
    expect(res.status).toBe(401)
    expect(db().row('profiles', IDS.customer)?.email).toBe('kundin@example.de')
  })

  it('loescht NICHT ohne Bestaetigung der eigenen E-Mail', async () => {
    const res = await deleteRoute(postRequest(DELETE_URL, {}))

    expect(res.status).toBe(400)
    const profile = db().row('profiles', IDS.customer)
    expect(profile?.email).toBe('kundin@example.de')
    expect(profile?.delete_requested_at).toBeUndefined()
    expect(state.signOut).not.toHaveBeenCalled()
  })

  it('loescht NICHT bei falscher E-Mail', async () => {
    const res = await deleteRoute(
      postRequest(DELETE_URL, { confirmEmail: 'jemand.anderes@example.de' }),
    )
    expect(res.status).toBe(400)
    expect(db().row('profiles', IDS.customer)?.email).toBe('kundin@example.de')
  })

  it('loescht bei korrekter Bestaetigung und meldet ehrlich, was passiert ist', async () => {
    const res = await deleteRoute(
      postRequest(DELETE_URL, { confirmEmail: 'Kundin@Example.DE' }), // Gross-/Kleinschreibung egal
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    // Die alte Meldung ("markiert") suggerierte Umkehrbarkeit
    expect(body.message).toMatch(/deaktiviert/i)
    expect(body.message).not.toMatch(/markiert/i)

    const profile = db().row('profiles', IDS.customer)
    expect(profile).toMatchObject({
      is_active: false,
      email: null,
      full_name: 'Gelöscht',
      phone: null,
    })
    expect(profile?.delete_requested_at).toBe('2026-09-01T09:00:00.000Z')
    expect(state.signOut).toHaveBeenCalled()
    expect(
      db().rows('audit_logs').some(a => a.action === 'ACCOUNT_DELETE_REQUESTED'),
    ).toBe(true)
  })

  it('verlaengert die 30-Tage-Frist nicht bei einem zweiten Aufruf', async () => {
    await deleteRoute(postRequest(DELETE_URL, { confirmEmail: 'kundin@example.de' }))
    const ersterStempel = db().row('profiles', IDS.customer)?.delete_requested_at

    vi.setSystemTime(new Date('2026-09-20T09:00:00.000Z'))
    const zweiter = await deleteRoute(postRequest(DELETE_URL, { confirmEmail: 'kundin@example.de' }))

    expect(zweiter.status).toBe(409)
    expect(db().row('profiles', IDS.customer)?.delete_requested_at).toBe(ersterStempel)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Hard-Delete-Cron (GET /api/cron/hard-delete)', () => {
  function markiereZurLoeschung(id: string, angefragtAm: string): void {
    Object.assign(db().row('profiles', id)!, {
      delete_requested_at: angefragtAm,
      is_active: false,
    })
  }

  it('lehnt ohne Bearer-Secret ab', async () => {
    expect((await hardDeleteCron(cronRequest(null))).status).toBe(401)
    expect((await hardDeleteCron(cronRequest('Bearer falsch'))).status).toBe(401)
    expect(state.deleteUser).not.toHaveBeenCalled()
  })

  it('lehnt ab, wenn CRON_SECRET gar nicht gesetzt ist', async () => {
    delete process.env.CRON_SECRET
    // "Bearer undefined" war der Erwartungswert, wenn das Secret fehlt
    expect((await hardDeleteCron(cronRequest('Bearer undefined'))).status).toBe(401)
  })

  it('loescht Profile, deren Antrag aelter als 30 Tage ist', async () => {
    markiereZurLoeschung(IDS.customer, '2026-07-01T09:00:00.000Z')

    const res = await hardDeleteCron(cronRequest(`Bearer ${CRON_SECRET}`))

    expect(res.status).toBe(200)
    expect((await res.json()).deleted).toBe(1)
    const profile = db().row('profiles', IDS.customer)
    expect(profile?.deleted_at).toBe('2026-09-01T09:00:00.000Z')
    expect(profile?.email).toBeNull()
    expect(state.deleteUser).toHaveBeenCalledWith(IDS.customer)
  })

  it('laesst Profile innerhalb der 30 Tage in Ruhe', async () => {
    markiereZurLoeschung(IDS.customer, '2026-08-25T09:00:00.000Z')

    const res = await hardDeleteCron(cronRequest(`Bearer ${CRON_SECRET}`))

    expect((await res.json()).deleted).toBe(0)
    expect(db().row('profiles', IDS.customer)?.deleted_at).toBeUndefined()
    expect(state.deleteUser).not.toHaveBeenCalled()
  })

  it('greift bereits geloeschte Profile nicht in jedem Lauf erneut auf', async () => {
    markiereZurLoeschung(IDS.customer, '2026-07-01T09:00:00.000Z')
    await hardDeleteCron(cronRequest(`Bearer ${CRON_SECRET}`))
    const echterLoeschzeitpunkt = db().row('profiles', IDS.customer)?.deleted_at

    // Naechste Nacht
    vi.setSystemTime(new Date('2026-09-02T02:00:00.000Z'))
    const zweiter = await hardDeleteCron(cronRequest(`Bearer ${CRON_SECRET}`))

    expect((await zweiter.json()).deleted).toBe(0)
    // Der Zeitpunkt der tatsaechlichen Loeschung darf nicht ueberschrieben werden
    expect(db().row('profiles', IDS.customer)?.deleted_at).toBe(echterLoeschzeitpunkt)
    expect(state.deleteUser).toHaveBeenCalledTimes(1)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Daten-Export (GET /api/account/export)', () => {
  it('lehnt ohne Session mit 401 ab', async () => {
    state.session = null
    expect((await exportRoute()).status).toBe(401)
  })

  it('umfasst alle Bereiche, in denen personenbezogene Daten liegen', async () => {
    const res = await exportRoute()
    expect(res.status).toBe(200)
    const data = (await res.json()) as Record<string, unknown>

    // Was der Export bis 2026-08-27 konnte …
    for (const bereich of ['profile', 'bookings', 'consentLogs']) {
      expect(data).toHaveProperty(bereich)
    }
    // … und was still fehlte.
    for (const bereich of [
      'reviews',
      'reviewsWritten',
      'messages',
      'orders',
      'cartItems',
      'rentalBookings',
      'rentalRequests',
      'payments',
      'uploads',
      'favorites',
      'notifications',
    ]) {
      expect(data).toHaveProperty(bereich)
    }
  })

  it('liefert die eigenen Datensaetze und keine fremden', async () => {
    db().rows('bookings').push({
      id: '66660000-0000-4000-8000-000000000042',
      customer_id: IDS.otherCustomer,
      salon_id: IDS.salon,
      booking_date: '2026-08-01',
      status: 'completed',
    })

    const data = (await (await exportRoute()).json()) as { bookings: { customer_id: string }[] }

    expect(data.bookings.length).toBeGreaterThan(0)
    expect(data.bookings.every(b => b.customer_id === IDS.customer)).toBe(true)
  })

  it('kippt nicht, wenn eine Tabelle fehlt — meldet die Luecke stattdessen', async () => {
    db().failOn('messages', 'select', {
      code: 'PGRST205',
      message: "Could not find the table 'public.messages'",
      details: null,
      hint: null,
    })

    const res = await exportRoute()
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      bookings: unknown[]
      nichtVerfuegbar?: { bereich: string }[]
    }
    expect(data.bookings).toBeDefined()
    expect(data.nichtVerfuegbar?.some(n => n.bereich === 'messages')).toBe(true)
  })
})
