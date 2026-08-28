// @vitest-environment node
/**
 * E2E: der Passwort-Zwang — Track 15.
 *
 * Die Kette war vollstaendig verdrahtet und ohne Strom:
 *
 *   - `profiles.password_must_change` existiert in der Produktionsdatenbank
 *     (belegt in docs/CHAIRMATCH_RLS_FINAL_STATUS.md).
 *   - Die Middleware entscheidet mit `session.user.passwordMustChange`
 *     (`decideAuthAccess` in src/middleware.ts) und leitet auf
 *     /auth/change-password?forced=1 um bzw. antwortet API-Aufrufen mit
 *     `password_change_required`.
 *   - Es gibt die Seite dafuer, und /api/auth/change-password loescht das
 *     Flag nach Erfolg wieder.
 *
 * Nur GESETZT hat das Feld auf der Session NIEMAND: `authorizeCredentials`
 * hat die Spalte nicht einmal ausgewaehlt, und weder der `jwt`- noch der
 * `session`-Callback haben sie je angefasst. `!!session.passwordMustChange`
 * war damit in JEDEM Request `false` — der Zwang hat nie jemanden
 * aufgehalten, und ein gesetztes Flag in der Datenbank blieb wirkungslos.
 *
 * Die Tests unten gehen den ganzen Weg: Login → Token → Session →
 * Middleware-Entscheidung.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDb, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const PASSWORT = 'Sicher!2026'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    anon: undefined as unknown as { auth: { signInWithPassword: ReturnType<typeof vi.fn> } },
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => state.anon }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))

import { authOptions, authorizeCredentials } from '@/modules/auth/auth.config'
import { decideAuthAccess } from '@/middleware'

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
        const profil = db().rows('profiles').find(p => p.email === args.email)
        if (!profil) return { data: { user: null }, error: { message: 'Invalid login credentials' } }
        return {
          data: { user: { id: profil.id as string, email: args.email, user_metadata: {} } },
          error: null,
        }
      }),
    },
  }
}

/** Setzt das Flag so, wie es ein Admin oder ein Initial-Passwort setzen wuerde. */
function flagSetzen(wert: boolean | null): void {
  const profil = db().row('profiles', IDS.owner)
  if (!profil) throw new Error('Profil nicht in der Fake-DB')
  profil.password_must_change = wert
}

/**
 * Der echte Weg vom `authorize`-Ergebnis bis zur Session: beide NextAuth-
 * Callbacks aus auth.config.ts, hintereinander. Genau dieses Objekt liest die
 * Middleware aus dem Token.
 */
async function sessionAusLogin(email: string) {
  const user = await authorizeCredentials({ email, password: PASSWORT })
  if (!user) return null

  // Die NextAuth-Typen der Callbacks sind auf die eigenen Adapter-Typen
  // festgelegt; hier wird absichtlich mit den nackten Formen gerufen, die der
  // Produktivcode auch wirklich anfasst.
  const jwt = authOptions.callbacks.jwt as unknown as (a: {
    token: Record<string, unknown>
    user: unknown
  }) => Promise<Record<string, unknown>>
  const sessionCb = authOptions.callbacks.session as unknown as (a: {
    session: { user: Record<string, unknown> }
    token: Record<string, unknown>
  }) => Promise<{ user: Record<string, unknown> }>

  const token = await jwt({ token: {}, user })
  return sessionCb({ session: { user: {} }, token })
}

beforeEach(() => {
  state.db = createDb()
  state.anon = createAnonClient()
})

afterEach(() => {
  vi.clearAllMocks()
})

// ────────────────────────────────────────────────────────────────
describe('password_must_change kommt vom Profil bis in die Session', () => {
  it('setzt passwordMustChange, wenn die Spalte true ist', async () => {
    flagSetzen(true)

    const session = await sessionAusLogin('inhaber@example.de')

    expect(session?.user.passwordMustChange).toBe(true)
    // Die Rolle darf davon unberuehrt bleiben.
    expect(session?.user.role).toBe('anbieter')
  })

  it('setzt es NICHT, wenn die Spalte false oder ungesetzt ist', async () => {
    flagSetzen(false)
    expect((await sessionAusLogin('inhaber@example.de'))?.user.passwordMustChange).toBe(false)

    flagSetzen(null)
    expect((await sessionAusLogin('inhaber@example.de'))?.user.passwordMustChange).toBe(false)
  })

  it('authorizeCredentials liefert das Flag selbst zurueck', async () => {
    flagSetzen(true)

    const user = await authorizeCredentials({ email: 'inhaber@example.de', password: PASSWORT })

    expect((user as { passwordMustChange?: boolean }).passwordMustChange).toBe(true)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Die Middleware haelt den Nutzer damit wirklich auf', () => {
  // `/provider` und `/api/provider` — bewusst NICHT `/anbieter/…`: das steht
  // in `publicPrefixes` und wird von `decideAuthAccess` vor jeder Pruefung
  // durchgelassen, der Test waere dort auch mit totem Flag gruen.
  it('leitet eine Seite auf den Passwort-Wechsel um', async () => {
    flagSetzen(true)
    const session = await sessionAusLogin('inhaber@example.de')

    const entscheidung = decideAuthAccess({
      pathname: '/provider',
      session: {
        role: session?.user.role as string,
        passwordMustChange: session?.user.passwordMustChange as boolean,
      },
    })

    expect(entscheidung.kind).toBe('password_change_redirect')
  })

  it('weist einen API-Aufruf ab', async () => {
    flagSetzen(true)
    const session = await sessionAusLogin('inhaber@example.de')

    const entscheidung = decideAuthAccess({
      pathname: '/api/provider/salon',
      session: {
        role: session?.user.role as string,
        passwordMustChange: session?.user.passwordMustChange as boolean,
      },
    })

    expect(entscheidung.kind).toBe('password_change_required')
  })

  it('laesst dieselbe Session ohne gesetztes Flag normal durch', async () => {
    flagSetzen(false)
    const session = await sessionAusLogin('inhaber@example.de')

    const entscheidung = decideAuthAccess({
      pathname: '/provider',
      session: {
        role: session?.user.role as string,
        passwordMustChange: session?.user.passwordMustChange as boolean,
      },
    })

    expect(entscheidung.kind).toBe('pass')
  })
})
