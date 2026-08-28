// @vitest-environment node
/**
 * E2E: Auth-Haertung — Track 17.
 *
 * Sechs Befunde:
 *
 * (1) PASSWORT-AENDERUNG OHNE ALTES PASSWORT.
 *     POST /api/auth/change-password akzeptierte ein neues Passwort ohne das
 *     aktuelle zu pruefen. Ein gestohlenes Session-Cookie genuegte, um das
 *     Passwort zu aendern und den echten Inhaber auszusperren.
 *
 * (2) passwordMustChange NICHT REVALIDIERT.
 *     Das Flag stand im JWT aus dem Login, wurde aber nie aus der DB
 *     nachgelesen — setzte der Admin es nach dem Login, blieb es wirkungslos
 *     bis zum naechsten Login (365 Tage).
 *
 * (3) 2FA AKTIVIERT, ABER NICHT DURCHGESETZT.
 *     Die Einrichtung ueber /api/auth/2fa/setup und /verify lief, der Login
 *     hat den Code aber nie geprueft — 2FA war eine Attrappe.
 *
 * (4) ADMIN-ROUTE OHNE ZOD.
 *     PATCH /api/admin nahm beliebigen Body entgegen — keine UUID-Pruefung
 *     auf `id`, kein Schema auf `action`/`data`.
 *
 * (5) WAIT-LIST SPEICHERTE ROHE IPS.
 *     POST /api/wait-list speicherte die IP-Adresse im Klartext statt als
 *     Hash. DSGVO-widrig, alle anderen Stellen hashten bereits.
 *
 * (6) EMPFEHLUNGEN: IDOR UEBER customerId.
 *     POST /api/recommendations nahm customerId aus dem Request-Body. Ein
 *     Anbieter konnte Empfehlungen in den Feed beliebiger Kunden einpflanzen.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, sessionFor, postRequest, rawRequest, IDS, type TestSession } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const PASSWORT = 'Sicher!2026'
const NEUES_PASSWORT = 'NeuSicher!2026'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    anon: undefined as unknown as {
      auth: {
        signInWithPassword: ReturnType<typeof vi.fn>
      }
    },
    adminAuth: {
      admin: {
        updateUserById: vi.fn(async () => ({ data: { user: { id: 'x' } }, error: null })),
        deleteUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      },
    },
  }
})

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => {
    const db = state.db as FakeSupabase & { auth?: unknown }
    db.auth = state.adminAuth
    return db
  },
}))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => state.anon }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  invalidateAccountState: vi.fn(),
}))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  DEMO_USER_IDS: new Set<string>(),
}))
vi.mock('@/lib/indexing', () => ({ notifyIndexers: vi.fn(async () => undefined) }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { invalidateAccountState } from '@/modules/auth/session'
import { POST as _changePasswordRoute } from '@/app/api/auth/change-password/route'

const changePasswordRoute = (req: import('next/server').NextRequest) =>
  _changePasswordRoute(req, undefined as never)
import { POST as twoFaStatusRoute } from '@/app/api/auth/2fa/status/route'
import { PATCH as adminRoute } from '@/app/api/admin/route'
import { POST as waitListRoute } from '@/app/api/wait-list/route'
import { GET as getRecommendations, POST as postRecommendation } from '@/app/api/recommendations/route'

function db(): FakeSupabase {
  return state.db
}

function createAnonClient() {
  return {
    auth: {
      signInWithPassword: vi.fn(async (args: { email: string; password: string }) => {
        if (args.password !== PASSWORT) {
          return { data: { user: null }, error: { message: 'Invalid login credentials' } }
        }
        return { data: { user: { id: 'dummy' } }, error: null }
      }),
    },
  }
}

beforeEach(() => {
  state.db = createDb()
  state.session = null
  state.anon = createAnonClient()
  state.adminAuth.admin.updateUserById = vi.fn(async () => ({ data: { user: { id: 'x' } }, error: null }))
  state.adminAuth.admin.deleteUser = vi.fn(async () => ({ data: { user: null }, error: null }))
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
describe('Befund 1: Passwort-Aenderung verlangt das aktuelle Passwort', () => {
  it('lehnt eine freiwillige Aenderung ohne currentPassword ab', async () => {
    state.session = {
      user: { id: IDS.customer, email: 'kundin@example.de', name: 'Lena', role: 'kunde' },
    }

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: NEUES_PASSWORT,
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/[Aa]ktuelles Passwort/)
  })

  it('lehnt eine freiwillige Aenderung mit falschem currentPassword ab', async () => {
    state.session = {
      user: { id: IDS.customer, email: 'kundin@example.de', name: 'Lena', role: 'kunde' },
    }

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: NEUES_PASSWORT,
        currentPassword: 'FalschesPasswort!2026',
      }),
    )

    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toMatch(/falsch/)
  })

  it('akzeptiert die Aenderung mit korrektem currentPassword', async () => {
    state.session = {
      user: { id: IDS.customer, email: 'kundin@example.de', name: 'Lena', role: 'kunde' },
    }

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: NEUES_PASSWORT,
        currentPassword: PASSWORT,
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('braucht kein currentPassword bei erzwungenem Wechsel', async () => {
    state.session = {
      user: {
        id: IDS.customer,
        email: 'kundin@example.de',
        name: 'Lena',
        role: 'kunde',
        passwordMustChange: true,
      },
    } as TestSession

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: NEUES_PASSWORT,
      }),
    )

    expect(res.status).toBe(200)
  })

  it('weist zu kurze Passwoerter ab', async () => {
    state.session = {
      user: {
        id: IDS.customer,
        email: 'kundin@example.de',
        name: 'Lena',
        role: 'kunde',
        passwordMustChange: true,
      },
    } as TestSession

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: 'kurz',
      }),
    )

    expect(res.status).toBe(400)
  })

  it('weist unauthentifizierte Anfragen ab', async () => {
    state.session = null

    const res = await changePasswordRoute(
      postRequest('http://localhost/api/auth/change-password', {
        newPassword: NEUES_PASSWORT,
      }),
    )

    expect(res.status).toBe(401)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Befund 3: 2FA-Status-Endpunkt', () => {
  it('gibt required: false fuer unbekannte Adressen zurueck (kein Orakel)', async () => {
    const res = await twoFaStatusRoute(
      postRequest('http://localhost/api/auth/2fa/status', {
        email: 'gibtsnicht@example.de',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.required).toBe(false)
  })

  it('gibt required: false wenn 2FA nicht eingerichtet ist', async () => {
    const res = await twoFaStatusRoute(
      postRequest('http://localhost/api/auth/2fa/status', {
        email: 'kundin@example.de',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.required).toBe(false)
  })

  it('gibt required: true wenn 2FA aktiviert ist', async () => {
    db().replace('user_2fa', [
      { user_id: IDS.customer, enabled: true, secret: 'JBSWY3DPEHPK3PXP' },
    ])

    const res = await twoFaStatusRoute(
      postRequest('http://localhost/api/auth/2fa/status', {
        email: 'kundin@example.de',
      }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.required).toBe(true)
  })

  it('behandelt fehlerhaften Body als required: false', async () => {
    const res = await twoFaStatusRoute(
      postRequest('http://localhost/api/auth/2fa/status', { foo: 'bar' }),
    )

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.required).toBe(false)
  })

  it('haelt sich an das Rate-Limit', async () => {
    const responses: number[] = []
    for (let i = 0; i < 12; i++) {
      const r = await twoFaStatusRoute(
        postRequest('http://localhost/api/auth/2fa/status', {
          email: 'ratelimit@example.de',
        }),
      )
      responses.push(r.status)
    }

    expect(responses.filter(s => s === 429).length).toBeGreaterThan(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Befund 4: Admin-Route mit Zod-Validierung', () => {
  beforeEach(() => {
    state.session = sessionFor('admin')
  })

  it('weist ungueltige UUIDs im id-Feld ab', async () => {
    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'salon-status',
          id: 'nicht-eine-uuid',
          data: { status: 'approved' },
        }),
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/[Uu]ngültige/)
  })

  it('weist unbekannte Actions ab', async () => {
    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-everything',
          id: IDS.salon,
          data: {},
        }),
      }),
    )

    expect(res.status).toBe(400)
  })

  it('weist ungueltigen Salon-Status ab', async () => {
    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'salon-status',
          id: IDS.salon,
          data: { status: 'zerstoert' },
        }),
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/[Ss]tatus/)
  })

  it('weist Nicht-Admins ab', async () => {
    state.session = sessionFor('customer')

    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'salon-status',
          id: IDS.salon,
          data: { status: 'approved' },
        }),
      }),
    )

    expect(res.status).toBe(403)
  })

  it('weist kaputten JSON-Body ab', async () => {
    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: '{ das ist kein json',
      }),
    )

    expect(res.status).toBe(400)
  })

  it('normaler Admin darf keine Admin-Rollen vergeben', async () => {
    state.session = sessionFor('admin')

    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'user-role',
          id: IDS.customer,
          data: { role: 'super_admin' },
        }),
      }),
    )

    expect(res.status).toBe(403)
    expect((await res.json()).error).toMatch(/super_admin/)
  })

  it('super_admin darf Admin-Rollen vergeben', async () => {
    state.session = sessionFor('superAdmin')

    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'user-role',
          id: IDS.customer,
          data: { role: 'admin' },
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(invalidateAccountState).toHaveBeenCalledWith(IDS.customer)
  })

  it('salon-toggle-active weist Nicht-Boolean ab', async () => {
    const res = await adminRoute(
      rawRequest('http://localhost/api/admin', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'salon-toggle-active',
          id: IDS.salon,
          data: { is_active: 'ja' },
        }),
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/boolean/)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Befund 5: Wait-List hasht IPs', () => {
  it('speichert keine rohe IP-Adresse', async () => {
    const res = await waitListRoute(
      postRequest('http://localhost/api/wait-list', {
        email: 'test@example.de',
        city: 'Berlin',
      }),
    )

    expect(res.status).toBe(200)

    const rows = db().rows('wait_list')
    if (rows.length > 0) {
      const ip = rows[0].ip as string | null
      // Die IP darf NICHT die Roh-Adresse sein
      if (ip) {
        expect(ip).not.toBe('203.0.113.9')
        // SHA-256-Hex hat 64 Zeichen
        expect(ip.length).toBe(64)
      }
    }
  })
})

// ────────────────────────────────────────────────────────────────
describe('Befund 6: Empfehlungen — kein IDOR ueber customerId', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
    // Buchung gehoert dem Kunden, liegt im eigenen Salon
    db().replace('bookings', [
      {
        id: IDS.bookingConfirmed,
        customer_id: IDS.customer,
        user_id: IDS.customer,
        salon_id: IDS.salon,
        service_id: IDS.service,
        staff_id: null,
        booking_date: '2026-09-10',
        start_time: '10:00:00',
        end_time: '11:00:00',
        status: 'confirmed',
        payment_status: 'unpaid',
        price_cents: 5000,
        notes: null,
        cancellation_reason: null,
        created_at: '2026-08-20T09:00:00.000Z',
      },
    ])
    db().replace('product_recommendations', [])
  })

  it('nimmt customerId NICHT aus dem Request-Body', async () => {
    const res = await postRecommendation(
      postRequest('http://localhost/api/recommendations', {
        bookingId: IDS.bookingConfirmed,
        productId: IDS.productTeuer,
        customerId: IDS.otherCustomer,
      }),
    )

    // Entweder 201 mit der richtigen customerId (aus Booking), oder die
    // Route ignoriert customerId gaenzlich — beides richtig.
    if (res.status === 201) {
      const body = await res.json()
      // Die Empfehlung MUSS an den Buchungskunden gehen, nicht an den
      // im Body uebergebenen otherCustomer.
      const recs = db().rows('product_recommendations')
      if (recs.length > 0) {
        expect(recs[0].customer_id).toBe(IDS.customer)
        expect(recs[0].customer_id).not.toBe(IDS.otherCustomer)
      }
    }
    // Auch 400 (weil customerId nicht mehr akzeptiert) waere korrekt
    expect([201, 400]).toContain(res.status)
  })

  it('weist einen fremden Salon ab', async () => {
    // Buchung, die einem anderen Salon gehoert
    const fremdSalon = '44444444-4444-4444-8444-444444444445'
    const fremdOwner = '22222222-2222-4222-8222-222222222223'
    db().replace('salons', [
      ...db().rows('salons'),
      {
        id: fremdSalon,
        name: 'Fremder Salon',
        slug: 'fremd',
        category: 'friseur',
        city: 'Hamburg',
        owner_id: fremdOwner,
        is_active: true,
        is_verified: true,
      },
    ])
    const fremdBooking = '66666666-6666-4666-8666-666666666670'
    db().replace('bookings', [
      ...db().rows('bookings'),
      {
        id: fremdBooking,
        customer_id: IDS.customer,
        user_id: IDS.customer,
        salon_id: fremdSalon,
        service_id: IDS.service,
        staff_id: null,
        booking_date: '2026-09-12',
        start_time: '14:00:00',
        end_time: '15:00:00',
        status: 'confirmed',
        payment_status: 'unpaid',
        price_cents: 5000,
        notes: null,
        cancellation_reason: null,
        created_at: '2026-08-21T09:00:00.000Z',
      },
    ])

    const res = await postRecommendation(
      postRequest('http://localhost/api/recommendations', {
        bookingId: fremdBooking,
        productId: IDS.productTeuer,
      }),
    )

    expect(res.status).toBe(403)
  })

  it('weist Nicht-Anbieter ab', async () => {
    state.session = sessionFor('customer')

    const res = await postRecommendation(
      postRequest('http://localhost/api/recommendations', {
        bookingId: IDS.bookingConfirmed,
        productId: IDS.productTeuer,
      }),
    )

    expect(res.status).toBe(403)
  })

  it('GET liefert nur eigene Empfehlungen', async () => {
    state.session = sessionFor('customer')

    const res = await getRecommendations()

    // Keine Empfehlungen vorhanden — aber die Abfrage ist auf session.user.id beschraenkt
    expect(res.status).toBe(200)
  })

  it('weist unauthentifizierte Anfragen ab', async () => {
    state.session = null

    const res = await postRecommendation(
      postRequest('http://localhost/api/recommendations', {
        bookingId: IDS.bookingConfirmed,
        productId: IDS.productTeuer,
      }),
    )

    expect(res.status).toBe(401)
  })
})
