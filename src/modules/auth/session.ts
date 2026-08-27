import { auth, DEMO_USER_IDS } from './auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

/**
 * Serverseitige Session — mit Nachpruefung von Rolle und Kontostand.
 *
 * WARUM DIE NACHPRUEFUNG HIER STEHT
 *
 * `auth()` liest die Session aus dem NextAuth-JWT. Die Rolle kommt genau
 * einmal hinein: im `jwt`-Callback, und dort nur `if (user)` — also beim
 * Login. Danach wird sie nie wieder angefasst. Zusammen mit
 *
 *     session: { maxAge: 365 * 24 * 60 * 60 }   // auth.config.ts
 *
 * heisst das: die Rolle, die jemand beim Anmelden hatte, gilt ein Jahr lang.
 * Der Rolling-Refresh (`updateAge: 24h`) stellt den Token neu aus und
 * uebernimmt `token.role` dabei unveraendert.
 *
 * Praktisch war damit KEIN Rechteentzug wirksam:
 *
 *  - PATCH /api/admin `user-role` schreibt `profiles.role`. Ein
 *    herabgestufter Admin blieb in seiner offenen Sitzung Admin — jede Route
 *    unter /api/admin/* prueft ausschliesslich `session.user.role`.
 *  - `is_active = false` (Kontosperre, DSGVO-Loeschung ueber
 *    /api/account/delete) sperrt den LOGIN in `authorizeCredentials`. Ein
 *    bereits ausgestelltes Cookie kommt daran vorbei.
 *  - Ein hart geloeschtes Profil (Cron /api/cron/hard-delete) hinterliess
 *    eine Session, die weiter als ihr frueherer Inhaber galt.
 *
 * Deshalb entscheidet ueber Rolle und Zugang jetzt bei JEDEM Aufruf die
 * Datenbank, nicht der Token. Der Token liefert nur noch die Identitaet.
 *
 * Fail closed: laesst sich der Kontostand nicht lesen, gibt es keine Session.
 * Eine Rolle aus einer Quelle auszustellen, die gerade nicht antwortet, ist
 * genau der Fehler, den diese Funktion beseitigen soll.
 *
 * Die Middleware prueft weiterhin gegen den Token. Sie ist die grobe
 * Vorsortierung, nicht die Grenze — die Grenze ist die Route (siehe
 * Kommentar zu `adminPaths` in src/middleware.ts).
 */

/** Wie lange ein gelesener Kontostand wiederverwendet wird. */
const ACCOUNT_CACHE_MS = 15_000

/** Obergrenze der Cache-Eintraege — die Map darf nicht unbegrenzt wachsen. */
const ACCOUNT_CACHE_MAX = 5_000

interface AccountState {
  role: string
  isActive: boolean
}

interface CacheEntry {
  state: AccountState | null
  readAt: number
}

const accountCache = new Map<string, CacheEntry>()

/**
 * Kontostand aus `profiles`. `null` heisst: kein Profil, gesperrt, oder die
 * Abfrage ist fehlgeschlagen — in allen drei Faellen gibt es keine Session.
 */
async function loadAccountState(userId: string): Promise<AccountState | null> {
  const now = Date.now()
  const cached = accountCache.get(userId)
  if (cached && now - cached.readAt < ACCOUNT_CACHE_MS) {
    return cached.state
  }

  let state: AccountState | null
  try {
    const { data, error } = await getSupabaseAdmin()
      .from('profiles')
      .select('id, role, is_active, deleted_at')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[SESSION] Kontostand nicht lesbar:', { userId, err: error.message })
      state = null
    } else if (!data) {
      state = null
    } else {
      const row = data as { role?: string | null; is_active?: boolean | null; deleted_at?: string | null }
      state =
        row.is_active === false || row.deleted_at
          ? null
          : { role: row.role || 'kunde', isActive: true }
    }
  } catch (e) {
    console.error('[SESSION] Kontostand-Abfrage abgebrochen:', { userId, err: String(e) })
    state = null
  }

  if (accountCache.size >= ACCOUNT_CACHE_MAX) accountCache.clear()
  accountCache.set(userId, { state, readAt: now })
  return state
}

/**
 * Vergisst den zwischengespeicherten Kontostand.
 *
 * Aufzurufen, sobald eine Route Rolle oder Sperre selbst aendert — sonst
 * bleibt die alte Rolle bis zu {@link ACCOUNT_CACHE_MS} weiter gueltig.
 */
export function invalidateAccountState(userId?: string): void {
  if (userId) accountCache.delete(userId)
  else accountCache.clear()
}

export async function getServerSession() {
  const session = await auth()
  const userId = session?.user?.id
  if (!session?.user || !userId) return session

  // Demo-Konten (nur `next dev`) haben keine Zeile in `profiles`.
  if (DEMO_USER_IDS.has(userId)) return session

  const state = await loadAccountState(userId)
  if (!state) return null

  ;(session.user as { role?: string }).role = state.role
  return session
}

export async function requireAuth() {
  const session = await getServerSession()
  if (!session?.user) {
    redirect('/auth')
  }
  return session
}

export async function requireRole(roles: string[]) {
  const session = await requireAuth()
  const role = (session.user as { role?: string }).role
  if (!role || !roles.includes(role)) {
    redirect('/')
  }
  return session
}
