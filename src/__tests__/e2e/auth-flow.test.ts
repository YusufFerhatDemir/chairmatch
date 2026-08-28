// @vitest-environment node
/**
 * E2E: Auth-Flow — Registrierung, Login, Session-Härtung, Passwort-Reset.
 *
 * Der Login läuft über `authorizeCredentials()` aus auth.config.ts. NextAuth
 * gibt den Provider nicht wieder heraus, deshalb ist die Funktion dort
 * separat exportiert — getestet wird exakt der Code, den NextAuth aufruft.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, postRequest, brokenJsonRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase, Row } from './_harness/fake-supabase'
import { __resetRateLimits } from '@/lib/rate-limit'
import { hashIp } from '@/lib/ip-hash'

/**
 * Der Schluessel, unter dem ein Anmeldeversuch protokolliert wird.
 *
 * Seit Track 19 steht in `login_attempts.ip` nicht mehr die Adresse selbst,
 * sondern ihr HMAC — die Spalte ist gleichzeitig Protokoll und Zaehlschluessel
 * des Fehlversuchslimits, und als Protokoll lag dort bis dahin die IP jedes
 * Anmeldeversuchs im Klartext. Der Wert ist deterministisch, das Limit zaehlt
 * also unveraendert; die Tests seeden deshalb denselben abgeleiteten Wert.
 */
const ipKey = (ip: string) => hashIp(ip) ?? ip
// auth.config.ts nutzt die Web-Crypto-Fassung (Edge-Bundle, siehe
// src/lib/ip-hash-web.ts); beide liefern denselben Wert — festgehalten in
// src/lib/__tests__/ip-hash.test.ts.

const NEW_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    anon: undefined as unknown as {
      auth: {
        signUp: ReturnType<typeof vi.fn>
        signInWithPassword: ReturnType<typeof vi.fn>
        resetPasswordForEmail: ReturnType<typeof vi.fn>
      }
    },
    clientIp: '203.0.113.7',
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => state.anon }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': state.clientIp }),
}))

import { POST as registerRoute } from '@/app/api/auth/register/route'
import { POST as forgotPasswordRoute } from '@/app/api/auth/forgot-password/route'
import { authorizeCredentials, authOptions } from '@/modules/auth/auth.config'

const PASSWORT = 'Sicher!2026'

function db(): FakeSupabase {
  return state.db
}

function createAnonClient() {
  return {
    auth: {
      signUp: vi.fn(async (args: { email: string }) => ({
        data: { user: { id: NEW_USER, email: args.email, user_metadata: {} } },
        error: null,
      })),
      signInWithPassword: vi.fn(async (args: { email: string; password: string }) => {
        const profile = db()
          .rows('profiles')
          .find(p => p.email === args.email)
        if (!profile || args.password !== PASSWORT) {
          return { data: { user: null }, error: { message: 'Invalid login credentials' } }
        }
        return {
          data: {
            user: {
              id: profile.id,
              email: profile.email,
              user_metadata: { full_name: profile.full_name, role: profile.role },
            },
          },
          error: null,
        }
      }),
      resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    },
  }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T09:00:00.000Z'))
  state.db = createDb()
  state.anon = createAnonClient()
  state.clientIp = '203.0.113.7'
  // Die Zaehler in @/lib/rate-limit sind modul-global. Ohne Reset zieht der
  // erste Testfall die Grenze fuer alle folgenden mit.
  __resetRateLimits()
})

afterEach(() => {
  vi.useRealTimers()
})

// ────────────────────────────────────────────────────────────────
describe('Registrierung (POST /api/auth/register)', () => {
  const validBody = {
    email: 'neu@example.de',
    password: PASSWORT,
    fullName: 'Neue Nutzerin',
    agbAccepted: true,
    datenschutzAccepted: true,
    marketingAccepted: false,
  }

  it('legt das Konto an, bestätigt die E-Mail und ergänzt das Profil', async () => {
    db().rows('profiles').push({ id: NEW_USER, email: null, full_name: null, role: 'kunde' })

    const res = await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody),
    )
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)

    expect(state.anon.auth.signUp).toHaveBeenCalledWith({
      email: 'neu@example.de',
      password: PASSWORT,
      options: { data: { full_name: 'Neue Nutzerin' } },
    })
    expect(
      db().log.some(c => c.table === 'auth.users' && c.op === 'update'),
    ).toBe(true)
    expect(db().row('profiles', NEW_USER)).toMatchObject({
      full_name: 'Neue Nutzerin',
      email: 'neu@example.de',
    })
  })

  it('protokolliert AGB- und Datenschutz-Einwilligung, Marketing nur wenn gewählt', async () => {
    await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody),
    )
    const types = db()
      .rows('consent_logs')
      .map(c => c.type)
      .sort()
    expect(types).toEqual(['agb', 'datenschutz'])

    state.db = createDb()
    await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', {
        ...validBody,
        marketingAccepted: true,
      }),
    )
    expect(
      db()
        .rows('consent_logs')
        .map(c => c.type)
        .sort(),
    ).toEqual(['agb', 'datenschutz', 'marketing'])
  })

  /**
   * Dieser Test war bis Track 12 gruen, waehrend die Spalte `ip_hash` die
   * IP im Klartext trug — nur base64-kodiert:
   *
   *     Buffer.from('198.51.100.23').toString('base64')
   *       === 'MTk4LjUxLjEwMC4yMw=='
   *
   * `not.toContain('198.51.100.23')` trifft darauf nicht zu, obwohl der Wert
   * in einer Zeile zurueckzurechnen ist. Der Test prueft jetzt die
   * Eigenschaft, um die es geht: dass sich der Wert NICHT zurueckrechnen
   * laesst.
   */
  it('speichert die IP-Adresse nur unumkehrbar gehasht (DSGVO)', async () => {
    await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody, {
        'x-forwarded-for': '198.51.100.23, 10.0.0.1',
      }),
    )
    const consent = db().rows('consent_logs')[0]
    const gespeichert = String(consent.ip_hash)

    expect(consent.ip_hash).toBeTruthy()
    expect(gespeichert).not.toContain('198.51.100.23')
    expect(JSON.stringify(db().rows('consent_logs'))).not.toContain('198.51.100.23')

    // Kein Rueckweg: weder base64 noch hex noch URL-Kodierung ergeben die IP.
    for (const kodierung of ['base64', 'base64url', 'hex'] as const) {
      let entschluesselt = ''
      try {
        entschluesselt = Buffer.from(gespeichert, kodierung).toString('utf8')
      } catch {
        /* nicht dekodierbar ist genau das gewuenschte Ergebnis */
      }
      expect(entschluesselt).not.toContain('198.51.100.23')
    }
    expect(decodeURIComponent(gespeichert)).not.toContain('198.51.100.23')

    // Form eines SHA-256-HMAC: 64 Hex-Zeichen. Eine Kodierung des Klartexts
    // waere kuerzer und enthielte Zeichen ausserhalb von [0-9a-f].
    expect(gespeichert).toMatch(/^[0-9a-f]{64}$/)

    // Deterministisch: derselbe Aufrufer ergibt denselben Wert, sonst waere
    // das Protokoll fuer Missbrauchsanalysen wertlos.
    state.db = createDb()
    await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody, {
        'x-forwarded-for': '198.51.100.23, 10.0.0.1',
      }),
    )
    expect(String(db().rows('consent_logs')[0].ip_hash)).toBe(gespeichert)

    // Eine andere IP ergibt einen anderen Wert.
    state.db = createDb()
    await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody, {
        'x-forwarded-for': '203.0.113.7',
      }),
    )
    expect(String(db().rows('consent_logs')[0].ip_hash)).not.toBe(gespeichert)
  })

  it.each([
    ['Passwort zu kurz', { ...validBody, password: 'kurz' }],
    ['E-Mail ungültig', { ...validBody, email: 'keine-mail' }],
    ['Name zu kurz', { ...validBody, fullName: 'A' }],
    ['AGB nicht akzeptiert', { ...validBody, agbAccepted: false }],
    ['Datenschutz nicht akzeptiert', { ...validBody, datenschutzAccepted: false }],
  ])('weist ungültige Registrierung ab: %s', async (_label, body) => {
    const res = await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', body),
    )
    expect(res.status).toBe(400)
    expect(state.anon.auth.signUp).not.toHaveBeenCalled()
    expect(db().rows('consent_logs')).toHaveLength(0)
  })

  it('gibt den Supabase-Fehler weiter, wenn die E-Mail schon vergeben ist', async () => {
    state.anon.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already registered' },
    })
    const res = await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('User already registered')
  })

  it('übersetzt einen Datenbank-/Trigger-Fehler in einen verständlichen Hinweis', async () => {
    state.anon.auth.signUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Database error saving new user' },
    })
    const res = await registerRoute(
      postRequest('https://www.chairmatch.de/api/auth/register', validBody),
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/Registrierung fehlgeschlagen/)
  })

  it('antwortet 500 bei kaputtem JSON-Body', async () => {
    const res = await registerRoute(
      brokenJsonRequest('https://www.chairmatch.de/api/auth/register'),
    )
    expect(res.status).toBe(500)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Login (authorizeCredentials)', () => {
  it('meldet eine Kundin mit ihrer Profil-Rolle an', async () => {
    const user = await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT })
    expect(user).toMatchObject({
      id: IDS.customer,
      email: 'kundin@example.de',
      role: 'kunde',
    })
  })

  it('übernimmt die Anbieter-Rolle aus dem Profil', async () => {
    const user = await authorizeCredentials({ email: 'inhaber@example.de', password: PASSWORT })
    expect((user as { role: string }).role).toBe('anbieter')
  })

  it('protokolliert erfolgreiche und fehlgeschlagene Versuche', async () => {
    await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT })
    await authorizeCredentials({ email: 'kundin@example.de', password: 'falsch' })

    const attempts = db().rows('login_attempts') as Row[]
    expect(attempts).toHaveLength(2)
    expect(attempts[0]).toMatchObject({ ip: ipKey('203.0.113.7'), success: true })
    expect(attempts[1]).toMatchObject({ ip: ipKey('203.0.113.7'), success: false })
    // Die Adresse selbst darf in der Zeile nirgends stehen.
    expect(JSON.stringify(attempts)).not.toContain('203.0.113.7')
  })

  it('lehnt falsche Passwörter ab', async () => {
    expect(await authorizeCredentials({ email: 'kundin@example.de', password: 'falsch' })).toBeNull()
  })

  it('lehnt deaktivierte Konten ab', async () => {
    db().row('profiles', IDS.customer)!.is_active = false
    expect(await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT })).toBeNull()
  })

  it.each([
    ['leere Eingabe', {}],
    ['E-Mail ohne @', { email: 'kundin', password: PASSWORT }],
    ['leeres Passwort', { email: 'kundin@example.de', password: '' }],
  ])('validiert die Eingabe vor jedem Supabase-Aufruf: %s', async (_label, creds) => {
    expect(await authorizeCredentials(creds)).toBeNull()
    expect(state.anon.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  /**
   * Bis Track 13 stand hier das Gegenteil: der Test erwartete
   * `role: 'anbieter'` — also die Rolle aus `user_metadata` — und schrieb
   * damit eine Rechteausweitung fest. `user_metadata` gehoert dem Konto
   * selbst und ist mit dem oeffentlichen Anon-Key schreibbar. Die
   * Angriffsfaelle stehen in src/__tests__/e2e/rollen-eskalation.test.ts.
   */
  it('legt ein fehlendes Profil mit der Rolle kunde an — NICHT mit der aus den Metadaten', async () => {
    state.anon.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        user: {
          id: NEW_USER,
          email: 'neu@example.de',
          user_metadata: { full_name: 'Neue Nutzerin', role: 'anbieter' },
        },
      },
      error: null,
    })
    const user = await authorizeCredentials({ email: 'neu@example.de', password: PASSWORT })
    expect(user).toMatchObject({ id: NEW_USER, name: 'Neue Nutzerin', role: 'kunde' })
    expect(db().row('profiles', NEW_USER)).toMatchObject({ role: 'kunde' })
  })

  it('blockiert nach 10 Fehlversuchen aus derselben IP — auch bei korrektem Passwort', async () => {
    for (let i = 0; i < 10; i++) {
      db().rows('login_attempts').push({
        id: `att-${i}`,
        ip: ipKey('203.0.113.7'),
        email: 'kundin@example.de',
        success: false,
        created_at: '2026-09-01T08:59:00.000Z',
      })
    }
    const user = await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT })
    expect(user).toBeNull()
    expect(state.anon.auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('zählt nur Fehlversuche der eigenen IP', async () => {
    for (let i = 0; i < 20; i++) {
      db().rows('login_attempts').push({
        id: `fremd-${i}`,
        ip: ipKey('198.51.100.99'),
        email: 'kundin@example.de',
        success: false,
        created_at: '2026-09-01T08:59:00.000Z',
      })
    }
    expect(
      await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT }),
    ).not.toBeNull()
  })

  it('zählt alte Fehlversuche außerhalb des 15-Minuten-Fensters nicht mit', async () => {
    for (let i = 0; i < 15; i++) {
      db().rows('login_attempts').push({
        id: `alt-${i}`,
        ip: ipKey('203.0.113.7'),
        email: 'kundin@example.de',
        success: false,
        created_at: '2026-09-01T08:00:00.000Z', // 69 Minuten alt
      })
    }
    expect(
      await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT }),
    ).not.toBeNull()
  })

  it('Demo-Zugänge funktionieren außerhalb der Entwicklungsumgebung NICHT', async () => {
    expect(process.env.NODE_ENV).not.toBe('development')
    const user = await authorizeCredentials({
      email: 'admin@chairmatch.de',
      password: 'Cm!Admin#2026xQ',
    })
    expect(user).toBeNull()
  })
})

// ────────────────────────────────────────────────────────────────
/**
 * NextAuth typisiert die Callback-Argumente sehr eng (AdapterUser & Co.).
 * Die Callbacks lesen aber nur `user.id`/`user.role` bzw. `token.id`/`token.role`
 * — die Wrapper reichen genau das durch, ohne den Test mit Dummy-Feldern
 * eines Adapters zu fluten.
 */
async function jwtCallback(args: {
  token: Record<string, unknown>
  user: { id: string; role?: string }
}): Promise<Record<string, unknown> & { role?: string }> {
  const cb = authOptions.callbacks.jwt as unknown as (
    a: unknown,
  ) => Promise<Record<string, unknown> & { role?: string }>
  return cb(args)
}

async function sessionCallback(args: {
  session: { user: Record<string, unknown> }
  token: Record<string, unknown>
}): Promise<{ user: Record<string, unknown> }> {
  const cb = authOptions.callbacks.session as unknown as (
    a: unknown,
  ) => Promise<{ user: Record<string, unknown> }>
  return cb(args)
}

describe('Session- und Cookie-Härtung (authOptions)', () => {
  it('nutzt JWT-Sessions mit synchroner Laufzeit', () => {
    expect(authOptions.session.strategy).toBe('jwt')
    expect(authOptions.jwt.maxAge).toBe(authOptions.session.maxAge)
  })

  it('setzt das Session-Cookie httpOnly und sameSite=lax', () => {
    const cookie = authOptions.cookies.sessionToken.options
    expect(cookie.httpOnly).toBe(true)
    expect(cookie.sameSite).toBe('lax')
    expect(cookie.path).toBe('/')
  })

  it('verweist beim Logout/Anmelde-Redirect auf /auth', () => {
    expect(authOptions.pages.signIn).toBe('/auth')
  })

  it('schreibt Rolle und ID in Token und Session', async () => {
    const token = await jwtCallback({ token: {}, user: { id: IDS.owner, role: 'anbieter' } })
    expect(token).toMatchObject({ id: IDS.owner, role: 'anbieter' })

    const session = await sessionCallback({
      session: { user: {} },
      token: { id: IDS.owner, role: 'anbieter' },
    })
    expect(session.user).toMatchObject({ id: IDS.owner, role: 'anbieter' })
  })

  it('setzt für Nutzer ohne Rolle den kleinsten Rechteumfang (kunde)', async () => {
    const token = await jwtCallback({ token: {}, user: { id: NEW_USER } })
    expect(token.role).toBe('kunde')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Passwort zurücksetzen (POST /api/auth/forgot-password)', () => {
  it('fordert den Reset-Link mit normalisierter E-Mail an', async () => {
    const res = await forgotPasswordRoute(
      postRequest('https://www.chairmatch.de/api/auth/forgot-password', {
        email: '  Kundin@Example.DE  ',
      }),
    )
    expect(res.status).toBe(200)
    expect(state.anon.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'kundin@example.de',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') }),
    )
  })

  it('verrät nicht, ob zu der Adresse ein Konto existiert', async () => {
    const res = await forgotPasswordRoute(
      postRequest('https://www.chairmatch.de/api/auth/forgot-password', {
        email: 'gibtesnicht@example.de',
      }),
    )
    const json = (await res.json()) as { ok: boolean; message: string }
    expect(json.ok).toBe(true)
    expect(json.message).toMatch(/Falls ein Konto existiert/)
  })

  it.each([
    ['fehlende E-Mail', {}],
    ['E-Mail als Zahl', { email: 42 }],
  ])('weist ungültige Anfragen ab: %s', async (_label, body) => {
    const res = await forgotPasswordRoute(
      postRequest('https://www.chairmatch.de/api/auth/forgot-password', body),
    )
    expect(res.status).toBe(400)
    expect(state.anon.auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })

  it('gibt einen Supabase-Fehler NICHT nach aussen weiter', async () => {
    // Vorher: 400 mit `error.message` von Supabase. Damit war von aussen
    // unterscheidbar, ob eine Adresse registriert ist — die Erfolgsmeldung
    // sagt bewusst "Falls ein Konto existiert", und der Fehlerzweig hat genau
    // das ausgehebelt. Antwort ist jetzt in beiden Faellen identisch.
    state.anon.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: null,
      error: { message: 'Email rate limit exceeded' },
    })
    const res = await forgotPasswordRoute(
      postRequest('https://www.chairmatch.de/api/auth/forgot-password', {
        email: 'kundin@example.de',
      }),
    )
    const json = (await res.json()) as { ok?: boolean; message?: string; error?: string }

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.message).toMatch(/Falls ein Konto existiert/)
    expect(JSON.stringify(json)).not.toMatch(/rate limit exceeded/i)
  })

  it('deckelt Reset-Anfragen pro IP', async () => {
    // Der Endpunkt loest fremden Mailversand aus. Ohne Deckel genuegte eine
    // Schleife, um eine beliebige Adresse zuzumuellen und nebenbei das
    // Mailkontingent des Supabase-Projekts aufzubrauchen.
    const call = (email: string) =>
      forgotPasswordRoute(
        postRequest('https://www.chairmatch.de/api/auth/forgot-password', { email }),
      )

    for (let i = 0; i < 3; i++) {
      expect((await call(`nutzer${i}@example.de`)).status).toBe(200)
    }
    const blocked = await call('nummervier@example.de')

    expect(blocked.status).toBe(429)
    expect(blocked.headers.get('retry-after')).toBeTruthy()
    expect(state.anon.auth.resetPasswordForEmail).toHaveBeenCalledTimes(3)
  })

  it('deckelt Reset-Anfragen zusaetzlich pro Adresse — auch ueber IP-Wechsel', async () => {
    // Ein Limit nur pro IP ist wirkungslos: der Angreifer wechselt die Quelle
    // und die Mailflut an dieselbe Adresse laeuft weiter. Deshalb zaehlt die
    // Route zusaetzlich pro Empfaengeradresse.
    const callFrom = (ip: string) =>
      forgotPasswordRoute(
        postRequest(
          'https://www.chairmatch.de/api/auth/forgot-password',
          { email: 'opfer@example.de' },
          { 'x-forwarded-for': ip },
        ),
      )

    for (let i = 0; i < 3; i++) {
      const res = await callFrom(`198.51.100.${i}`)
      expect(res.status).toBe(200)
    }

    // Vierte Anfrage von einer vierten IP — der IP-Zaehler ist unberuehrt.
    const res = await callFrom('198.51.100.99')
    const json = (await res.json()) as { ok?: boolean; message?: string }

    // Bewusst 200 mit derselben generischen Meldung: ein 429 nur fuer
    // existierende Adressen waere wieder ein Konto-Orakel.
    expect(res.status).toBe(200)
    expect(json.message).toMatch(/Falls ein Konto existiert/)
    // Aber es geht keine vierte Mail raus.
    expect(state.anon.auth.resetPasswordForEmail).toHaveBeenCalledTimes(3)
  })

  it('antwortet 500 bei kaputtem JSON-Body', async () => {
    const res = await forgotPasswordRoute(
      brokenJsonRequest('https://www.chairmatch.de/api/auth/forgot-password'),
    )
    expect(res.status).toBe(500)
  })
})
