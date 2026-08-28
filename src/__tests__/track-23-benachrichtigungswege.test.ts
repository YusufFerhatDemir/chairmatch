// @vitest-environment node
/**
 * Track 23: Benachrichtigungswege — Push, In-App-Postfach, Warteliste,
 * Cookie-Einwilligung.
 *
 * Der gemeinsame Nenner der schwersten Befunde ist EIN Postgres-Fehler:
 * 42P10, „there is no unique or exclusion constraint matching the ON CONFLICT
 * specification". Er entsteht, wenn `upsert(..., { onConflict: 'a,b' })` auf
 * eine Tabelle trifft, die keinen UNIQUE-Index auf genau (a, b) hat. Drei
 * Stellen im Produktivcode traf er bei JEDEM Aufruf:
 *
 *   (1) /api/wait-list          `onConflict: 'email,city'` gegen einen
 *                               AUSDRUCKS-Index (email, COALESCE(city, '')).
 *                               Danach ein Rueckfall auf die View `newsletter`
 *                               in einem try/catch, das supabase-js nie
 *                               betritt — und `{ ok: true }` an den Nutzer.
 *   (2) saveSubscription        `onConflict: 'user_id,endpoint'` gegen ein
 *                               UNIQUE allein auf `endpoint`; zusaetzlich eine
 *                               Spalte `updated_at`, die es live nicht gibt.
 *   (3) POST /api/favorites     `onConflict: 'customer_id,equipment_id'` gegen
 *                               einen PARTIELLEN Index (WHERE equipment_id IS
 *                               NOT NULL), der als Arbiter nie in Frage kommt.
 *
 * Dass keiner davon auffiel, liegt am Werkzeug: `src/test/fake-supabase.ts`
 * kannte gar kein `upsert()`, und die zweite Fassung im e2e-Harness nahm die
 * Konfliktspalten einfach als Schluessel — ohne zu pruefen, ob es dazu einen
 * Index gibt. Beide sind in diesem Track nachgezogen; die Pruefung im
 * e2e-Harness ist per `requireArbiterIndex()` zuschaltbar.
 *
 * Dazu kommen die Befunde des Push-Pfads (SSRF ueber den Endpunkt,
 * unverschluesselte Nutzdaten, unbrauchbare VAPID-Signatur) und die Luecke
 * der DSGVO-Loeschung.
 *
 * Was der Test NICHT zeigen kann: ob die Live-Datenbank die Migration
 * 20260828170738_benachrichtigungswege_haertung.sql erhalten hat. Sie ist
 * committet, nicht angewendet — es gibt in diesem Projekt keinen
 * Migrations-Runner.
 */
import { createECDH, randomBytes } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDb,
  enableLiveSchema,
  sessionFor,
  postRequest,
  IDS,
  type TestSession,
} from './e2e/_harness/fixtures'
import type { FakeSupabase } from './e2e/_harness/fake-supabase'

const state = vi.hoisted(() => {
  process.env.CRON_SECRET ??= 'cron-test-secret'
  process.env.NEXTAUTH_SECRET ??= 'track23-test-secret'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    fetches: [] as { url: string; headers: Record<string, string>; body: unknown }[],
    fetchStatus: 201,
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
  invalidateAccountState: () => undefined,
}))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  signOut: async () => undefined,
}))

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import { pruefePushEndpoint } from '@/lib/push-endpoint'
import {
  verschluesselePayload,
  entschluesselePayloadFuerTest,
  baueVapidKopf,
  pruefeVapidSignatur,
  WebPushKonfigurationsFehler,
} from '@/lib/web-push'
import { saveSubscription, sendPushNotification, MAX_ABOS_PRO_KONTO } from '@/lib/push'
import { POST as waitList } from '@/app/api/wait-list/route'
import { POST as pushSubscribe } from '@/app/api/push/subscribe/route'
import { POST as pushSend } from '@/app/api/push/send/route'
import { POST as consent } from '@/app/api/cookies/consent/route'
import { POST as favorites } from '@/app/api/favorites/route'
import { POST as accountDelete } from '@/app/api/account/delete/route'
import { GET as hardDelete } from '@/app/api/cron/hard-delete/route'

function db(): FakeSupabase {
  return state.db
}

/** Ein echter, syntaktisch gueltiger FCM-Endpunkt. */
const FCM = 'https://fcm.googleapis.com/fcm/send/cAbC-123_xyz'
const FCM_ZWEI = 'https://fcm.googleapis.com/fcm/send/zweites-geraet'

/** Schluesselmaterial eines Browsers — Form wie im echten Abonnement. */
function browserSchluessel() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    p256dh: ecdh.getPublicKey().toString('base64url'),
    auth: randomBytes(16).toString('base64url'),
    privat: ecdh.getPrivateKey(),
  }
}

function vapidPaar() {
  const ecdh = createECDH('prime256v1')
  ecdh.generateKeys()
  return {
    privateKey: ecdh.getPrivateKey().toString('base64url'),
    publicKey: ecdh.getPublicKey().toString('base64url'),
  }
}

beforeEach(() => {
  state.db = createDb()
  enableLiveSchema(state.db)
  state.session = sessionFor('customer')
  state.fetches = []
  state.fetchStatus = 201
  __resetRateLimits()

  // Die UNIQUE-Indizes, die live wirklich existieren. Erst mit ihnen ist ein
  // ON CONFLICT unterscheidbar von einem, der keinen Arbiter findet.
  state.db
    .addUniqueIndex('push_subscriptions', ['endpoint'])
    .addUniqueIndex('favorites', ['customer_id', 'salon_id'])
    .addUniqueIndex('favorites', ['customer_id', 'equipment_id'], { partiell: true })
    // wait_list hat live NUR einen Ausdrucks-Index auf
    // (email, COALESCE(city, '')). Ein Ausdrucks-Index ist hier gar nicht
    // registrierbar — genau das ist die Aussage.
    .requireArbiterIndex()
})

// ═══════════════════════════════════════════════════════════════════
// 1. Warteliste — der stille Totalausfall
// ═══════════════════════════════════════════════════════════════════
describe('Warteliste', () => {
  it('legt den Eintrag wirklich an — und meldet nicht nur ok', async () => {
    const res = await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', {
        email: 'Interessent@Example.DE',
        city: 'Köln',
      }),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ ok: true, created: true })

    const zeilen = db().rows('wait_list')
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0].email).toBe('interessent@example.de')
    expect(zeilen[0].city).toBe('Köln')
  })

  it('greift NIE auf die View `newsletter` zurueck', async () => {
    // Der alte Rueckfall schrieb dorthin — auf eine View, auf der ein
    // ON CONFLICT gar nicht moeglich ist, in einem try/catch, das
    // supabase-js nie ausloest.
    await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de', city: 'Bonn' }),
    )
    const tabellen = db().log.map(a => a.table)
    expect(tabellen).not.toContain('newsletter')
  })

  it('meldet einen Schreibfehler als 503 statt als Erfolg', async () => {
    db().failOn('wait_list', 'insert', {
      code: '42P10',
      message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
      details: null,
      hint: null,
    }, false)
    const res = await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de', city: 'Bonn' }),
    )
    expect(res.status).toBe(503)
    await expect(res.json()).resolves.not.toMatchObject({ ok: true })
    expect(db().rows('wait_list')).toHaveLength(0)
  })

  it('gibt die rohe DB-Meldung nicht heraus', async () => {
    db().failOn('wait_list', 'insert', {
      code: '42P10',
      message: 'there is no unique or exclusion constraint matching the ON CONFLICT specification',
      details: null,
      hint: null,
    }, false)
    const res = await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de' }),
    )
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain('ON CONFLICT')
    expect(text).not.toContain('42P10')
  })

  it('legt dieselbe Adresse nicht zweimal an', async () => {
    const anfrage = () =>
      waitList(
        postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de', city: 'Bonn' }),
      )
    await anfrage()
    const zweite = await anfrage()
    await expect(zweite.json()).resolves.toMatchObject({ ok: true, created: false })
    expect(db().rows('wait_list')).toHaveLength(1)
  })

  it('behandelt leere Stadt als „keine Stadt" (NULL, nicht Leerzeichenkette)', async () => {
    await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de', city: '   ' }),
    )
    expect(db().rows('wait_list')[0].city).toBeNull()
  })

  it('winkt bei einem Ausfall des Zaehlers nicht durch', async () => {
    db().failOn('wait_list', 'select', {
      code: '08006',
      message: 'connection failure',
      details: null,
      hint: null,
    }, false)
    const res = await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'a@b.de' }, {
        'x-forwarded-for': '203.0.113.9',
      }),
    )
    expect(res.status).toBe(503)
    expect(db().rows('wait_list')).toHaveLength(0)
  })

  it('deckelt bei fuenf Eintraegen je Stunde und IP', async () => {
    const kopf = { 'x-forwarded-for': '203.0.113.7' }
    for (let i = 0; i < 5; i++) {
      const res = await waitList(
        postRequest('https://www.chairmatch.de/api/wait-list', { email: `nr${i}@b.de` }, kopf),
      )
      expect(res.status).toBe(200)
    }
    const sechste = await waitList(
      postRequest('https://www.chairmatch.de/api/wait-list', { email: 'nr5@b.de' }, kopf),
    )
    expect(sechste.status).toBe(429)
    expect(db().rows('wait_list')).toHaveLength(5)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 2. Der Musterfehler selbst: ON CONFLICT ohne Arbiter
// ═══════════════════════════════════════════════════════════════════
describe('ON CONFLICT ohne passenden UNIQUE-Index', () => {
  it('42P10, wenn die Konfliktspalten zu keinem Index passen', async () => {
    // Genau die alte Zeile aus saveSubscription: der einzige UNIQUE-Index
    // steht auf `endpoint` allein.
    const { error } = await db()
      .from('push_subscriptions')
      .upsert(
        { user_id: IDS.customer, endpoint: FCM, p256dh: 'x', auth: 'y' },
        { onConflict: 'user_id,endpoint' },
      )
    expect(error?.code).toBe('42P10')
    expect(db().rows('push_subscriptions')).toHaveLength(0)
  })

  it('ein PARTIELLER Index ist kein Arbiter', async () => {
    const { error } = await db()
      .from('favorites')
      .upsert(
        { customer_id: IDS.customer, equipment_id: IDS.equipment },
        { onConflict: 'customer_id,equipment_id' },
      )
    expect(error?.code).toBe('42P10')
  })

  it('ein voller Index auf genau diesen Spalten ist einer', async () => {
    const { error } = await db()
      .from('favorites')
      .upsert(
        { customer_id: IDS.customer, salon_id: IDS.salon },
        { onConflict: 'customer_id,salon_id' },
      )
    expect(error).toBeNull()
  })
})

describe('Merkliste', () => {
  it('merkt ein Inserat, ohne einen Arbiter zu brauchen', async () => {
    const res = await favorites(
      postRequest('https://www.chairmatch.de/api/favorites', {
        equipmentId: IDS.equipment,
        action: 'add',
      }),
    )
    expect(res.status).toBe(200)
    expect(db().rows('favorites').filter(f => f.equipment_id === IDS.equipment)).toHaveLength(1)
  })

  it('zweimal merken bleibt ein Erfolg und legt nichts doppelt an', async () => {
    const anfrage = () =>
      favorites(
        postRequest('https://www.chairmatch.de/api/favorites', {
          equipmentId: IDS.equipment,
          action: 'add',
        }),
      )
    await anfrage()
    const zweite = await anfrage()
    expect(zweite.status).toBe(200)
    expect(db().rows('favorites').filter(f => f.equipment_id === IDS.equipment)).toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 3. Push-Endpunkt — der Riegel gegen die Anfrage ins eigene Netz
// ═══════════════════════════════════════════════════════════════════
describe('Push-Endpunkt', () => {
  const erlaubt = [
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://android.googleapis.com/gcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QABC',
    'https://wns2-by3p.notify.windows.com/w/?token=abc',
  ]
  it.each(erlaubt)('nimmt %s an', (url) => {
    expect(pruefePushEndpoint(url).ok).toBe(true)
  })

  const abgelehnt: [string, string][] = [
    ['Metadaten-Dienst des Hosters', 'http://169.254.169.254/latest/meta-data/'],
    ['eigener Server ueber Loopback', 'http://127.0.0.1:3000/api/admin/export'],
    ['internes Netz per IP', 'https://10.0.0.5/push'],
    ['fremder Host', 'https://angreifer.example.com/fcm/send/abc'],
    ['http statt https', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['Suffix-Trick', 'https://boesenotify.windows.com/w/?token=abc'],
    ['abweichender Port', 'https://fcm.googleapis.com:8080/fcm/send/abc'],
    ['Anmeldedaten in der URL', 'https://a:b@fcm.googleapis.com/fcm/send/abc'],
    ['keine URL', 'nicht mal eine url'],
  ]
  it.each(abgelehnt)('lehnt %s ab', (_name, url) => {
    expect(pruefePushEndpoint(url).ok).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 4. Push-Anmeldung
// ═══════════════════════════════════════════════════════════════════
describe('Push-Anmeldung', () => {
  it('legt die Zeile an — ohne die live fehlende Spalte updated_at', async () => {
    const k = browserSchluessel()
    const res = await pushSubscribe(
      postRequest('https://www.chairmatch.de/api/push/subscribe', {
        endpoint: FCM,
        p256dh: k.p256dh,
        auth: k.auth,
      }),
    )
    expect(res.status).toBe(200)
    const zeilen = db().rows('push_subscriptions')
    expect(zeilen).toHaveLength(1)
    expect(zeilen[0]).not.toHaveProperty('updated_at')
    expect(zeilen[0].user_id).toBe(IDS.customer)
  })

  it('weist einen Endpunkt ab, der zu keinem Push-Dienst gehoert', async () => {
    const k = browserSchluessel()
    const res = await pushSubscribe(
      postRequest('https://www.chairmatch.de/api/push/subscribe', {
        endpoint: 'http://169.254.169.254/latest/meta-data/',
        p256dh: k.p256dh,
        auth: k.auth,
      }),
    )
    expect(res.status).toBe(400)
    expect(db().rows('push_subscriptions')).toHaveLength(0)
  })

  it('haengt einen fremden Endpunkt nicht um', async () => {
    const k = browserSchluessel()
    db().rows('push_subscriptions').push(
      {
        id: 'fremd',
        user_id: IDS.otherCustomer,
        endpoint: FCM,
        p256dh: k.p256dh,
        auth: k.auth,
      },
    )
    const res = await pushSubscribe(
      postRequest('https://www.chairmatch.de/api/push/subscribe', {
        endpoint: FCM,
        p256dh: 'neu',
        auth: 'neu',
      }),
    )
    expect(res.status).toBe(409)
    const zeile = db().rows('push_subscriptions')[0]
    expect(zeile.user_id).toBe(IDS.otherCustomer)
    expect(zeile.p256dh).toBe(k.p256dh)
  })

  it('frischt das eigene Abo auf, statt es zu verdoppeln', async () => {
    const k = browserSchluessel()
    await saveSubscription(IDS.customer, { endpoint: FCM, p256dh: k.p256dh, auth: k.auth })
    const zweite = await saveSubscription(IDS.customer, {
      endpoint: FCM,
      p256dh: 'frisch',
      auth: 'frisch',
    })
    expect(zweite).toEqual({ ok: true, angelegt: false })
    expect(db().rows('push_subscriptions')).toHaveLength(1)
    expect(db().rows('push_subscriptions')[0].p256dh).toBe('frisch')
  })

  it('deckelt die Zahl der Geraete je Konto', async () => {
    for (let i = 0; i < MAX_ABOS_PRO_KONTO; i++) {
      db().rows('push_subscriptions').push({
        id: `abo-${i}`,
        user_id: IDS.customer,
        endpoint: `${FCM}-${i}`,
        p256dh: 'x',
        auth: 'y',
      })
    }
    const ergebnis = await saveSubscription(IDS.customer, {
      endpoint: FCM_ZWEI,
      p256dh: 'x',
      auth: 'y',
    })
    expect(ergebnis).toEqual({ ok: false, grund: 'limit' })
  })
})

// ═══════════════════════════════════════════════════════════════════
// 5. Verschluesselung und VAPID
// ═══════════════════════════════════════════════════════════════════
describe('Web Push — Nutzdaten', () => {
  // RFC 8291, Abschnitt 5. Die Werte stammen aus der Norm; geprueft wird,
  // dass unsere Ableitung mit ihnen dieselben oeffentlichen Bestandteile
  // erzeugt UND dass der private Schluessel der Norm den Chiffretext
  // aufmacht. Beides zusammen deckt die ganze Kette ab.
  const RFC = {
    klartext: 'When I grow up, I want to be a watermelon',
    p256dh:
      'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
    auth: 'BTBZMqHH6r4Tts7J_aSIgg',
    uaPrivat: 'q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94',
    asPrivat: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
    asPublic:
      'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
    salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  }

  it('erzeugt den Kopf aus RFC 8291 Bit fuer Bit', () => {
    const koerper = verschluesselePayload(
      RFC.klartext,
      { p256dh: RFC.p256dh, auth: RFC.auth },
      { salt: Buffer.from(RFC.salt, 'base64url'), privatSkalar: Buffer.from(RFC.asPrivat, 'base64url') },
    )
    expect(koerper.subarray(0, 16).toString('base64url')).toBe(RFC.salt)
    expect(koerper.readUInt32BE(16)).toBe(4096)
    expect(koerper.readUInt8(20)).toBe(65)
    expect(koerper.subarray(21, 86).toString('base64url')).toBe(RFC.asPublic)
  })

  it('der private Schluessel aus der Norm macht den Chiffretext auf', () => {
    const koerper = verschluesselePayload(
      RFC.klartext,
      { p256dh: RFC.p256dh, auth: RFC.auth },
      { salt: Buffer.from(RFC.salt, 'base64url'), privatSkalar: Buffer.from(RFC.asPrivat, 'base64url') },
    )
    expect(
      entschluesselePayloadFuerTest(
        koerper,
        Buffer.from(RFC.uaPrivat, 'base64url'),
        Buffer.from(RFC.auth, 'base64url'),
      ),
    ).toBe(RFC.klartext)
  })

  it('der Klartext steht NICHT im Koerper', () => {
    const k = browserSchluessel()
    const koerper = verschluesselePayload('{"title":"Termin bezahlt","body":"89,00 EUR"}', {
      p256dh: k.p256dh,
      auth: k.auth,
    })
    expect(koerper.toString('utf8')).not.toContain('Termin bezahlt')
    expect(koerper.toString('utf8')).not.toContain('89,00')
  })

  it('jeder Aufruf nimmt ein neues Salz', () => {
    const k = browserSchluessel()
    const a = verschluesselePayload('x', { p256dh: k.p256dh, auth: k.auth })
    const b = verschluesselePayload('x', { p256dh: k.p256dh, auth: k.auth })
    expect(a.subarray(0, 16).equals(b.subarray(0, 16))).toBe(false)
  })
})

describe('Web Push — VAPID', () => {
  it('signiert ES256 in der rohen Form r||s, nicht in DER', () => {
    const paar = vapidPaar()
    const kopf = baueVapidKopf(FCM, { ...paar, subject: 'mailto:info@chairmatch.de' }, 1_756_000_000)
    const jwt = /t=([^,]+)/.exec(kopf.Authorization)![1]
    const k = /k=(.+)$/.exec(kopf.Authorization)![1]

    // 64 Byte = r||s. Eine DER-Signatur waere 70–72 Byte und variabel lang —
    // genau das hat der alte Code erzeugt (createSign('SHA256')).
    expect(Buffer.from(jwt.split('.')[2], 'base64url')).toHaveLength(64)
    expect(pruefeVapidSignatur(jwt, k)).toBe(true)
    expect(k).toBe(paar.publicKey)
  })

  it('bindet das Token an den Origin des Endpunkts', () => {
    const paar = vapidPaar()
    const kopf = baueVapidKopf(
      'https://updates.push.services.mozilla.com/wpush/v2/abc',
      { ...paar, subject: 'mailto:info@chairmatch.de' },
      1_756_000_000,
    )
    const jwt = /t=([^,]+)/.exec(kopf.Authorization)![1]
    const nutz = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString())
    expect(nutz.aud).toBe('https://updates.push.services.mozilla.com')
    expect(nutz.exp).toBe(1_756_000_000 + 12 * 60 * 60)
  })

  it('wirft, wenn der oeffentliche Schluessel nicht zum privaten passt', () => {
    const a = vapidPaar()
    const b = vapidPaar()
    expect(() =>
      baueVapidKopf(FCM, { privateKey: a.privateKey, publicKey: b.publicKey, subject: 'mailto:x@y.de' }, 1),
    ).toThrow(WebPushKonfigurationsFehler)
  })

  it('wirft bei fehlendem privaten Schluessel, statt etwas zu senden', () => {
    expect(() => baueVapidKopf(FCM, { privateKey: '', subject: 'mailto:x@y.de' }, 1)).toThrow(
      WebPushKonfigurationsFehler,
    )
  })
})

// ═══════════════════════════════════════════════════════════════════
// 6. Senden
// ═══════════════════════════════════════════════════════════════════
describe('Push senden', () => {
  it('ruft einen unerlaubten Endpunkt gar nicht erst ab', async () => {
    const abruf = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal('fetch', abruf)
    db().rows('push_subscriptions').push(
      {
        id: 'boese',
        user_id: IDS.customer,
        endpoint: 'http://169.254.169.254/latest/meta-data/',
        p256dh: 'x',
        auth: 'y',
      },
    )

    const ergebnis = await sendPushNotification(IDS.customer, 'Titel', 'Text')
    expect(abruf).not.toHaveBeenCalled()
    expect(ergebnis).toMatchObject({ sent: 0, skipped: 1 })
    vi.unstubAllGlobals()
  })

  it('meldet dem Admin keinen Erfolg, wenn nichts zugestellt wurde', async () => {
    state.session = sessionFor('admin')
    const res = await pushSend(
      postRequest('https://www.chairmatch.de/api/push/send', {
        userId: IDS.customer,
        title: 'Titel',
        body: 'Text',
      }),
    )
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ success: false, sent: 0 })
  })

  it('bleibt fuer Nicht-Admins gesperrt', async () => {
    state.session = sessionFor('customer')
    const res = await pushSend(
      postRequest('https://www.chairmatch.de/api/push/send', {
        userId: IDS.customer,
        title: 'Titel',
        body: 'Text',
      }),
    )
    expect(res.status).toBe(403)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 7. Cookie-Einwilligung
// ═══════════════════════════════════════════════════════════════════
describe('Cookie-Einwilligung', () => {
  it('haelt den Zuordnungsnachweis fest — als HMAC, nicht als IP', async () => {
    const res = await consent(
      postRequest(
        'https://www.chairmatch.de/api/cookies/consent',
        { sessionId: 'sitzung-1', choices: { statistics: true, marketing: false } },
        { 'x-forwarded-for': '203.0.113.5' },
      ),
    )
    expect(res.status).toBe(200)
    const zeile = db().rows('cookie_consents')[0]
    expect(zeile.ip_hash).toBeTruthy()
    expect(String(zeile.ip_hash)).not.toContain('203.0.113.5')
    expect(zeile.choices).toEqual({ necessary: true, statistics: true, marketing: false })
  })

  it('gibt die rohe DB-Meldung nicht heraus', async () => {
    db().failOn('cookie_consents', 'insert', {
      code: '42501',
      message: 'permission denied for table cookie_consents',
      details: null,
      hint: null,
    }, false)
    const res = await consent(
      postRequest('https://www.chairmatch.de/api/cookies/consent', {
        sessionId: 'sitzung-1',
        choices: {},
      }),
    )
    expect(res.status).toBe(500)
    const text = JSON.stringify(await res.json())
    expect(text).not.toContain('permission denied')
  })

  it('hat einen eigenen Deckel', async () => {
    const kopf = { 'x-forwarded-for': '203.0.113.6' }
    for (let i = 0; i < 20; i++) {
      const res = await consent(
        postRequest(
          'https://www.chairmatch.de/api/cookies/consent',
          { sessionId: `s-${i}`, choices: {} },
          kopf,
        ),
      )
      expect(res.status).toBe(200)
    }
    const zuviel = await consent(
      postRequest(
        'https://www.chairmatch.de/api/cookies/consent',
        { sessionId: 's-21', choices: {} },
        kopf,
      ),
    )
    expect(zuviel.status).toBe(429)
  })
})

// ═══════════════════════════════════════════════════════════════════
// 8. DSGVO — die Loeschung erreicht die Zustellwege
// ═══════════════════════════════════════════════════════════════════
describe('Konto-Loeschung', () => {
  beforeEach(() => {
    db().rows('push_subscriptions').push(
      { id: 'abo-1', user_id: IDS.customer, endpoint: FCM, p256dh: 'x', auth: 'y' },
      { id: 'abo-fremd', user_id: IDS.otherCustomer, endpoint: FCM_ZWEI, p256dh: 'x', auth: 'y' },
    )
    db().rows('wait_list').push(
      { id: 'w-1', email: 'kundin@example.de', city: 'Köln', source: 'search', ip: null },
      { id: 'w-2', email: 'jemand@example.de', city: 'Köln', source: 'search', ip: null },
    )
    db().rows('notification_log').push(
      {
        id: 'n-1',
        user_id: IDS.customer,
        title: 'Bestellung bezahlt',
        body: 'Deine Bestellung CM-1042 ist bezahlt (89,00 EUR).',
        type: 'payment',
        is_read: false,
      },
      { id: 'n-2', user_id: IDS.otherCustomer, title: 'Fremd', body: '', type: 'info', is_read: false },
    )
  })

  it('schliesst beim Antrag die Zustellwege — Push und Warteliste', async () => {
    const res = await accountDelete(
      postRequest('https://www.chairmatch.de/api/account/delete', {
        confirmEmail: 'kundin@example.de',
      }),
    )
    expect(res.status).toBe(200)

    expect(db().rows('push_subscriptions').map(r => r.id)).toEqual(['abo-fremd'])
    expect(db().rows('wait_list').map(r => r.id)).toEqual(['w-2'])
  })

  it('raeumt beim endgueltigen Loeschen das Postfach', async () => {
    db().rows('profiles')[0].delete_requested_at = '2026-07-01T00:00:00.000Z'
    db().rows('profiles')[0].deleted_at = null

    const res = await hardDelete(
      new Request('https://www.chairmatch.de/api/cron/hard-delete', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }) as never,
    )
    expect(res.status).toBe(200)

    // Die Kaskade ueber profiles feuert nie: das Profil wird anonymisiert,
    // nicht geloescht. Ohne diesen Schritt bliebe „CM-1042 … 89,00 EUR" stehen.
    expect(db().rows('notification_log').map(r => r.id)).toEqual(['n-2'])
    expect(db().rows('push_subscriptions').map(r => r.id)).toEqual(['abo-fremd'])
  })
})
