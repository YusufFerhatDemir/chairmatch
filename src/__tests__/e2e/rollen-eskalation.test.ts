// @vitest-environment node
/**
 * E2E: Rollen-Eskalation — Track 13.
 *
 * Zwei Befunde, beide in derselben Kette (Login → JWT → Route):
 *
 * (1) DIE ROLLE KAM AUS `user_metadata`.
 *     `authorizeCredentials()` hatte zwei Rueckfaelle — Profil-Lookup
 *     fehlgeschlagen und Profil nicht gefunden — und beide stellten die
 *     Session mit
 *
 *         role: data.user.user_metadata?.role || 'kunde'
 *
 *     aus. `user_metadata` (in Postgres: `auth.users.raw_user_meta_data`)
 *     gehoert dem Konto selbst. Es ist mit dem OEFFENTLICHEN Anon-Key
 *     schreibbar — `supabase.auth.updateUser({ data: { role: 'super_admin' } })`
 *     genuegt, und `signUp({ options: { data: … } })` nimmt es schon bei der
 *     Registrierung entgegen. /api/register-provider tut genau das mit
 *     `role: 'anbieter'`; Anon-URL und Anon-Key stehen als
 *     `NEXT_PUBLIC_*` im ausgelieferten Bundle.
 *
 *     Der Rueckfall setzte nur eines voraus: einen Auth-Nutzer ohne Zeile in
 *     `profiles`. Genau den hat /api/register-provider erzeugt — schlug der
 *     Salon-Insert fehl, loeschte der Handler das Profil und liess das
 *     Auth-Konto stehen.
 *
 *     Der bisherige Test dazu ("faellt auf die Auth-Metadaten zurueck, wenn
 *     noch kein Profil existiert") hat das nicht uebersehen, sondern
 *     festgeschrieben: er erwartete `role: 'anbieter'` aus den Metadaten.
 *
 * (2) DIE ROLLE IM JWT WAR EINGEFROREN — 365 TAGE.
 *     Der `jwt`-Callback setzt `token.role` nur `if (user)`, also beim Login;
 *     `session.maxAge` steht auf einem Jahr. Jede Route unter /api/admin/*
 *     liest ausschliesslich `session.user.role`. Damit war KEIN Rechteentzug
 *     wirksam: der ueber PATCH /api/admin herabgestufte Admin blieb Admin,
 *     und `is_active = false` (Sperre, DSGVO-Loeschung) sperrte nur den
 *     naechsten Login, nicht das ausgestellte Cookie.
 *
 * Die Tests unten FUEHREN beide Angriffe aus.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createDb, postRequest, IDS } from './_harness/fixtures'
import type { FakeSupabase } from './_harness/fake-supabase'

const VERWAISTER_NUTZER = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
const PASSWORT = 'Sicher!2026'

const state = vi.hoisted(() => {
  process.env.AUTH_SECRET ??= 'test-secret-nur-fuer-vitest'
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://pwdbjqfpgumyfktbfswg.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'anon-test-key'
  return {
    db: undefined as unknown as import('./_harness/fake-supabase').FakeSupabase,
    anon: undefined as unknown as { auth: { signInWithPassword: ReturnType<typeof vi.fn> } },
    /** Was im NextAuth-Token steht — beim Angriff bewusst veraltet/gefaelscht. */
    token: null as { user: { id: string; email?: string; name?: string; role?: string } } | null,
  }
})

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => state.db }))
vi.mock('@supabase/supabase-js', () => ({ createClient: () => state.anon }))
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))

// `auth()` liefert den Token-Inhalt. Genau das ist die Stelle, die ein
// Angreifer mit einem alten Cookie in der Hand kontrolliert — deshalb wird sie
// hier gesetzt, waehrend session.ts selbst ECHT bleibt.
vi.mock('@/modules/auth/auth.config', async () => {
  const echt = await vi.importActual<typeof import('@/modules/auth/auth.config')>(
    '@/modules/auth/auth.config',
  )
  return {
    ...echt,
    auth: async () => state.token,
    DEMO_USER_IDS: new Set<string>(),
  }
})

import { authorizeCredentials } from '@/modules/auth/auth.config'
import { getServerSession, invalidateAccountState } from '@/modules/auth/session'
import { PATCH as adminRoute } from '@/app/api/admin/route'

function db(): FakeSupabase {
  return state.db
}

/** Anon-Client, der `signInWithPassword` gegen die Fake-DB beantwortet. */
function createAnonClient(metadata: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(async (args: { email: string; password: string }) => {
        if (args.password !== PASSWORT) {
          return { data: { user: null }, error: { message: 'Invalid login credentials' } }
        }
        const profil = db().rows('profiles').find(p => p.email === args.email)
        return {
          data: {
            user: {
              id: (profil?.id as string) ?? VERWAISTER_NUTZER,
              email: args.email,
              user_metadata: metadata,
            },
          },
          error: null,
        }
      }),
    },
  }
}

beforeEach(() => {
  state.db = createDb()
  state.anon = createAnonClient()
  state.token = null
  invalidateAccountState()
})

afterEach(() => {
  invalidateAccountState()
})

// ────────────────────────────────────────────────────────────────
describe('Angriff 1: selbst gesetzte Rolle in user_metadata', () => {
  it('gibt einem Auth-Nutzer ohne Profil NICHT die Rolle aus seinen Metadaten', async () => {
    // Der Angreifer hat ein Auth-Konto ohne Profil (Zustand, den
    // /api/register-provider erzeugt hat) und setzt sich per
    // `supabase.auth.updateUser({ data: { role: 'super_admin' } })` mit dem
    // oeffentlichen Anon-Key seine Rolle selbst.
    state.anon = createAnonClient({ full_name: 'Mallory', role: 'super_admin' })

    const user = await authorizeCredentials({ email: 'verwaist@example.de', password: PASSWORT })

    expect(user).not.toBeNull()
    expect((user as { role: string }).role).toBe('kunde')
    expect((user as { role: string }).role).not.toBe('super_admin')
  })

  it('zieht das fehlende Profil mit der niedrigsten Rolle nach', async () => {
    state.anon = createAnonClient({ full_name: 'Mallory', role: 'admin' })

    await authorizeCredentials({ email: 'verwaist@example.de', password: PASSWORT })

    const angelegt = db().row('profiles', VERWAISTER_NUTZER)
    expect(angelegt).toMatchObject({ role: 'kunde', email: 'verwaist@example.de' })
  })

  it('laesst niemanden hinein, wenn das Profil nicht angelegt werden kann', async () => {
    state.anon = createAnonClient({ role: 'super_admin' })
    db().failOn('profiles', 'insert', {
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: null,
      hint: null,
    })

    expect(
      await authorizeCredentials({ email: 'verwaist@example.de', password: PASSWORT }),
    ).toBeNull()
  })

  it('stellt bei einem Lesefehler auf profiles gar keine Session aus', async () => {
    // Vorher wurde hier ein Login MIT Rolle ausgestellt — ein
    // Datenbank-Aussetzer reichte, um `is_active = false` zu ueberspringen.
    state.anon = createAnonClient({ role: 'super_admin' })
    db().failOn('profiles', 'select', {
      code: '57014',
      message: 'canceling statement due to statement timeout',
      details: null,
      hint: null,
    })

    expect(
      await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT }),
    ).toBeNull()
  })

  it('haelt sich an das Profil, wenn die Metadaten etwas anderes behaupten', async () => {
    state.anon = createAnonClient({ role: 'super_admin' })

    const user = await authorizeCredentials({ email: 'kundin@example.de', password: PASSWORT })

    expect((user as { role: string }).role).toBe('kunde')
  })
})

// ────────────────────────────────────────────────────────────────
describe('Angriff 2: veraltete Rolle im Cookie', () => {
  it('ueberschreibt die Rolle aus dem Token mit der aus profiles', async () => {
    // Das Cookie stammt aus der Zeit, als der Nutzer Admin war.
    state.token = { user: { id: IDS.customer, email: 'kundin@example.de', role: 'super_admin' } }

    const session = await getServerSession()

    expect((session?.user as { role?: string })?.role).toBe('kunde')
  })

  it('laesst die Admin-Route mit genau diesem Cookie nicht mehr durch', async () => {
    state.token = { user: { id: IDS.customer, email: 'kundin@example.de', role: 'super_admin' } }

    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', {
        action: 'user-role',
        id: IDS.customer,
        data: { role: 'super_admin' },
      }),
    )

    expect(res.status).toBe(403)
    expect(db().row('profiles', IDS.customer)?.role).toBe('kunde')
  })

  it('beendet die Sitzung eines gesperrten Kontos', async () => {
    db().row('profiles', IDS.admin)!.is_active = false
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }

    expect(await getServerSession()).toBeNull()
  })

  it('beendet die Sitzung eines geloeschten Kontos (deleted_at)', async () => {
    db().row('profiles', IDS.admin)!.deleted_at = '2026-08-01T00:00:00.000Z'
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }

    expect(await getServerSession()).toBeNull()
  })

  it('beendet die Sitzung, wenn das Profil hart geloescht wurde', async () => {
    const rows = db().rows('profiles')
    rows.splice(
      rows.findIndex(p => p.id === IDS.admin),
      1,
    )
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }

    expect(await getServerSession()).toBeNull()
  })

  it('stellt bei einem Lesefehler keine Session aus (fail closed)', async () => {
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }
    db().failOn('profiles', 'select', {
      code: '57014',
      message: 'canceling statement due to statement timeout',
      details: null,
      hint: null,
    })

    expect(await getServerSession()).toBeNull()
  })

  it('laesst einen echten Admin unveraendert durch', async () => {
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }

    const session = await getServerSession()

    expect((session?.user as { role?: string })?.role).toBe('admin')
  })

  it('holt die Rolle aus der Datenbank, auch wenn im Token gar keine steht', async () => {
    state.token = { user: { id: IDS.owner, email: 'inhaber@example.de' } }

    const session = await getServerSession()

    expect((session?.user as { role?: string })?.role).toBe('anbieter')
  })

  it('laesst eine Session ohne Nutzer-ID unveraendert (anonym bleibt anonym)', async () => {
    state.token = null
    expect(await getServerSession()).toBeNull()
    expect(db().log.some(c => c.table === 'profiles')).toBe(false)
  })
})

// ────────────────────────────────────────────────────────────────
describe('Kontostand-Cache', () => {
  it('liest denselben Kontostand innerhalb des Fensters nur einmal', async () => {
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }

    await getServerSession()
    const nachErstem = db().log.filter(c => c.table === 'profiles' && c.op === 'select').length
    await getServerSession()
    const nachZweitem = db().log.filter(c => c.table === 'profiles' && c.op === 'select').length

    expect(nachErstem).toBe(1)
    expect(nachZweitem).toBe(1)
  })

  it('greift nach invalidateAccountState sofort wieder auf die Datenbank zu', async () => {
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }
    await getServerSession()

    db().row('profiles', IDS.admin)!.role = 'kunde'
    invalidateAccountState(IDS.admin)

    const session = await getServerSession()
    expect((session?.user as { role?: string })?.role).toBe('kunde')
  })

  it('wirft den Cache beim Herabstufen ueber die Admin-Route weg', async () => {
    // Ein super_admin stuft einen admin herab. Ohne Invalidierung bliebe die
    // alte Rolle bis zum Ablauf des Fensters wirksam.
    //
    // Bis Track 21 lief dieser Test ueber eine SELBST-Herabstufung. Die ist
    // seither verboten (die Aussperrung, die niemand rueckgaengig machen
    // kann — siehe /api/admin, `user-role`); gemeint war hier ohnehin der
    // Cache, nicht wer wen herabstufen darf. Dass Selbst- und
    // Admin-Herabstufung abgewiesen werden, steht in
    // src/__tests__/track-21-auth-sessions-mandantentrennung.test.ts.
    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }
    await getServerSession()

    state.token = { user: { id: IDS.superAdmin, email: 'super@example.de', role: 'super_admin' } }
    const res = await adminRoute(
      postRequest('https://www.chairmatch.de/api/admin', {
        action: 'user-role',
        id: IDS.admin,
        data: { role: 'kunde' },
      }),
    )
    expect(res.status).toBe(200)

    state.token = { user: { id: IDS.admin, email: 'admin@example.de', role: 'admin' } }
    const session = await getServerSession()
    expect((session?.user as { role?: string })?.role).toBe('kunde')
  })
})

// ────────────────────────────────────────────────────────────────
/**
 * Statische Absicherung.
 *
 * Beide Befunde sind Muster, keine Einzelstellen — sie kaemen mit der
 * naechsten Route ungeprueft wieder herein. Deshalb wird der Baum selbst
 * geprueft statt nur das Verhalten.
 */
function dateienUnter(dir: string, treffer: string[] = []): string[] {
  for (const eintrag of readdirSync(dir)) {
    const pfad = join(dir, eintrag)
    if (statSync(pfad).isDirectory()) {
      if (eintrag === '__tests__' || eintrag === 'node_modules') continue
      dateienUnter(pfad, treffer)
    } else if (/\.(ts|tsx)$/.test(eintrag) && !/\.test\.tsx?$/.test(eintrag)) {
      treffer.push(pfad)
    }
  }
  return treffer
}

/**
 * Der Baumlauf einmal je Datei statt je Test.
 *
 * Beide Tests lesen denselben Baum; unter voller Suite hat der doppelte Lauf
 * das 5-Sekunden-Standardlimit von Vitest gerissen (7,1 s), waehrend er
 * einzeln in 1,8 s durchlief — ein Zeitfehler, kein Befund. Deshalb einmal
 * merken und beiden Tests ein eigenes Limit geben.
 */
const dateiCache = new Map<string, string[]>()
function dateienUnterGemerkt(dir: string): string[] {
  const gemerkt = dateiCache.get(dir)
  if (gemerkt) return gemerkt
  const frisch = dateienUnter(dir)
  dateiCache.set(dir, frisch)
  return frisch
}

/** Grosszuegiges Limit: der Baumlauf haengt an der Plattenlast, nicht am Code. */
const STATIK_TIMEOUT = 30_000

describe('Statische Absicherung', () => {
  /** Kommentarzeilen raus — beschrieben werden darf der Befund, benutzt nicht. */
  function ohneKommentare(quelltext: string): string {
    return quelltext
      .split('\n')
      .filter(z => {
        const t = z.trim()
        return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*')
      })
      .join('\n')
  }

  it('liest im Produktivcode nirgends eine Rolle aus user_metadata', () => {
    const treffer = dateienUnterGemerkt('src')
      .filter(p => !p.includes('__tests__'))
      .filter(p =>
        /user_metadata\s*(\?\.|\.)\s*role/.test(ohneKommentare(readFileSync(p, 'utf-8'))),
      )

    expect(treffer).toEqual([])
  }, STATIK_TIMEOUT)

  it('laesst keine API-Route ihre Session an der Nachpruefung vorbei holen', () => {
    // `auth()` liefert nur den Token. Die Rolle darin ist bis zu einem Jahr
    // alt — die Nachpruefung gegen `profiles` steckt in `getServerSession()`.
    // Ausnahmen: der NextAuth-Handler selbst und `signOut`.
    const erlaubt = new Set(['src/app/api/auth/[...nextauth]/route.ts'])

    const treffer = dateienUnterGemerkt('src/app/api')
      .filter(p => !erlaubt.has(p))
      .filter(p => /import\s*\{[^}]*\bauth\b[^}]*\}\s*from\s*'@\/modules\/auth\/auth\.config'/.test(
        readFileSync(p, 'utf-8'),
      ))

    expect(treffer).toEqual([])
  }, STATIK_TIMEOUT)
})
