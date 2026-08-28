// @vitest-environment node
/**
 * Track 21: ein Passwortwechsel beendet die Sitzungen, die er beenden soll.
 *
 * DER BEFUND
 *
 * Das Sitzungs-Cookie laeuft 365 Tage (auth.config.ts) und haengt am Passwort
 * nicht. `getServerSession` prueft seit Track 17 bei jedem Aufruf Rolle und
 * Sperre gegen `profiles` — „dieses Passwort gilt nicht mehr" stand aber
 * nirgends. Wer sein Passwort aendert, WEIL jemand anderes in seinem Konto
 * ist, sperrte diesen Jemand also nicht aus: dessen Cookie lief weiter.
 *
 * Beim Passwort-Reset war es dieselbe Luecke mit einer zweiten Ursache:
 * /auth/reset-password laeuft vollstaendig im Browser gegen Supabase-Auth,
 * der Server erfaehrt vom Wechsel gar nichts.
 *
 * Diese Datei benutzt bewusst das ECHTE Session-Modul — der Widerruf IST das
 * Session-Modul. Ersetzt sind nur `auth()` (der NextAuth-Token) und Supabase.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, postRequest, rawRequest, IDS } from './e2e/_harness/fixtures'
import { pgError, type FakeSupabase } from './e2e/_harness/fake-supabase'

interface TokenSession {
  user: { id: string; email: string; name: string; role?: string; loginAt?: number }
}

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./e2e/_harness/fake-supabase').FakeSupabase,
    session: null as unknown,
    /** Antwort von `signInWithPassword` im freiwilligen Wechsel. */
    passwortStimmt: true,
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@/modules/auth/auth.config', () => ({
  auth: async () => state.session,
  DEMO_USER_IDS: new Set<string>(),
  signOut: async () => undefined,
}))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: async () =>
        state.passwortStimmt
          ? { data: { user: { id: IDS.customer } }, error: null }
          : { data: { user: null }, error: { message: 'Invalid login credentials' } },
    },
  }),
}))
vi.mock('@/lib/error-tracking', () => ({
  logApiError: vi.fn(async () => undefined),
  logError: vi.fn(async () => undefined),
  isSentryConfigured: () => false,
}))

// ── Imports nach den Mocks ──────────────────────────────────────
import { __resetRateLimits } from '@/lib/rate-limit'
import {
  SESSION_REVOKED_ACTION,
  getServerSession,
  invalidateAccountState,
} from '@/modules/auth/session'
import { POST as changePassword } from '@/app/api/auth/change-password/route'
import { POST as sessionRevoke } from '@/app/api/auth/session-revoke/route'

function db(): FakeSupabase {
  return state.db
}

const CHANGE_URL = 'https://www.chairmatch.de/api/auth/change-password'
const REVOKE_URL = 'https://www.chairmatch.de/api/auth/session-revoke'

/** Ein NextAuth-Token, wie ihn `auth()` liefert — mit Anmeldezeitpunkt. */
function tokenVom(loginAt: string | number | undefined, userId: string = IDS.customer): TokenSession {
  return {
    user: {
      id: userId,
      email: 'kundin@example.de',
      name: 'Lena Kundin',
      role: 'kunde',
      ...(loginAt === undefined
        ? {}
        : { loginAt: typeof loginAt === 'string' ? Date.parse(loginAt) : loginAt }),
    },
  }
}

function widerrufSchreiben(zeitpunkt: string, userId: string = IDS.customer): void {
  db().rows('audit_logs').push({
    id: db().nextId(),
    user_id: userId,
    action: SESSION_REVOKED_ACTION,
    entity: 'profile',
    entity_id: userId,
    details: { reason: 'test' },
    created_at: zeitpunkt,
  })
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-09-01T12:00:00.000Z'))
  state.db = createDb()
  state.session = null
  state.passwortStimmt = true
  __resetRateLimits()
  // Der Kontostand wird 15 s zwischengespeichert — ohne das truege ein Test
  // den Zustand des vorigen weiter.
  invalidateAccountState()
})

afterEach(() => {
  vi.useRealTimers()
  invalidateAccountState()
})

// ═══════════════════════════════════════════════════════════════
// Der Widerruf selbst
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — getServerSession kennt den Widerruf', () => {
  it('gibt eine Sitzung zurueck, solange kein Widerruf hinterlegt ist', async () => {
    state.session = tokenVom('2026-08-01T00:00:00.000Z')

    const session = await getServerSession()
    expect(session).not.toBeNull()
    expect((session?.user as { role?: string })?.role).toBe('kunde')
  })

  it('verwirft eine Sitzung, die VOR dem Widerruf begonnen hat', async () => {
    state.session = tokenVom('2026-08-01T00:00:00.000Z')
    widerrufSchreiben('2026-08-15T00:00:00.000Z')

    expect(await getServerSession()).toBeNull()
  })

  it('laesst eine Sitzung durch, die NACH dem Widerruf begonnen hat', async () => {
    widerrufSchreiben('2026-08-15T00:00:00.000Z')
    state.session = tokenVom('2026-08-20T00:00:00.000Z')

    expect(await getServerSession()).not.toBeNull()
  })

  it('verwirft einen Token ohne Anmeldezeitpunkt, wenn ein Widerruf vorliegt', async () => {
    // Token aus der Zeit vor Track 21 — er kann seinen Beginn nicht belegen.
    state.session = tokenVom(undefined)
    widerrufSchreiben('2026-08-15T00:00:00.000Z')

    expect(await getServerSession()).toBeNull()
  })

  it('laesst einen Token ohne Anmeldezeitpunkt durch, solange nichts widerrufen ist', async () => {
    state.session = tokenVom(undefined)
    expect(await getServerSession()).not.toBeNull()
  })

  it('nimmt den JUENGSTEN Widerruf, nicht irgendeinen', async () => {
    widerrufSchreiben('2026-07-01T00:00:00.000Z')
    widerrufSchreiben('2026-08-25T00:00:00.000Z')
    state.session = tokenVom('2026-08-10T00:00:00.000Z')

    expect(await getServerSession()).toBeNull()
  })

  it('trifft nur das eigene Konto', async () => {
    widerrufSchreiben('2026-08-15T00:00:00.000Z', IDS.otherCustomer)
    state.session = tokenVom('2026-08-01T00:00:00.000Z')

    expect(await getServerSession()).not.toBeNull()
  })

  it('gibt keine Sitzung aus, wenn der Widerruf nicht lesbar ist (fail closed)', async () => {
    state.session = tokenVom('2026-08-01T00:00:00.000Z')
    // profiles wird zuerst gelesen, audit_logs danach — nur letzteres faellt aus.
    db().failOn('audit_logs', 'select', pgError('08006', 'connection failure'))

    expect(await getServerSession()).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════
// Passwortwechsel schreibt den Widerruf
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — /api/auth/change-password beendet offene Sitzungen', () => {
  function profilAuf(mussWechseln: boolean): void {
    const profil = db().rows('profiles').find(p => p.id === IDS.customer)!
    profil.password_must_change = mussWechseln
  }

  it('schreibt einen Widerruf und meldet ihn ehrlich zurueck', async () => {
    profilAuf(false)
    state.session = tokenVom('2026-08-01T00:00:00.000Z')

    const res = await changePassword(
      postRequest(CHANGE_URL, { currentPassword: 'altesPasswort1', newPassword: 'neuesPasswort1' }),
      undefined,
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, sessionsRevoked: true })

    const widerrufe = db()
      .rows('audit_logs')
      .filter(a => a.action === SESSION_REVOKED_ACTION && a.user_id === IDS.customer)
    expect(widerrufe).toHaveLength(1)
  })

  it('sperrt danach die zweite, aeltere Sitzung desselben Kontos aus', async () => {
    profilAuf(false)
    // Geraet 1 aendert das Passwort.
    state.session = tokenVom('2026-08-20T00:00:00.000Z')
    await changePassword(
      postRequest(CHANGE_URL, { currentPassword: 'altesPasswort1', newPassword: 'neuesPasswort1' }),
      undefined,
    )
    invalidateAccountState()

    // Geraet 2 (der Angreifer) hat ein aelteres Cookie und benutzt es weiter.
    state.session = tokenVom('2026-08-01T00:00:00.000Z')
    expect(await getServerSession()).toBeNull()
  })

  it('behauptet keinen Widerruf, wenn er nicht gespeichert werden konnte', async () => {
    profilAuf(false)
    state.session = tokenVom('2026-08-01T00:00:00.000Z')
    db().failOn('audit_logs', 'insert', pgError('08006', 'connection failure'))

    const res = await changePassword(
      postRequest(CHANGE_URL, { currentPassword: 'altesPasswort1', newPassword: 'neuesPasswort1' }),
      undefined,
    )

    const json = (await res.json()) as { sessionsRevoked?: boolean; warning?: string }
    expect(json.sessionsRevoked).toBe(false)
    expect(json.warning).toContain('NICHT beendet')
  })

  it('schreibt keinen Widerruf, wenn das alte Passwort falsch war', async () => {
    profilAuf(false)
    state.passwortStimmt = false
    state.session = tokenVom('2026-08-01T00:00:00.000Z')

    const res = await changePassword(
      postRequest(CHANGE_URL, { currentPassword: 'falsch', newPassword: 'neuesPasswort1' }),
      undefined,
    )

    expect(res.status).toBe(403)
    expect(db().rows('audit_logs').filter(a => a.action === SESSION_REVOKED_ACTION)).toHaveLength(0)
  })

  it('widerruft auch im erzwungenen Wechsel ohne altes Passwort', async () => {
    profilAuf(true)
    state.session = tokenVom('2026-08-01T00:00:00.000Z')

    const res = await changePassword(
      postRequest(CHANGE_URL, { newPassword: 'neuesPasswort1' }),
      undefined,
    )

    expect(res.status).toBe(200)
    const widerruf = db().rows('audit_logs').find(a => a.action === SESSION_REVOKED_ACTION)
    expect((widerruf?.details as { reason?: string })?.reason).toBe('password_change_forced')
  })
})

// ═══════════════════════════════════════════════════════════════
// Passwort-Reset: /api/auth/session-revoke
// ═══════════════════════════════════════════════════════════════

describe('Track 21 — /api/auth/session-revoke', () => {
  const GUELTIG = 'supabase-access-token-der-reset-sitzung'

  beforeEach(() => {
    db().authTokens.set(GUELTIG, IDS.customer)
  })

  function mitToken(token: string | null) {
    return rawRequest(REVOKE_URL, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
  }

  it('weist einen Aufruf ohne Token mit 401 ab', async () => {
    const res = await sessionRevoke(mitToken(null))
    expect(res.status).toBe(401)
    expect(db().rows('audit_logs')).toHaveLength(0)
  })

  it('weist ein selbst erfundenes Token mit 401 ab', async () => {
    const res = await sessionRevoke(mitToken('eyJ-frei-erfunden'))
    expect(res.status).toBe(401)
    expect(db().rows('audit_logs')).toHaveLength(0)
  })

  it('nimmt die Nutzer-ID aus dem geprueften Token, nicht aus dem Body', async () => {
    const res = await sessionRevoke(
      rawRequest(REVOKE_URL, {
        method: 'POST',
        headers: { authorization: `Bearer ${GUELTIG}`, 'content-type': 'application/json' },
        // Der Angreifer versucht, den Widerruf auf ein fremdes Konto zu legen.
        body: JSON.stringify({ userId: IDS.superAdmin }),
      }),
    )

    expect(res.status).toBe(200)
    const rows = db().rows('audit_logs').filter(a => a.action === SESSION_REVOKED_ACTION)
    expect(rows).toHaveLength(1)
    expect(rows[0].user_id).toBe(IDS.customer)
  })

  it('sperrt die alte Sitzung nach dem Reset wirklich aus', async () => {
    await sessionRevoke(mitToken(GUELTIG))
    invalidateAccountState()

    state.session = tokenVom('2026-08-01T00:00:00.000Z')
    expect(await getServerSession()).toBeNull()
  })

  it('meldet 503 statt Erfolg, wenn der Widerruf nicht gespeichert werden kann', async () => {
    db().failOn('audit_logs', 'insert', pgError('08006', 'connection failure'))
    const res = await sessionRevoke(mitToken(GUELTIG))
    expect(res.status).toBe(503)
  })

  it('deckelt Wiederholungen (Rate-Limit)', async () => {
    let letzte = await sessionRevoke(mitToken('falsch-1'))
    for (let i = 0; i < 8; i++) {
      letzte = await sessionRevoke(mitToken(`falsch-${i + 2}`))
    }
    expect(letzte.status).toBe(429)
  })
})
