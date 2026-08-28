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
  passwordMustChange: boolean
  /**
   * Sitzungen, die VOR diesem Zeitpunkt begonnen haben, gelten als widerrufen
   * (ms seit Epoch). `0` heisst: kein Widerruf hinterlegt.
   */
  revokedBefore: number
}

interface CacheEntry {
  state: AccountState | null
  readAt: number
}

const accountCache = new Map<string, CacheEntry>()

/**
 * Die Aktion, mit der ein Konto seine offenen Sitzungen fuer ungueltig
 * erklaert. Geschrieben wird sie von /api/auth/change-password und von
 * /api/auth/session-revoke (dem serverseitigen Ende des Supabase-
 * Passwort-Resets).
 *
 * WARUM `audit_logs` UND NICHT EINE SPALTE IN `profiles`
 *
 * Der richtige Ort waere `profiles.sessions_valid_from`. Diese Spalte gibt es
 * live nicht, und ChairMatch hat weder einen Migrations-Runner noch einen
 * DB-Zugang fuer den Deploy — eine Auswahl auf eine fehlende Spalte
 * beantwortet PostgREST mit 42703, und zwar fuer die GANZE Abfrage. Der
 * Kontostand waere damit unlesbar und jede Sitzung sofort weg (siehe
 * `loadAccountState`: fail closed). `audit_logs` ist live vorhanden, wird von
 * /admin/audit-logs ohnehin gelesen und traegt mit `user_id`, `action` und
 * `created_at` genau die drei Felder, die hier gebraucht werden.
 */
export const SESSION_REVOKED_ACTION = 'SESSION_REVOKED'

/**
 * Zeitpunkt des juengsten Widerrufs, in ms.
 *
 * `null` heisst: nicht ermittelbar. Der Aufrufer behandelt das wie jeden
 * anderen Lesefehler in dieser Datei — fail closed.
 */
async function loadRevokedBefore(userId: string): Promise<number | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('audit_logs')
    .select('created_at')
    .eq('user_id', userId)
    .eq('action', SESSION_REVOKED_ACTION)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('[SESSION] Widerruf nicht lesbar:', { userId, err: error.message })
    return null
  }

  const stempel = (data?.[0] as { created_at?: string } | undefined)?.created_at
  if (!stempel) return 0
  const ms = Date.parse(stempel)
  // Ein unlesbarer Zeitstempel darf nicht als „kein Widerruf" durchgehen.
  return Number.isNaN(ms) ? null : ms
}

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
      .select('id, role, is_active, deleted_at, password_must_change')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('[SESSION] Kontostand nicht lesbar:', { userId, err: error.message })
      state = null
    } else if (!data) {
      state = null
    } else {
      const row = data as { role?: string | null; is_active?: boolean | null; deleted_at?: string | null; password_must_change?: boolean | null }
      if (row.is_active === false || row.deleted_at) {
        state = null
      } else {
        const revokedBefore = await loadRevokedBefore(userId)
        state =
          revokedBefore === null
            ? null
            : {
                role: row.role || 'kunde',
                isActive: true,
                passwordMustChange: row.password_must_change === true,
                revokedBefore,
              }
      }
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

  /**
   * Widerrufene Sitzung — Track 21.
   *
   * Bis hierher endete ein Passwortwechsel fuer JEDE ANDERE offene Sitzung
   * des Kontos in nichts. Das Cookie laeuft 365 Tage, `getServerSession`
   * prueft Rolle und Sperre gegen `profiles`, aber „dieses Passwort gilt
   * nicht mehr" stand nirgends. Wer sein Passwort aendert, WEIL ihm jemand
   * die Sitzung abgenommen hat — der haeufigste Grund ueberhaupt —, hat den
   * Angreifer damit nicht ausgesperrt. Beim Supabase-Reset
   * (/auth/reset-password) war es dasselbe: er laeuft vollstaendig im
   * Browser gegen Supabase-Auth, der NextAuth-Token davon unberuehrt.
   *
   * `loginAt` steht seit Track 21 im Token und wird nur beim Login gesetzt
   * (siehe auth.config.ts). Fehlt er, stammt der Token aus der Zeit davor und
   * gilt als aelter als jeder Widerruf.
   */
  const loginAt = (session.user as { loginAt?: number }).loginAt
  if (state.revokedBefore > 0 && (typeof loginAt !== 'number' || loginAt < state.revokedBefore)) {
    return null
  }

  ;(session.user as { role?: string }).role = state.role
  ;(session.user as { passwordMustChange?: boolean }).passwordMustChange = state.passwordMustChange
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
