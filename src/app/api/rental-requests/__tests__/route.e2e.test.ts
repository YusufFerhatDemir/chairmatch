// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'

/**
 * E2E der Kette Mietanfrage → E-Mail → email_delivery_log.
 *
 * Anders als die Unit-Tests in src/lib/__tests__ laeuft hier der echte
 * Route-Handler gegen eine In-Memory-Datenbank, die den UNIQUE-Index auf
 * (email_type, reference_id) tatsaechlich durchsetzt. Gemockt ist nur, was
 * das Prozessgrenze verlaesst: Session und der Resend-HTTP-Client. Der
 * Mail-Renderer, das Delivery-Log und die Idempotenzlogik laufen echt.
 *
 * Geprueft wird in dieser Reihenfolge:
 *   1. Happy Path — Anfrage persistiert, Mail raus, Log auf 'sent'
 *   2. Idempotenz — zweiter Versand derselben Anfrage-ID sendet nicht nochmal
 *   3. Fehlerfaelle — Provider-Fehler/Ausfall landen als 'failed' im Log
 *   4. DB-Fehler — die Anfrage schlaegt sauber fehl, ohne Ersatzspeicher
 */

// ── Mocks: nur die Prozessgrenzen ───────────────────────────────────────────

const mail = vi.hoisted(() => ({
  sent: [] as Array<{ from: string; to: string; subject: string; html: string }>,
  /** 'ok' = zugestellt, 'error' = Provider antwortet mit Fehler, 'down' = kein Kontakt */
  mode: 'ok' as 'ok' | 'error' | 'down',
  messageId: 'msg_e2e_1',
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { from: string; to: string; subject: string; html: string }) => {
        mail.sent.push(payload)
        if (mail.mode === 'down') throw new Error('connect ECONNREFUSED api.resend.com:443')
        if (mail.mode === 'error') return { data: null, error: { message: 'Rate limit exceeded' } }
        return { data: { id: mail.messageId }, error: null }
      },
    }
  },
}))

const auth = vi.hoisted(() => ({
  session: null as { user?: { id?: string; name?: string; email?: string } } | null,
}))

vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => auth.session,
}))

vi.mock('@/lib/supabase-server', async () => {
  const { fakeDb: db } = await import('@/test/fake-supabase')
  return { getSupabaseAdmin: () => db }
})

// ── Fixtures ────────────────────────────────────────────────────────────────

const OWNER_ID = '22222222-2222-4222-8222-222222222222'
const REQUESTER_ID = '33333333-3333-4333-8333-333333333333'
const EQUIPMENT_ID = '44444444-4444-4444-8444-444444444444'
const SALON_ID = '55555555-5555-4555-8555-555555555555'

const LANDLORD_EMAIL = 'vermieterin@example.com'
const EMAIL_TYPE = 'rental_request_created'

/** Immer in der Zukunft — der Handler weist vergangene Termine ab. */
const FUTURE_DATE = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

type Post = (req: NextRequest) => Promise<Response>
let POST: Post
type NotifyLandlord = typeof import('@/lib/rental-request-email')['notifyLandlordOfRentalRequest']
let notifyLandlordOfRentalRequest: NotifyLandlord

beforeAll(async () => {
  // Der Resend-Client entsteht beim Import von email.ts — Env muss vorher stehen.
  process.env.RESEND_API_KEY = 're_test_e2e'
  process.env.RESEND_FROM_EMAIL = 'ChairMatch <noreply@chairmatch.de>'
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.chairmatch.de'
  POST = (await import('@/app/api/rental-requests/route')).POST as unknown as Post
  notifyLandlordOfRentalRequest = (await import('@/lib/rental-request-email'))
    .notifyLandlordOfRentalRequest
})

function seedDatabase() {
  fakeDb.reset()
  // Der Index aus 20260823_email_delivery_log.sql — Herzstueck der Idempotenz.
  fakeDb.addUniqueIndex('email_delivery_log', ['email_type', 'reference_id'], 'uq_email_delivery_log_ref')
  // Der PRIMARY KEY aus 20260823_rental_request_dedupe.sql. Hier nur, damit
  // die Route dieselben Bedingungen sieht wie in Produktion; der
  // Doppel-Submit-Schutz selbst wird in dedupe.test.ts geprueft.
  fakeDb.addUniqueIndex('rental_request_dedupe', ['fingerprint'], 'rental_request_dedupe_pkey')

  fakeDb.seed('rental_equipment', [
    {
      id: EQUIPMENT_ID,
      salon_id: SALON_ID,
      name: 'Stuhl am Fenster',
      type: 'stuhl',
      price_per_day_cents: 9000,
      price_per_hour_cents: 1500,
      price_per_week_cents: null,
      price_per_month_cents: null,
      is_available: true,
      salons: { name: 'Salon Anna', city: 'Koeln', owner_id: OWNER_ID },
    },
  ])
  fakeDb.seed('profiles', [
    { id: OWNER_ID, email: LANDLORD_EMAIL, full_name: 'Anna Vermieterin' },
    { id: REQUESTER_ID, email: 'marko@example.com', full_name: 'Marko Fischer' },
  ])
}

function requestBody(overrides: Row = {}): Row {
  return {
    equipmentId: EQUIPMENT_ID,
    requestType: 'miete',
    preferredDate: FUTURE_DATE,
    preferredTime: '10:00',
    durationUnit: 'day',
    units: 3,
    message: 'Ich haette Interesse an drei Probetagen.',
    ...overrides,
  }
}

function postRequest(body: Row): NextRequest {
  return new Request('http://localhost:3000/api/rental-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

async function submit(body: Row = requestBody()) {
  const res = await POST(postRequest(body))
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const deliveryLog = () => fakeDb.rows('email_delivery_log')
const rentalRequests = () => fakeDb.rows('rental_requests')

beforeEach(() => {
  seedDatabase()
  mail.sent = []
  mail.mode = 'ok'
  auth.session = { user: { id: REQUESTER_ID, name: 'Marko Fischer', email: 'marko@example.com' } }
})

// ── 1. Happy Path ───────────────────────────────────────────────────────────

describe('POST /api/rental-requests — Kette bis zum Zustelllog', () => {
  it('persistiert die Anfrage, verschickt die Mail und protokolliert sie als sent', async () => {
    const { status, json } = await submit()

    expect(status).toBe(201)

    // Persistenz — die Anfrage liegt in der DB, nicht nur in der Antwort.
    expect(rentalRequests()).toHaveLength(1)
    const stored = rentalRequests()[0]
    expect(stored.recipient_id).toBe(OWNER_ID)
    expect(stored.requester_id).toBe(REQUESTER_ID)
    expect(stored.status).toBe('open')
    expect(stored.estimated_cents).toBe(27000)
    expect((json.request as Row).id).toBe(stored.id)

    // Versand
    expect(mail.sent).toHaveLength(1)
    expect(mail.sent[0].to).toBe(LANDLORD_EMAIL)

    // Log
    expect(deliveryLog()).toHaveLength(1)
    const log = deliveryLog()[0]
    expect(log.email_type).toBe(EMAIL_TYPE)
    expect(log.reference_id).toBe(String(stored.id))
    expect(log.recipient_user_id).toBe(OWNER_ID)
    expect(log.recipient_email).toBe(LANDLORD_EMAIL)
    expect(log.status).toBe('sent')
    expect(log.provider_message_id).toBe('msg_e2e_1')
    expect(log.error ?? null).toBeNull()
  })

  it('legt die Log-Zeile vor dem Versand als pending an', async () => {
    await submit()
    const inserts = fakeDb.access.filter((a) => a.table === 'email_delivery_log' && a.op === 'insert')
    expect(inserts).toHaveLength(1)
    expect(inserts[0].payload?.[0].status).toBe('pending')
    // Der Zustand wandert erst nach dem Providerergebnis auf 'sent'.
    const updates = fakeDb.access.filter((a) => a.table === 'email_delivery_log' && a.op === 'update')
    expect(updates).toHaveLength(1)
    expect(updates[0].payload?.[0].status).toBe('sent')
  })

  it('benachrichtigt den Vermieter zusaetzlich in der App', async () => {
    await submit()
    expect(fakeDb.rows('notifications')).toHaveLength(1)
    expect(fakeDb.rows('notifications')[0].user_id).toBe(OWNER_ID)
  })

  it('gibt in der Mail keinen Klarnamen und keine Adresse des Interessenten preis', async () => {
    await submit()
    const html = mail.sent[0].html
    expect(html).toContain('Marko F.')
    expect(html).not.toContain('Marko Fischer')
    expect(html).not.toContain('marko@example.com')
  })
})

// ── 2. Idempotenz ───────────────────────────────────────────────────────────

describe('Idempotenz ueber (email_type, reference_id)', () => {
  it('sendet bei einem Retry derselben Anfrage keine zweite Mail', async () => {
    await submit()
    const requestId = String(rentalRequests()[0].id)

    // Zweiter Durchlauf derselben Zustellung — z. B. Retry der Serverless-Funktion.
    const outcome = await notifyLandlordOfRentalRequest({
      requestId,
      recipientId: OWNER_ID,
      requestType: 'miete',
      equipmentName: 'Stuhl am Fenster',
      requesterName: 'Marko Fischer',
      preferredDate: FUTURE_DATE,
      durationUnit: 'day',
      units: 3,
      estimatedCents: 27000,
    })

    expect(outcome).toEqual({ status: 'skipped', reason: 'Bereits versendet' })
    expect(mail.sent).toHaveLength(1)
    expect(deliveryLog()).toHaveLength(1)
  })

  it('laesst den UNIQUE-Index den zweiten Insert abweisen — kein zweiter Log-Eintrag', async () => {
    await submit()
    const requestId = String(rentalRequests()[0].id)

    const { error } = await fakeDb
      .from('email_delivery_log')
      .insert({ email_type: EMAIL_TYPE, reference_id: requestId, status: 'pending' })
      .select('id')
      .maybeSingle()

    expect(error?.code).toBe('23505')
    expect(deliveryLog()).toHaveLength(1)
  })

  it('behandelt eine zweite, eigenstaendige Anfrage als eigenen Vorgang', async () => {
    // Der Schluessel ist die rental_requests.id, nicht Nutzer + Mietobjekt:
    // wer zweimal wirklich anfragt, bekommt auch zwei Mails.
    await submit()
    await submit(requestBody({ preferredDate: FUTURE_DATE, message: 'Zweiter Anlauf' }))

    expect(rentalRequests()).toHaveLength(2)
    expect(deliveryLog()).toHaveLength(2)
    expect(mail.sent).toHaveLength(2)
    const references = deliveryLog().map((row) => row.reference_id)
    expect(new Set(references).size).toBe(2)
  })
})

// ── 3. Fehlerfaelle beim Versand ────────────────────────────────────────────

describe('Fehlerfaelle beim Mailversand', () => {
  it('protokolliert einen Providerfehler als failed, ohne die Anfrage zu verlieren', async () => {
    mail.mode = 'error'
    const { status } = await submit()

    expect(status).toBe(201)
    expect(rentalRequests()).toHaveLength(1)
    const log = deliveryLog()[0]
    expect(log.status).toBe('failed')
    expect(log.error).toBe('Rate limit exceeded')
    expect(log.recipient_email).toBe(LANDLORD_EMAIL)
    expect(log.provider_message_id ?? null).toBeNull()
  })

  it('haelt einen kompletten Provider-Ausfall aus', async () => {
    mail.mode = 'down'
    const { status } = await submit()

    expect(status).toBe(201)
    const log = deliveryLog()[0]
    expect(log.status).toBe('failed')
    expect(String(log.error)).toContain('ECONNREFUSED')
  })

  it('markiert eine fehlende Empfaengeradresse als skipped statt zu senden', async () => {
    fakeDb.rows('profiles')[0].email = null
    const { status } = await submit()

    expect(status).toBe(201)
    expect(mail.sent).toHaveLength(0)
    expect(deliveryLog()[0].status).toBe('skipped')
    expect(deliveryLog()[0].error).toBe('Keine E-Mail-Adresse hinterlegt')
  })

  it('trennt einen DB-Ausfall beim Empfaenger-Lookup vom Fall „keine Adresse"', async () => {
    // Ein Timeout auf `profiles` darf nicht als 'skipped' enden — sonst sieht
    // ein Ausfall im Log aus wie ein Vermieter, der nie eine Mail wollte.
    fakeDb.failOn('profiles.select', { code: '57014', message: 'statement timeout' })
    const { status } = await submit()

    expect(status).toBe(201)
    expect(mail.sent).toHaveLength(0)
    expect(deliveryLog()[0].status).toBe('failed')
    expect(String(deliveryLog()[0].error)).toContain('statement timeout')
  })

  it('sendet ohne Log-Tabelle weiter — aber dann ohne Doppelversand-Schutz', async () => {
    // Zustand vor der Migration 20260823.
    fakeDb.dropTable('email_delivery_log')
    const { status } = await submit()

    expect(status).toBe(201)
    expect(mail.sent).toHaveLength(1)
  })
})

// ── 4. DB-Fehler: sauber scheitern, kein Ersatzspeicher ─────────────────────

describe('DB-Fehler', () => {
  it('antwortet mit 500 und verschickt nichts, wenn die Anfrage nicht gespeichert werden kann', async () => {
    fakeDb.failOn('rental_requests.insert', { code: '23503', message: 'insert violates foreign key' })
    const { status, json } = await submit()

    expect(status).toBe(500)
    expect(json.error).toBe('Anfrage konnte nicht gesendet werden')
    expect(json.request).toBeUndefined()
    expect(mail.sent).toHaveLength(0)
    expect(deliveryLog()).toHaveLength(0)
    expect(fakeDb.rows('notifications')).toHaveLength(0)
  })

  it('antwortet mit 500, wenn das Mietobjekt nicht geladen werden kann', async () => {
    fakeDb.failOn('rental_equipment.select', { code: '08006', message: 'connection failure' })
    const { status } = await submit()

    expect(status).toBe(500)
    expect(rentalRequests()).toHaveLength(0)
    expect(mail.sent).toHaveLength(0)
  })

  it('kippt die Anfrage nicht, wenn nur die In-App-Benachrichtigung scheitert', async () => {
    fakeDb.failOn('notifications.insert', { message: 'permission denied for table notifications' })
    const { status } = await submit()

    expect(status).toBe(201)
    expect(rentalRequests()).toHaveLength(1)
    expect(deliveryLog()[0].status).toBe('sent')
  })

  it('weist unauthentifizierte Anfragen ab, bevor irgendetwas geschrieben wird', async () => {
    auth.session = null
    const { status } = await submit()

    expect(status).toBe(401)
    expect(fakeDb.access).toHaveLength(0)
  })

  it('speichert nichts bei einer Anfrage auf das eigene Mietobjekt', async () => {
    auth.session = { user: { id: OWNER_ID, name: 'Anna Vermieterin' } }
    const { status } = await submit()

    expect(status).toBe(400)
    expect(rentalRequests()).toHaveLength(0)
    expect(mail.sent).toHaveLength(0)
  })
})

// ── 5. Kein stiller Ersatzspeicher im Client ────────────────────────────────

describe('Kein localStorage-Fallback', () => {
  it('schreibt die Anfrage im Formular nirgends lokal weg', () => {
    const page = readFileSync(
      resolve(process.cwd(), 'src/app/(public)/inserat/[id]/anfragen/page.tsx'),
      'utf8',
    )
    // Ein fehlgeschlagener POST muss als Fehler sichtbar werden, nicht als
    // scheinbarer Erfolg aus dem Browserspeicher.
    expect(page).not.toMatch(/localStorage\.setItem/)
    expect(page).toContain('/api/rental-requests')
    expect(page).toContain('setSubmitError')
  })
})
