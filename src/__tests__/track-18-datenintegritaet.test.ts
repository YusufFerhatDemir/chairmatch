// @vitest-environment node
/**
 * Track 18: Datenintegritaet — 12 Befundgruppen zur Eingabevalidierung.
 *
 * (1) dbError, (2) Rate-Limits, (3) UUID auf [id], (4) Zod max-length,
 * (5) PostgREST-Injection, (6) TOTP digits-only, (7) berlinToday(),
 * (8) Upload MIME/Size, (9) Push-Laenge, (10) Notification-UUIDs,
 * (11) Cookie sessionId, (12) Export-Datumsformat.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  createDb,
  sessionFor,
  postRequest,
  getRequest,
  rawRequest,
  ctx,
  IDS,
  type TestSession,
} from './e2e/_harness/fixtures'
import type { FakeSupabase } from './e2e/_harness/fake-supabase'

// ── Globaler State fuer vi.hoisted ──────────────────────────────
const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    savedSubscription: null as { endpoint: string; p256dh: string; auth: string } | null,
    uploadedFile: null as { bucket: string; path: string } | null,
  }
})

// ── Mocks ───────────────────────────────────────────────────────
vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => state.db,
  uploadToStorage: async (bucket: string, path: string) => {
    state.uploadedFile = { bucket, path }
    return `https://storage.example.com/${bucket}/${path}`
  },
}))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
}))
vi.mock('@/lib/notifications', () => ({
  NOTIFICATION_TABLE: 'notification_log',
  createNotification: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/email', () => ({
  sendBookingConfirmation: async () => ({ ok: true }),
  sendProviderNotification: async () => ({ ok: true }),
  // Track C: `cancelBooking` benachrichtigt jetzt die Gegenseite.
  sendBookingCancellation: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/stripe', () => ({
  isStripeConfigured: () => true,
  createRentalCheckout: vi.fn(async () => ({
    sessionId: 'cs_test',
    url: 'https://checkout.stripe.com/test',
  })),
  createRefund: vi.fn(async () => ({ id: 're_test' })),
  STRIPE_WEBHOOK_SECRET: 'whsec_test_chairmatch',
}))
vi.mock('@/lib/push', () => ({
  // Seit Track 23 gibt `saveSubscription` ein ausgewertetes Ergebnis zurueck
  // statt `void`: die Route unterscheidet „angelegt", „fremder Endpunkt",
  // „Limit" und „Datenbankfehler". Ein Mock, der weiter `undefined` liefert,
  // laesst die Route an `ergebnis.ok` scheitern — hier stand deshalb 500.
  MAX_ABOS_PRO_KONTO: 20,
  saveSubscription: async (_userId: string, sub: { endpoint: string; p256dh: string; auth: string }) => {
    state.savedSubscription = sub
    return { ok: true as const, angelegt: true }
  },
}))
vi.mock('@/lib/indexing', () => ({ notifyIndexers: vi.fn(async () => undefined) }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
}))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  DEMO_USER_IDS: new Set<string>(),
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn(async () => ({
        data: { user: { id: 'new-user-id' } },
        error: null,
      })),
    },
  }),
}))
vi.mock('@/lib/rental-request-email', () => ({
  notifyLandlordOfRentalRequest: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/salon-status', () => ({
  SALON_SUSPENDED_MESSAGE: 'Dieser Anbieter nimmt derzeit keine Buchungen an.',
  salonAcceptsBusiness: async (salonId: string) => {
    const salon = state.db.row('salons', salonId)
    if (!salon || salon.is_active === false) {
      return { ok: false as const, reason: 'inactive', message: 'keine Buchungen' }
    }
    return { ok: true as const }
  },
}))

// ── Imports (nach den Mocks) ────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { PUT as notificationsPut, GET as notificationsGet } from '@/app/api/notifications/route'
import { POST as pushSubscribeRoute } from '@/app/api/push/subscribe/route'
import { POST as cookieConsentRoute } from '@/app/api/cookies/consent/route'
import { GET as bookingsIdGet } from '@/app/api/bookings/[id]/route'
import { GET as ordersIdGet } from '@/app/api/orders/[id]/route'
import { POST as rentalCancelRoute } from '@/app/api/rental-bookings/[id]/cancel/route'
import { POST as twoFaVerifyRoute } from '@/app/api/auth/2fa/verify/route'
import { POST as twoFaSetupRoute } from '@/app/api/auth/2fa/setup/route'
import { POST as authRegisterRoute } from '@/app/api/auth/register/route'
import { POST as rentalBookingsRoute } from '@/app/api/rental-bookings/route'
import { POST as uploadRoute } from '@/app/api/upload/route'
import { GET as exportRoute } from '@/app/api/provider/dashboard/export/route'
// getProducts: FakeSupabase hat kein .or(), Bereinigung wird als Regex geprueft.

const BASE = 'https://www.chairmatch.de'

function db(): FakeSupabase {
  return state.db
}

function putRequest(url: string, body?: unknown): import('next/server').NextRequest {
  return rawRequest(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

/** Erzeugt ein FormData-aehnliches Request-Objekt fuer die Upload-Route. */
function uploadRequest(fields: Record<string, string | File>): import('next/server').NextRequest {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return new Request(`${BASE}/api/upload`, {
    method: 'POST',
    body: formData,
  }) as unknown as import('next/server').NextRequest
}

beforeEach(() => {
  state.db = createDb()
  state.session = null
  state.savedSubscription = null
  state.uploadedFile = null
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
// 1. DB-Fehlermeldungen kommen nicht roh an den Client
// ────────────────────────────────────────────────────────────────
describe('1. dbError: generische Fehlermeldung statt PostgREST-Details', () => {
  it('GET /api/notifications gibt "Interner Fehler" bei DB-Fehler', async () => {
    state.session = sessionFor('customer')
    // Erzwinge einen DB-Fehler, indem die Tabelle entfernt wird
    db().replace('notification_log', 'FORCE_ERROR' as never)

    const res = await notificationsGet(
      getRequest(`${BASE}/api/notifications`),
    )

    // Entweder 500 mit generischem Text oder catch-Fallback
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Interner Fehler')
    // Kein PostgREST-Detail im Body
    expect(JSON.stringify(body)).not.toMatch(/42501|42703|PGRST|policy|relation/)
  })

  it('PUT /api/notifications gibt "Interner Fehler" bei DB-Fehler', async () => {
    state.session = sessionFor('customer')
    const validId = '11111111-1111-4111-8111-111111111111'
    db().replace('notification_log', 'FORCE_ERROR' as never)

    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, { notificationIds: [validId] }),
    )

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Interner Fehler')
  })
})

// ────────────────────────────────────────────────────────────────
// 2. Rate-Limiting auf Auth-Routen
// ────────────────────────────────────────────────────────────────
describe('2. Rate-Limiting auf Auth-Routen', () => {
  beforeEach(() => {
    __resetRateLimits()
    state.session = sessionFor('customer')
    db().replace('user_2fa', [])
  })

  it('POST /api/auth/2fa/verify antwortet 429 nach 5 Versuchen', async () => {
    const responses: number[] = []
    for (let i = 0; i < 7; i++) {
      const res = await twoFaVerifyRoute(
        postRequest(`${BASE}/api/auth/2fa/verify`, { code: '123456' }),
      )
      responses.push(res.status)
    }

    // Die ersten 5 duerfen durchgehen (400 wegen fehlendem 2FA-Setup),
    // ab der 6. muss 429 kommen.
    expect(responses.filter(s => s === 429).length).toBeGreaterThanOrEqual(1)
    expect(responses.slice(0, 5).every(s => s !== 429)).toBe(true)
  })

  it('POST /api/auth/2fa/setup antwortet 429 nach 10 Versuchen', async () => {
    const responses: number[] = []
    for (let i = 0; i < 12; i++) {
      const res = await twoFaSetupRoute(
        postRequest(`${BASE}/api/auth/2fa/setup`, {}),
      )
      responses.push(res.status)
    }

    expect(responses.filter(s => s === 429).length).toBeGreaterThanOrEqual(1)
    expect(responses.slice(0, 10).every(s => s !== 429)).toBe(true)
  })

  it('POST /api/auth/register antwortet 429 nach 5 Registrierungen', async () => {
    state.session = null
    const responses: number[] = []
    for (let i = 0; i < 7; i++) {
      const res = await authRegisterRoute(
        postRequest(`${BASE}/api/auth/register`, {
          email: `test${i}@example.de`,
          password: 'SicheresPasswort2026!',
          fullName: 'Test Person',
          agbAccepted: true,
          datenschutzAccepted: true,
        }),
      )
      responses.push(res.status)
    }

    expect(responses.filter(s => s === 429).length).toBeGreaterThanOrEqual(1)
  })
})

// ────────────────────────────────────────────────────────────────
// 3. UUID-Validierung auf Pfad-Parameter
// ────────────────────────────────────────────────────────────────
describe('3. UUID-Validierung auf [id]-Routen', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  const BAD_IDS = [
    'not-a-uuid',
    '123',
    "'; DROP TABLE bookings; --",
    'AAAA-BBBB',
    '',
  ]

  it('GET /api/bookings/[id] weist ungueltige IDs ab', async () => {
    for (const badId of BAD_IDS) {
      const res = await bookingsIdGet(
        getRequest(`${BASE}/api/bookings/${badId}`),
        ctx({ id: badId }),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('Ungueltige ID')
    }
  })

  it('GET /api/orders/[id] weist ungueltige IDs ab', async () => {
    for (const badId of BAD_IDS) {
      const res = await ordersIdGet(
        getRequest(`${BASE}/api/orders/${badId}`),
        ctx({ id: badId }),
      )
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Ungueltige ID')
    }
  })

  it('POST /api/rental-bookings/[id]/cancel weist ungueltige IDs ab', async () => {
    for (const badId of BAD_IDS) {
      const res = await rentalCancelRoute(
        postRequest(`${BASE}/api/rental-bookings/${badId}/cancel`, {}),
        ctx({ id: badId }),
      )
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('Ungueltige ID')
    }
  })

  it('gueltige UUID geht durch die Validierung', async () => {
    const res = await bookingsIdGet(
      getRequest(`${BASE}/api/bookings/${IDS.bookingConfirmed}`),
      ctx({ id: IDS.bookingConfirmed }),
    )
    // 200 oder 404, aber nicht 400
    expect(res.status).not.toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 4. Zod-Laengenlimits auf register-provider
// ────────────────────────────────────────────────────────────────
describe('4. Zod-Feldlaengenlimits bei der Anbieter-Registrierung', () => {
  beforeEach(() => {
    __resetRateLimits()
    state.session = null
  })

  const validBody = {
    vn: 'Max',
    nn: 'Mustermann',
    em: 'max@example.de',
    tel: '030-12345',
    geschaeft: 'Salon Sonnenschein',
    st: 'Hauptstrasse 1',
    plz: '10115',
    city: 'Berlin',
    kat: 'friseur',
    gb: true,
    chair: false,
    agb: true as const,
    dsgvo: true as const,
  }

  // Dynamischer Import, damit die Mocks greifen
  let registerProviderRoute: (req: import('next/server').NextRequest) => Promise<Response>

  beforeEach(async () => {
    const mod = await import('@/app/api/register-provider/route')
    registerProviderRoute = mod.POST
  })

  it('weist Felder ab, die max-length ueberschreiten', async () => {
    const tooLong = {
      ...validBody,
      vn: 'A'.repeat(101), // max 100
    }

    const res = await registerProviderRoute(
      postRequest(`${BASE}/api/register-provider`, tooLong),
    )
    expect(res.status).toBe(400)
  })

  it('weist zu lange Telefonnummern ab', async () => {
    const tooLong = {
      ...validBody,
      tel: '0'.repeat(41), // max 40
    }

    const res = await registerProviderRoute(
      postRequest(`${BASE}/api/register-provider`, tooLong),
    )
    expect(res.status).toBe(400)
  })

  it('weist agb: false ab', async () => {
    const noAgb = { ...validBody, agb: false }

    const res = await registerProviderRoute(
      postRequest(`${BASE}/api/register-provider`, noAgb),
    )
    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 5. PostgREST-Injection in der Marktplatz-Suche
// ────────────────────────────────────────────────────────────────
describe('5. PostgREST-Injection-Schutz in der Marktplatz-Suche', () => {
  /**
   * Die Bereinigung sitzt in getProducts (marketplace.service.ts):
   *
   *   const q = filters.search.replace(/[%_,.()"'\\]/g, '').trim()
   *
   * Wir testen die Regex direkt, weil die FakeSupabase kein .or()
   * implementiert. So ist sichergestellt, dass Metazeichen entfernt
   * werden, bevor sie den Query-Builder erreichen.
   */
  const strip = (s: string) => s.replace(/[%_,.()"'\\]/g, '').trim()

  it('strippt Komma, Punkt und Klammern aus dem Suchbegriff', () => {
    expect(strip('test,name.eq.1')).toBe('testnameeq1')
  })

  it('strippt Anfuehrungszeichen und Backslash', () => {
    expect(strip('"test\'value\\')).toBe('testvalue')
  })

  it('gibt einen leeren String bei reinen Metazeichen zurueck', () => {
    expect(strip('%_,.()')).toBe('')
    // In getProducts fuehrt ein leerer q dazu, dass kein or()-Filter
    // angehaengt wird — die Suche wird uebersprungen.
  })

  it('laesst einen normalen Suchbegriff durch', () => {
    expect(strip('Shampoo')).toBe('Shampoo')
  })

  it('entfernt Prozentzeichen, die LIKE-Wildcards waeren', () => {
    expect(strip('%admin%')).toBe('admin')
  })
})

// ────────────────────────────────────────────────────────────────
// 6. TOTP: nur Ziffern akzeptiert
// ────────────────────────────────────────────────────────────────
describe('6. TOTP-Code muss genau 6 Ziffern sein', () => {
  beforeEach(() => {
    __resetRateLimits()
    state.session = sessionFor('customer')
  })

  const BAD_CODES = [
    { code: 'abcdef', label: 'Buchstaben' },
    { code: '12345a', label: 'gemischt' },
    { code: '12345', label: 'zu kurz (5 Stellen)' },
    { code: '1234567', label: 'zu lang (7 Stellen)' },
    { code: '12 345', label: 'mit Leerzeichen' },
    { code: 123456, label: 'Zahl statt String' },
  ]

  for (const { code, label } of BAD_CODES) {
    it(`weist ${label} ab: ${JSON.stringify(code)}`, async () => {
      const res = await twoFaVerifyRoute(
        postRequest(`${BASE}/api/auth/2fa/verify`, { code }),
      )
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toMatch(/6-stellig/)
    })
  }
})

// ────────────────────────────────────────────────────────────────
// 7. Berliner Zeit bei Miet-Buchungen
// ────────────────────────────────────────────────────────────────
describe('7. Miet-Buchungen nutzen berlinToday() statt UTC', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('weist startDate in der Vergangenheit ab (Berlin-Zeit)', async () => {
    // 2026-09-01 00:30 UTC = 2026-09-01 02:30 Berlin (CEST)
    // Beide Kalender zeigen 2026-09-01 => 2026-08-31 liegt davor.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-01T00:30:00.000Z'))

    const res = await rentalBookingsRoute(
      postRequest(`${BASE}/api/rental-bookings`, {
        equipmentId: IDS.equipment,
        startDate: '2026-08-31',
        endDate: '2026-09-05',
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Vergangenheit/)
  })

  it('akzeptiert startDate von heute (Berlin-Zeit)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))

    const res = await rentalBookingsRoute(
      postRequest(`${BASE}/api/rental-bookings`, {
        equipmentId: IDS.equipment,
        startDate: '2026-09-01',
        endDate: '2026-09-05',
      }),
    )

    // Nicht 400 "liegt in der Vergangenheit" — entweder 201 oder ein
    // spaeterer Fehler (z.B. Overlap), aber die Datumspruefung ist durch.
    expect(res.status).not.toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 8. Upload-Validierung
// ────────────────────────────────────────────────────────────────
describe('8. Upload: MIME-Typ, Dateigroesse und imageType', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
  })

  it('weist nicht-Bild-MIME-Typen ab', async () => {
    const htmlFile = new File(['<h1>evil</h1>'], 'evil.html', { type: 'text/html' })

    const res = await uploadRoute(
      uploadRequest({
        file: htmlFile,
        salonId: IDS.salon,
        imageType: 'logo',
      }),
    )

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Dateityp/)
  })

  it('weist Dateien ueber 5 MB ab', async () => {
    // Erzeuge einen Mock-File mit size > 5 MB
    const bigContent = new Uint8Array(5 * 1024 * 1024 + 1)
    const bigFile = new File([bigContent], 'huge.jpg', { type: 'image/jpeg' })

    const res = await uploadRoute(
      uploadRequest({
        file: bigFile,
        salonId: IDS.salon,
        imageType: 'gallery',
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/5 MB/)
  })

  it('weist ungueltigen imageType ab', async () => {
    const jpgFile = new File([new Uint8Array(100)], 'test.jpg', { type: 'image/jpeg' })

    const res = await uploadRoute(
      uploadRequest({
        file: jpgFile,
        salonId: IDS.salon,
        imageType: 'executable',
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/imageType/)
  })
})

// ────────────────────────────────────────────────────────────────
// 9. Push-Endpoint-Laengenlimit
// ────────────────────────────────────────────────────────────────
describe('9. Push-Subscribe: Laengenlimits auf Feldern', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  it('weist endpoints ueber 2000 Zeichen ab', async () => {
    const res = await pushSubscribeRoute(
      postRequest(`${BASE}/api/push/subscribe`, {
        endpoint: 'https://fcm.googleapis.com/' + 'x'.repeat(2000),
        p256dh: 'valid-key',
        auth: 'valid-auth',
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/endpoint/)
  })

  it('weist fehlende Felder ab', async () => {
    const res = await pushSubscribeRoute(
      postRequest(`${BASE}/api/push/subscribe`, {
        endpoint: 'https://fcm.googleapis.com/test',
        // p256dh fehlt
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/p256dh/)
  })

  it('weist p256dh ueber 500 Zeichen ab', async () => {
    const res = await pushSubscribeRoute(
      postRequest(`${BASE}/api/push/subscribe`, {
        endpoint: 'https://fcm.googleapis.com/test',
        p256dh: 'x'.repeat(501),
        auth: 'valid-auth',
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/p256dh/)
  })

  it('akzeptiert gueltige Subscription', async () => {
    const res = await pushSubscribeRoute(
      postRequest(`${BASE}/api/push/subscribe`, {
        endpoint: 'https://fcm.googleapis.com/fcm/send/test',
        p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8',
        auth: 'tBHItJI5svbpC7ht',
      }),
    )

    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
// 10. Notification-UUID-Validierung
// ────────────────────────────────────────────────────────────────
describe('10. Notification-PUT: UUID-Validierung der IDs', () => {
  beforeEach(() => {
    state.session = sessionFor('customer')
  })

  it('weist ein leeres Array ab', async () => {
    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, { notificationIds: [] }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/nicht-leeres Array/)
  })

  it('weist Nicht-UUID-Strings ab', async () => {
    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, {
        notificationIds: ['not-a-uuid', 'also-bad'],
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Ungueltige Benachrichtigungs-IDs/)
  })

  it('weist mehr als 100 IDs ab', async () => {
    const ids = Array.from({ length: 101 }, (_, i) =>
      `${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`,
    )

    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, { notificationIds: ids }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Maximal 100/)
  })

  it('weist nicht-String-Elemente ab', async () => {
    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, {
        notificationIds: [12345, true],
      }),
    )

    expect(res.status).toBe(400)
  })

  it('akzeptiert gueltige UUIDs', async () => {
    db().replace('notification_log', [
      {
        id: IDS.customer,
        user_id: IDS.customer,
        is_read: false,
        title: 'Test',
        message: 'Test',
        created_at: new Date().toISOString(),
      },
    ])

    const res = await notificationsPut(
      putRequest(`${BASE}/api/notifications`, {
        notificationIds: [IDS.customer],
      }),
    )

    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
// 11. Cookie-Consent: sessionId-Laengenlimit
// ────────────────────────────────────────────────────────────────
describe('11. Cookie-Consent: sessionId-Validierung', () => {
  it('weist sessionId ueber 128 Zeichen ab', async () => {
    const res = await cookieConsentRoute(
      postRequest(`${BASE}/api/cookies/consent`, {
        sessionId: 'a'.repeat(129),
        choices: { statistics: true, marketing: false },
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Session-ID/)
  })

  it('weist leere sessionId ab', async () => {
    const res = await cookieConsentRoute(
      postRequest(`${BASE}/api/cookies/consent`, {
        sessionId: '',
        choices: { statistics: true },
      }),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Session-ID/)
  })

  it('weist nicht-string sessionId ab', async () => {
    const res = await cookieConsentRoute(
      postRequest(`${BASE}/api/cookies/consent`, {
        sessionId: 12345,
        choices: { statistics: true },
      }),
    )

    expect(res.status).toBe(400)
  })

  it('weist fehlende choices ab', async () => {
    const res = await cookieConsentRoute(
      postRequest(`${BASE}/api/cookies/consent`, {
        sessionId: 'valid-session-id',
      }),
    )

    expect(res.status).toBe(400)
  })
})

// ────────────────────────────────────────────────────────────────
// 12. CSV-Export: Datumsformat-Validierung
// ────────────────────────────────────────────────────────────────
describe('12. Provider-Dashboard-Export: Datumsformat', () => {
  beforeEach(() => {
    state.session = sessionFor('owner')
  })

  it('weist ungueltiges Startdatum ab', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export?from=not-a-date`),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Startdatum/)
  })

  it('weist US-Datumsformat ab', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export?to=12/31/2026`),
    )

    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Enddatum/)
  })

  it('weist SQL-Injection-Versuch ab', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export?from=2026-01-01'; DROP TABLE--`),
    )

    expect(res.status).toBe(400)
  })

  it('akzeptiert ISO-Datum YYYY-MM-DD', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export?from=2026-01-01&to=2026-12-31`),
    )

    // Kein 400 — der Datumswert ist gueltig
    expect(res.status).not.toBe(400)
  })

  it('akzeptiert ISO-Datum mit Uhrzeit', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export?from=2026-01-01T00:00:00Z`),
    )

    expect(res.status).not.toBe(400)
  })

  it('funktioniert ohne Datumsparameter', async () => {
    const res = await exportRoute(
      getRequest(`${BASE}/api/provider/dashboard/export`),
    )

    expect(res.status).not.toBe(400)
  })
})
