// @vitest-environment node
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'
import { fakeDb, type Row } from '@/test/fake-supabase'
import { NOTIFICATION_TABLE } from '@/lib/notifications'
import { applyLiveSchema } from '@/test/live-schema'

/**
 * Doppel-Submit-Schutz fuer Mietanfragen (Track 5).
 *
 * Der echte Route-Handler laeuft gegen die In-Memory-DB, die den PRIMARY KEY
 * auf `rental_request_dedupe.fingerprint` genauso durchsetzt wie Postgres
 * (Fehlercode 23505). Nur dadurch ist der Race-Pfad ehrlich getestet: der
 * zweite Claim-Insert scheitert wirklich, statt dass ein Mock ihn scheitern
 * laesst.
 *
 * Geprueft wird die komplette Anforderungsliste:
 *   1. Doppelklick / parallele Requests  → genau ein Insert
 *   2. Schnelle Folge-Requests           → Duplikat erkannt, idempotente Antwort
 *   3. Anderes Mietobjekt / anderer Inhalt / anderer Nutzer → kommt durch
 *   4. Nach Ablauf des Fensters          → kommt durch
 *   5. Idempotency-Key                   → hat Vorrang, ist nutzergebunden
 *   6. DB-Fehler                         → 500, kein stiller Fallback
 */

// ── Mocks: nur die Prozessgrenzen ───────────────────────────────────────────

const mail = vi.hoisted(() => ({
  sent: [] as Array<{ to: string; subject: string }>,
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { to: string; subject: string }) => {
        mail.sent.push(payload)
        return { data: { id: 'msg_dedupe' }, error: null }
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
const OTHER_REQUESTER_ID = '66666666-6666-4666-8666-666666666666'
const EQUIPMENT_ID = '44444444-4444-4444-8444-444444444444'
const OTHER_EQUIPMENT_ID = '77777777-7777-4777-8777-777777777777'
const SALON_ID = '55555555-5555-4555-8555-555555555555'

const DEDUPE_TABLE = 'rental_request_dedupe'

/** Immer in der Zukunft — der Handler weist vergangene Termine ab. */
const FUTURE_DATE = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
const LATER_DATE = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10)

type Post = (req: NextRequest) => Promise<Response>
let POST: Post
type Settings = typeof import('@/lib/rental-request-dedupe')['DEDUPE_SETTINGS']
let DEDUPE_SETTINGS: Settings
type Fingerprint = typeof import('@/lib/rental-request-dedupe')['rentalRequestFingerprint']
let rentalRequestFingerprint: Fingerprint
type Normalize = typeof import('@/lib/rental-request-dedupe')['normalizeMessage']
let normalizeMessage: Normalize

beforeAll(async () => {
  process.env.RESEND_API_KEY = 're_test_dedupe'
  process.env.RESEND_FROM_EMAIL = 'ChairMatch <noreply@chairmatch.de>'
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.chairmatch.de'
  POST = (await import('@/app/api/rental-requests/route')).POST as unknown as Post
  const dedupe = await import('@/lib/rental-request-dedupe')
  DEDUPE_SETTINGS = dedupe.DEDUPE_SETTINGS
  rentalRequestFingerprint = dedupe.rentalRequestFingerprint
  normalizeMessage = dedupe.normalizeMessage
})

function seedDatabase() {
  fakeDb.reset()
  // Spalten wie in Produktion. Ohne das nimmt der Fake jede erfundene Spalte
  // an — genau so blieben `email_delivery_log.recipient_user_id` und `.error`
  // hier gruen, waehrend sie live in 42703 liefen.
  applyLiveSchema(fakeDb)
  // Der PRIMARY KEY aus 20260823_rental_request_dedupe.sql — der eigentliche Riegel.
  fakeDb.addUniqueIndex(DEDUPE_TABLE, ['fingerprint'], 'rental_request_dedupe_pkey')
  fakeDb.addUniqueIndex(
    'email_delivery_log',
    ['email_type', 'reference_id'],
    'uq_email_delivery_log_ref',
  )

  const equipmentDefaults = {
    salon_id: SALON_ID,
    type: 'stuhl',
    price_per_day_cents: 9000,
    price_per_hour_cents: 1500,
    price_per_week_cents: null,
    price_per_month_cents: null,
    is_available: true,
    salons: { name: 'Salon Anna', city: 'Koeln', owner_id: OWNER_ID },
  }

  fakeDb.seed('rental_equipment', [
    { id: EQUIPMENT_ID, name: 'Stuhl am Fenster', ...equipmentDefaults },
    { id: OTHER_EQUIPMENT_ID, name: 'Stuhl hinten links', ...equipmentDefaults },
  ])
  fakeDb.seed('profiles', [
    { id: OWNER_ID, email: 'vermieterin@example.com', full_name: 'Anna Vermieterin' },
    { id: REQUESTER_ID, email: 'marko@example.com', full_name: 'Marko Fischer' },
    { id: OTHER_REQUESTER_ID, email: 'lea@example.com', full_name: 'Lea Berger' },
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

function postRequest(body: Row, headers: Record<string, string> = {}): NextRequest {
  return new Request('http://localhost:3000/api/rental-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }) as unknown as NextRequest
}

async function submit(body: Row = requestBody(), headers: Record<string, string> = {}) {
  const res = await POST(postRequest(body, headers))
  return { status: res.status, json: (await res.json()) as Record<string, unknown> }
}

const rentalRequests = () => fakeDb.rows('rental_requests')
const claims = () => fakeDb.rows(DEDUPE_TABLE)
const notifications = () => fakeDb.rows(NOTIFICATION_TABLE)

beforeEach(() => {
  seedDatabase()
  mail.sent = []
  auth.session = { user: { id: REQUESTER_ID, name: 'Marko Fischer', email: 'marko@example.com' } }
  // Wartefenster kurz halten — die Logik bleibt dieselbe, der Testlauf schnell.
  DEDUPE_SETTINGS.pollAttempts = 4
  DEDUPE_SETTINGS.pollDelayMs = 5
  DEDUPE_SETTINGS.windowMs = 5 * 60 * 1000
})

// ── 1. Parallele Requests ───────────────────────────────────────────────────

describe('Parallele Requests mit gleichem Inhalt', () => {
  it('legt bei zwei gleichzeitigen POSTs genau eine Anfrage an', async () => {
    const [first, second] = await Promise.all([submit(), submit()])

    // Der Kern: die DB hat genau eine Zeile, egal wer gewonnen hat.
    expect(rentalRequests()).toHaveLength(1)
    expect(claims()).toHaveLength(1)

    expect([first.status, second.status].sort()).toEqual([200, 201])

    const created = first.status === 201 ? first : second
    const duplicate = first.status === 201 ? second : first
    expect((created.json.request as Row).id).toBe(rentalRequests()[0].id)
    expect(duplicate.json.duplicate).toBe(true)
    expect((duplicate.json.request as Row).id).toBe(rentalRequests()[0].id)
  })

  it('verschickt bei parallelen Requests nur eine Mail und eine Benachrichtigung', async () => {
    await Promise.all([submit(), submit()])

    expect(mail.sent).toHaveLength(1)
    expect(notifications()).toHaveLength(1)
    expect(fakeDb.rows('email_delivery_log')).toHaveLength(1)
  })

  it('haelt auch fuenf gleichzeitige Requests auf eine Anfrage zusammen', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => submit()))

    expect(rentalRequests()).toHaveLength(1)
    expect(mail.sent).toHaveLength(1)
    expect(results.filter((r) => r.status === 201)).toHaveLength(1)
    // Kein Aufrufer bekommt einen Serverfehler zu sehen.
    expect(results.every((r) => r.status === 201 || r.status === 200 || r.status === 409)).toBe(true)
    expect(results.some((r) => r.status >= 500)).toBe(false)
  })
})

// ── 2. Schnelle Folge-Requests ──────────────────────────────────────────────

describe('Schnelle Folge-Requests (Doppelklick, Retry)', () => {
  it('erkennt den zweiten identischen Request als Duplikat', async () => {
    const first = await submit()
    const second = await submit()

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(second.json.duplicate).toBe(true)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('antwortet idempotent mit derselben Anfrage statt mit einem Fehler', async () => {
    const first = await submit()
    const second = await submit()

    expect((second.json.request as Row).id).toBe((first.json.request as Row).id)
    expect(second.json.estimatedCents).toBe(first.json.estimatedCents)
  })

  it('loest beim Duplikat weder Mail noch Benachrichtigung erneut aus', async () => {
    await submit()
    await submit()
    await submit()

    expect(mail.sent).toHaveLength(1)
    expect(notifications()).toHaveLength(1)
  })

  it('ignoriert Whitespace-Unterschiede in der Nachricht', async () => {
    await submit()
    // Wie beim Copy-Paste desselben Textes: gleicher Inhalt, andere Leerzeichen.
    const second = await submit(
      requestBody({ message: '  Ich haette Interesse an   drei Probetagen.  ' }),
    )

    expect(second.status).toBe(200)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('antwortet mit 409, solange der Erstversuch noch laeuft', async () => {
    // Ein Claim ohne `request_id` = ein Request, der gerade mittendrin ist.
    const fingerprint = rentalRequestFingerprint({
      requesterId: REQUESTER_ID,
      equipmentId: EQUIPMENT_ID,
      requestType: 'miete',
      preferredDate: FUTURE_DATE,
      preferredTime: '10:00',
      durationUnit: 'day',
      units: 3,
      message: 'Ich haette Interesse an drei Probetagen.',
    })
    fakeDb.seed(DEDUPE_TABLE, [
      {
        fingerprint,
        requester_id: REQUESTER_ID,
        equipment_id: EQUIPMENT_ID,
        request_id: null,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ])

    const { status, json } = await submit()

    expect(status).toBe(409)
    expect(json.duplicate).toBe(true)
    expect(String(json.error)).toContain('gerade gesendet')
    expect(rentalRequests()).toHaveLength(0)
    expect(mail.sent).toHaveLength(0)
  })
})

// ── 3. Was durchkommen MUSS ─────────────────────────────────────────────────

describe('Legitime Anfragen kommen durch', () => {
  it('laesst eine Anfrage fuer ein anderes Mietobjekt zu', async () => {
    await submit()
    const second = await submit(requestBody({ equipmentId: OTHER_EQUIPMENT_ID }))

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
    expect(mail.sent).toHaveLength(2)
  })

  it('laesst einen anderen Termin fuer dasselbe Mietobjekt zu', async () => {
    await submit()
    const second = await submit(requestBody({ preferredDate: LATER_DATE }))

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })

  it('laesst eine geaenderte Dauer und Menge zu', async () => {
    await submit()
    expect((await submit(requestBody({ units: 5 }))).status).toBe(201)
    expect((await submit(requestBody({ durationUnit: 'week', units: 3 }))).status).toBe(201)
    expect(rentalRequests()).toHaveLength(3)
  })

  it('laesst eine umformulierte Nachricht als neue Anfrage zu', async () => {
    await submit()
    const second = await submit(requestBody({ message: 'Doch lieber ab Montag, geht das?' }))

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })

  it('blockiert nie ueber Nutzergrenzen hinweg', async () => {
    await submit()
    auth.session = { user: { id: OTHER_REQUESTER_ID, name: 'Lea Berger', email: 'lea@example.com' } }
    const second = await submit()

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })

  it('trennt Besichtigung und Mietanfrage', async () => {
    await submit()
    const second = await submit(
      requestBody({ requestType: 'besichtigung', durationUnit: undefined, units: undefined }),
    )

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })
})

// ── 4. Zeitfenster ──────────────────────────────────────────────────────────

describe('Zeitfenster', () => {
  it('laesst dieselbe Anfrage nach Ablauf des Fensters wieder zu', async () => {
    const first = await submit()
    expect(first.status).toBe(201)

    // Fenster ablaufen lassen — die Route uebernimmt den Claim dann selbst.
    claims()[0].expires_at = new Date(Date.now() - 1000).toISOString()

    const second = await submit()

    expect(second.status).toBe(201)
    expect((second.json.request as Row).id).not.toBe((first.json.request as Row).id)
    expect(rentalRequests()).toHaveLength(2)
    expect(mail.sent).toHaveLength(2)
    // Der Claim wird uebernommen, nicht dupliziert.
    expect(claims()).toHaveLength(1)
    expect(claims()[0].request_id).toBe(rentalRequests()[1].id)
  })

  it('blockiert innerhalb des Fensters weiter, auch kurz vor Ablauf', async () => {
    await submit()
    claims()[0].expires_at = new Date(Date.now() + 500).toISOString()

    expect((await submit()).status).toBe(200)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('raeumt beim Uebernehmen laengst abgelaufene Claims mit weg', async () => {
    fakeDb.seed(DEDUPE_TABLE, [
      {
        fingerprint: 'alt-und-vergessen',
        requester_id: OTHER_REQUESTER_ID,
        expires_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      },
    ])
    await submit()
    claims().find((c) => c.fingerprint !== 'alt-und-vergessen')!.expires_at = new Date(
      Date.now() - 1000,
    ).toISOString()

    await submit()

    expect(claims().some((c) => c.fingerprint === 'alt-und-vergessen')).toBe(false)
  })
})

// ── 5. Idempotency-Key ──────────────────────────────────────────────────────

describe('Idempotency-Key-Header', () => {
  const KEY = { 'idempotency-key': 'form-session-abc-123' }

  it('erkennt ein Duplikat am Key, auch wenn der Inhalt abweicht', async () => {
    const first = await submit(requestBody(), KEY)
    const second = await submit(requestBody({ message: 'Anderer Text, gleicher Key' }), KEY)

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('behandelt verschiedene Keys als verschiedene Anfragen', async () => {
    await submit(requestBody(), KEY)
    const second = await submit(requestBody(), { 'idempotency-key': 'form-session-xyz-999' })

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })

  it('laesst denselben Key bei zwei Nutzern nicht kollidieren', async () => {
    await submit(requestBody(), KEY)
    auth.session = { user: { id: OTHER_REQUESTER_ID, name: 'Lea Berger', email: 'lea@example.com' } }
    const second = await submit(requestBody(), KEY)

    expect(second.status).toBe(201)
    expect(rentalRequests()).toHaveLength(2)
  })

  it('faellt bei leerem Key auf den Inhalts-Fingerprint zurueck', async () => {
    await submit(requestBody(), { 'idempotency-key': '   ' })
    const second = await submit(requestBody(), { 'idempotency-key': '' })

    expect(second.status).toBe(200)
    expect(rentalRequests()).toHaveLength(1)
  })
})

// ── 6. DB-Fehler: sauber scheitern ──────────────────────────────────────────

describe('DB-Fehler', () => {
  it('antwortet mit 500, wenn der Riegel selbst nicht funktioniert', async () => {
    fakeDb.failOn(`${DEDUPE_TABLE}.insert`, { code: '57014', message: 'statement timeout' })
    const { status, json } = await submit()

    // Ohne funktionierenden Riegel wird NICHT durchgewinkt — sonst entstuenden
    // genau die Doppelanfragen, die er verhindern soll.
    expect(status).toBe(500)
    expect(json.error).toBe('Anfrage konnte nicht gesendet werden')
    expect(json.request).toBeUndefined()
    expect(rentalRequests()).toHaveLength(0)
    expect(mail.sent).toHaveLength(0)
    expect(notifications()).toHaveLength(0)
  })

  it('antwortet mit 500, wenn die Uebernahme eines Claims scheitert', async () => {
    await submit()
    claims()[0].expires_at = new Date(Date.now() - 1000).toISOString()
    fakeDb.failOn(`${DEDUPE_TABLE}.update`, { code: '08006', message: 'connection failure' })

    const { status } = await submit()

    expect(status).toBe(500)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('gibt den Claim frei, wenn die Anfrage nicht gespeichert werden konnte', async () => {
    fakeDb.failOn('rental_requests.insert', { code: '23503', message: 'foreign key violation' })
    const failed = await submit()

    expect(failed.status).toBe(500)
    expect(rentalRequests()).toHaveLength(0)
    expect(mail.sent).toHaveLength(0)
    // Entscheidend: der Nutzer ist danach nicht fuer fuenf Minuten gesperrt.
    expect(claims()).toHaveLength(0)

    fakeDb.failures.delete('rental_requests.insert')
    const retry = await submit()

    expect(retry.status).toBe(201)
    expect(rentalRequests()).toHaveLength(1)
  })

  it('speichert die Anfrage weiter, wenn die Dedupe-Tabelle noch fehlt', async () => {
    // Zustand vor der Migration 20260823_rental_request_dedupe.sql: der Riegel
    // ist ein Zusatz, kein Nadeloehr — die Anfrage selbst darf nicht scheitern.
    fakeDb.dropTable(DEDUPE_TABLE)
    const { status } = await submit()

    expect(status).toBe(201)
    expect(rentalRequests()).toHaveLength(1)
    expect(mail.sent).toHaveLength(1)
  })

  it('setzt keinen Claim, wenn die Anfrage fachlich abgelehnt wird', async () => {
    auth.session = { user: { id: OWNER_ID, name: 'Anna Vermieterin' } }
    const { status } = await submit()

    expect(status).toBe(400)
    expect(claims()).toHaveLength(0)
    expect(rentalRequests()).toHaveLength(0)
  })
})

// ── 7. Fingerprint selbst ───────────────────────────────────────────────────

describe('rentalRequestFingerprint', () => {
  const base = {
    requesterId: REQUESTER_ID,
    equipmentId: EQUIPMENT_ID,
    requestType: 'miete',
    preferredDate: FUTURE_DATE,
    preferredTime: '10:00',
    durationUnit: 'day',
    units: 3,
    message: 'Hallo',
  }

  it('ist stabil fuer denselben Inhalt', () => {
    expect(rentalRequestFingerprint(base)).toBe(rentalRequestFingerprint({ ...base }))
  })

  it('ist ein SHA-256-Hex', () => {
    expect(rentalRequestFingerprint(base)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('aendert sich mit jedem fachlichen Feld', () => {
    const reference = rentalRequestFingerprint(base)
    const variants: Array<Partial<typeof base>> = [
      { requesterId: OTHER_REQUESTER_ID },
      { equipmentId: OTHER_EQUIPMENT_ID },
      { requestType: 'besichtigung' },
      { preferredDate: LATER_DATE },
      { preferredTime: '11:00' },
      { durationUnit: 'week' },
      { units: 4 },
      { message: 'Hallo!' },
    ]
    for (const variant of variants) {
      expect(rentalRequestFingerprint({ ...base, ...variant })).not.toBe(reference)
    }
  })

  it('laesst sich nicht durch verschobene Feldgrenzen verwechseln', () => {
    // Ohne echtes Trennzeichen waeren „ab" + „c" und „a" + „bc" derselbe Hash.
    const a = rentalRequestFingerprint({ ...base, preferredTime: '10:0', durationUnit: '0day' })
    const b = rentalRequestFingerprint({ ...base, preferredTime: '10:00', durationUnit: 'day' })
    expect(a).not.toBe(b)
  })

  it('behandelt fehlende optionale Felder wie leere Felder — nicht wie undefined', () => {
    const withoutTime = rentalRequestFingerprint({ ...base, preferredTime: null })
    expect(withoutTime).toBe(rentalRequestFingerprint({ ...base, preferredTime: undefined }))
    expect(withoutTime).not.toBe(rentalRequestFingerprint(base))
  })
})

describe('normalizeMessage', () => {
  it('vereinheitlicht Whitespace, ohne Woerter zu verschmelzen', () => {
    expect(normalizeMessage('  Hallo   Welt \n da  ')).toBe('Hallo Welt da')
  })

  it('macht aus fehlender Nachricht einen leeren String', () => {
    expect(normalizeMessage(null)).toBe('')
    expect(normalizeMessage(undefined)).toBe('')
  })

  it('laesst Gross-/Kleinschreibung in Ruhe', () => {
    expect(normalizeMessage('Hallo')).not.toBe(normalizeMessage('hallo'))
  })
})
