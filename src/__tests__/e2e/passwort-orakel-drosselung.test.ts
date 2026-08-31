// @vitest-environment node
/**
 * E2E: Drosselung von POST /api/auth/change-password.
 *
 * DER BEFUND
 *
 * `/api/auth/change-password` ist das einzige Passwort-Orakel der Plattform.
 * Im freiwilligen Modus prueft es `currentPassword` per
 * `signInWithPassword` und antwortet unterscheidbar: 403 „Aktuelles Passwort
 * ist falsch" gegen alles andere. Gezaehlt wurde dabei nichts — der Endpunkt
 * war der einzige credential-nahe der Anwendung ohne eigenes Limit
 * (register: 5/h, forgot-password: 3/15min + 3/h je Adresse, 2fa-verify:
 * 5/5min, 2fa-status: 10/min, session-revoke: 5/15min).
 *
 * Warum das zaehlt: wer ein Sitzungscookie erbeutet hat — der Fall, fuer den
 * es den Sitzungswiderruf in genau dieser Route ueberhaupt gibt — konnte
 * damit das echte Passwort erraten, beliebig oft. Das Passwort ist die
 * Beute, die das Cookie nicht hergibt: es ueberlebt den Widerruf und wird
 * anderswo wiederverwendet.
 *
 * Der Riegel in `middleware.ts` (10/min fuer /api/auth/*) zaehlt
 * ausschliesslich pro IP. Angegriffen wird aber ein bestimmtes KONTO, und
 * ein Angreifer mit wechselnden Adressen laeuft an einem IP-Zaehler vorbei.
 * Deshalb haengt der neue Zaehler am Konto — und ein zweiter, grober, an der
 * IP.
 *
 * WAS HIER GEPRUEFT WIRD
 *
 * Nicht nur „irgendwann kommt 429". Die drei Eigenschaften, an denen sich
 * entscheidet, ob die Drosselung den Angriff trifft und den Nutzer nicht:
 *
 *   - Sie zaehlt pro Konto, nicht pro IP: ein IP-Wechsel hilft nicht,
 *     und ein fremdes Konto wird von meinen Fehlversuchen nicht gesperrt.
 *   - Sie zaehlt Rateversuche, nicht Aufrufe: ein Formularfehler ohne
 *     `currentPassword` und ein Aufruf ohne Session duerfen das Konto nicht
 *     aussperren — sonst sperrt ein Angreifer jedes Konto, ohne ein einziges
 *     Passwort zu raten.
 *   - Der erzwungene Wechsel prueft kein altes Passwort und ist deshalb kein
 *     Orakel; er faellt nicht unter das Konto-Limit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, postRequest, rawRequest, IDS, type TestSession } from './_harness/fixtures'
import { __resetRateLimits } from '@/lib/rate-limit'

const PASSWORT = 'Sicher!2026'
const NEUES_PASSWORT = 'NeuSicher!2026'
const FALSCHES_PASSWORT = 'GeratenFalsch!2026'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    session: null as TestSession | null,
    /** Jeder Aufruf von signInWithPassword — der Beleg, ob wirklich geraten wurde. */
    passwortversuche: [] as { email: string; password: string }[],
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/session', () => ({
  getServerSession: async () => state.session,
  requireAuth: async () => state.session,
  invalidateAccountState: () => {},
  SESSION_REVOKED_ACTION: 'SESSION_REVOKED',
}))

// Der Anon-Client ist die Pruefstelle des alten Passworts. Nur das exakte
// Passwort geht durch — genau die Unterscheidbarkeit, die den Endpunkt zum
// Orakel macht.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        state.passwortversuche.push({ email, password })
        return password === PASSWORT
          ? { data: { user: { id: IDS.customer } }, error: null }
          : { data: { user: null }, error: { message: 'Invalid login credentials' } }
      },
    },
  }),
}))

import { POST as _changePasswordRoute } from '@/app/api/auth/change-password/route'

// `withApi` liefert `(req, ctx) => Promise<Response>`; der Kontext ist hier
// leer. Gleiche Klammer wie in auth-haertung.test.ts.
const changePasswordRoute = (req: import('next/server').NextRequest) =>
  _changePasswordRoute(req, undefined as never)

/** Session ohne Zwang — der Modus, in dem das alte Passwort geprueft wird. */
function freiwillig(userId: string, email: string): TestSession {
  return { user: { id: userId, email, name: 'Testperson', role: 'kunde' } }
}

/**
 * Ein Rateversuch. `ip` landet in x-forwarded-for — ohne den Header liest
 * `clientIp()` 'unknown', und dann teilen sich alle Faelle einen IP-Zaehler.
 */
function versuch(body: Record<string, unknown>, ip = '203.0.113.10') {
  return changePasswordRoute(
    postRequest('http://localhost/api/auth/change-password', body, { 'x-forwarded-for': ip }),
  )
}

beforeEach(() => {
  __resetRateLimits()
  state.db = createDb()
  state.session = null
  state.passwortversuche = []
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
describe('Das Konto-Limit greift', () => {
  it('laesst fuenf Fehlversuche zu und beantwortet den sechsten mit 429', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')

    for (let i = 0; i < 5; i++) {
      const res = await versuch({
        newPassword: NEUES_PASSWORT,
        currentPassword: FALSCHES_PASSWORT,
      })
      expect(res.status).toBe(403)
    }

    const sechster = await versuch({
      newPassword: NEUES_PASSWORT,
      currentPassword: FALSCHES_PASSWORT,
    })
    expect(sechster.status).toBe(429)
  })

  it('fragt beim gedrosselten Versuch gar nicht mehr nach dem Passwort', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')

    for (let i = 0; i < 5; i++) {
      await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })
    }
    const vorher = state.passwortversuche.length
    expect(vorher).toBe(5)

    await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })

    // Kein sechster Aufruf gegen Supabase-Auth: die Drosselung sitzt VOR der
    // Pruefung. Sonst waere sie nur eine andere Antwort auf dieselbe Frage —
    // und die Antwort selbst ist das Orakel.
    expect(state.passwortversuche.length).toBe(vorher)
  })

  it('nennt im 429 eine Wartezeit statt den Aufrufer raten zu lassen', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    for (let i = 0; i < 5; i++) {
      await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })
    }

    const res = await versuch({
      newPassword: NEUES_PASSWORT,
      currentPassword: FALSCHES_PASSWORT,
    })
    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    expect((await res.json()).error).toMatch(/[Vv]ersuche/)
  })

  it('sperrt auch das richtige Passwort aus, solange die Drosselung laeuft', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    for (let i = 0; i < 5; i++) {
      await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })
    }

    // Ein Limit, das der richtige Wert aushebelt, ist keines: der Angreifer
    // haette mit dem erratenen Passwort sofort wieder freie Bahn.
    const res = await versuch({ newPassword: NEUES_PASSWORT, currentPassword: PASSWORT })
    expect(res.status).toBe(429)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Gezaehlt wird am Konto, nicht an der IP', () => {
  it('haelt den Angreifer auch nach einem IP-Wechsel fest', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')

    for (let i = 0; i < 5; i++) {
      const res = await versuch(
        { newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT },
        `198.51.100.${i}`,
      )
      expect(res.status).toBe(403)
    }

    // Frische IP, dasselbe Konto — genau der Fall, an dem der Riegel in
    // middleware.ts vorbeilaeuft.
    const res = await versuch(
      { newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT },
      '198.51.100.200',
    )
    expect(res.status).toBe(429)
  })

  it('sperrt ein fremdes Konto nicht mit, das nur dieselbe IP teilt', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    for (let i = 0; i < 5; i++) {
      await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })
    }
    expect(
      (await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })).status,
    ).toBe(429)

    // Zweites Konto, gleiche IP. Hinter einem Firmen-NAT oder einem
    // Mobilfunk-Gateway sitzen sonst alle im selben Zaehler.
    state.session = freiwillig(IDS.otherCustomer, 'zweite@example.de')
    const fremd = await versuch({
      newPassword: NEUES_PASSWORT,
      currentPassword: FALSCHES_PASSWORT,
    })
    expect(fremd.status).toBe(403)
  })

  it('drosselt ueber die IP, wenn ein Angreifer die Konten durchwechselt', async () => {
    // Pro Konto bleibt er unter fuenf, der IP-Zaehler (10) summiert trotzdem.
    for (let i = 0; i < 10; i++) {
      state.session = freiwillig(
        i % 2 === 0 ? IDS.customer : IDS.otherCustomer,
        i % 2 === 0 ? 'kundin@example.de' : 'zweite@example.de',
      )
      await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })
    }

    state.session = freiwillig(IDS.admin, 'admin@example.de')
    const res = await versuch({
      newPassword: NEUES_PASSWORT,
      currentPassword: FALSCHES_PASSWORT,
    })
    expect(res.status).toBe(429)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Der Zaehler zaehlt Rateversuche, keine Aufrufe', () => {
  it('sperrt das Konto nicht ueber Aufrufe ganz ohne currentPassword', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')

    // Sechs Formularfehler. Wuerden sie zaehlen, koennte jeder, der ein
    // Konto kennt, es aussperren, ohne ein einziges Passwort zu raten —
    // die Drosselung waere selbst der Angriff.
    for (let i = 0; i < 6; i++) {
      const res = await versuch({ newPassword: NEUES_PASSWORT })
      expect(res.status).toBe(400)
    }

    const echt = await versuch({ newPassword: NEUES_PASSWORT, currentPassword: PASSWORT })
    expect(echt.status).not.toBe(429)
  })

  it('sperrt das Konto nicht ueber Aufrufe ohne Session', async () => {
    state.session = null
    for (let i = 0; i < 6; i++) {
      const res = await versuch({
        newPassword: NEUES_PASSWORT,
        currentPassword: FALSCHES_PASSWORT,
      })
      expect(res.status).toBe(401)
    }

    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    const echt = await versuch({ newPassword: NEUES_PASSWORT, currentPassword: PASSWORT })
    expect(echt.status).not.toBe(429)
  })

  it('laesst den erzwungenen Wechsel unangetastet — er raet nichts', async () => {
    // passwordMustChange prueft kein altes Passwort. Wer hier gedrosselt
    // wuerde, saesse in einer Sackgasse: anmelden geht nur ueber den Wechsel,
    // und der Wechsel waere gesperrt.
    const zwang: TestSession = {
      user: {
        id: IDS.customer,
        email: 'kundin@example.de',
        name: 'Testperson',
        role: 'kunde',
      },
    }
    ;(zwang.user as { passwordMustChange?: boolean }).passwordMustChange = true
    state.session = zwang

    for (let i = 0; i < 6; i++) {
      const res = await versuch({ newPassword: NEUES_PASSWORT })
      expect(res.status).not.toBe(429)
    }
    // Und geraten wurde dabei nie.
    expect(state.passwortversuche).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Der normale Weg bleibt offen', () => {
  it('laesst die Aenderung nach vier Fehlversuchen noch zu', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')

    for (let i = 0; i < 4; i++) {
      expect(
        (await versuch({ newPassword: NEUES_PASSWORT, currentPassword: FALSCHES_PASSWORT })).status,
      ).toBe(403)
    }

    // Vertippen ist kein Angriff. Wer beim fuenften Anlauf richtig liegt,
    // aendert sein Passwort.
    const res = await versuch({ newPassword: NEUES_PASSWORT, currentPassword: PASSWORT })
    expect(res.status).toBe(200)
  })

  it('drosselt einen Aufruf mit dem richtigen Passwort nicht schon beim ersten Mal', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    const res = await versuch({ newPassword: NEUES_PASSWORT, currentPassword: PASSWORT })
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
  })

  it('meldet ein zu kurzes Passwort weiter als 400, nicht als 429', async () => {
    state.session = freiwillig(IDS.customer, 'kundin@example.de')
    const res = await changePasswordRoute(
      rawRequest('http://localhost/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
        body: JSON.stringify({ newPassword: 'kurz', currentPassword: PASSWORT }),
      }),
    )
    expect(res.status).toBe(400)
  })
})
