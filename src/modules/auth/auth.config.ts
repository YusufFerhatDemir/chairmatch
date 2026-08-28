import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { verifyToken } from '@/lib/totp'
import { loginSchema } from './auth.schemas'
import { hashIpWeb } from '@/lib/ip-hash-web'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const RATE_LIMIT = 10
const RATE_WINDOW_MIN = 15

/**
 * `login_attempts.ip` ist zweierlei: die Spur jedes Anmeldeversuchs — auch
 * jedes gescheiterten, mit der eingegebenen E-Mail daneben — und der
 * Schluessel, ueber den das Fehlversuchslimit zaehlt. Bis Track 19 stand dort
 * die IP im Klartext, unbegrenzt aufbewahrt.
 *
 * Der HMAC aus @/lib/ip-hash-web ist deterministisch; `.eq('ip', …)` findet die
 * Zeilen also weiterhin und das Limit greift unveraendert. Der Rueckfall auf
 * den Rohwert kommt nur zum Tragen, wenn WEDER CONSENT_IP_SALT noch
 * NEXTAUTH_SECRET/AUTH_SECRET gesetzt sind — in einer laufenden Installation
 * unmoeglich, weil NextAuth ohne dieses Geheimnis gar nicht startet. Er steht
 * hier trotzdem bewusst: alle Versuche auf einen gemeinsamen Schluessel zu
 * legen hiesse, dass zehn Fehlversuche irgendwo die Anmeldung fuer alle
 * sperren.
 *
 * Genommen wird bewusst die Web-Crypto-Fassung: `src/middleware.ts` importiert
 * `auth` aus dieser Datei, und webpack zieht das Modul damit in das
 * Edge-Bundle — ein `node:crypto` darin bricht den Build. Der Wert ist
 * bitgleich mit `hashIp()`, ein Test haelt beide Fassungen aneinander fest.
 *
 * Bestehende Zeilen tragen noch den Rohwert und werden vom neuen Schluessel
 * nicht mehr getroffen: eine laufende Sperre wird beim Deploy einmalig
 * zurueckgesetzt.
 */
async function loginAttemptKey(ip: string): Promise<string> {
  return (await hashIpWeb(ip)) ?? ip
}

async function logLoginAttempt(ip: string, email: string, success: boolean) {
  try {
    await getSupabaseAdmin()
      .from('login_attempts')
      .insert({ ip: await loginAttemptKey(ip), email, success })
  } catch {
    /* table may not exist */
  }
}

/*
 * Demo-Konten — ausschliesslich fuer die lokale Entwicklung.
 *
 * Die Liste unten enthaelt feste Passwoerter im Klartext, darunter eines mit
 * der Rolle `super_admin`. Sie ist im Repository und damit fuer jeden lesbar,
 * der den Code sieht. Der einzige Schutz ist dieses Gate — es traegt also die
 * gesamte Last und wird deshalb doppelt gesetzt:
 *
 *  1. NODE_ENV === 'development'. Next.js setzt das nur bei `next dev`;
 *     jeder Build (auch Vercel-Preview) laeuft mit 'production'.
 *  2. Kein VERCEL. Falls NODE_ENV in einer Deploy-Umgebung je auf
 *     'development' stuende — durch eine gesetzte Environment-Variable, ein
 *     geaendertes Startkommando, einen Container, der `next dev` faehrt —
 *     waere Punkt 1 allein weg, und `super@chairmatch.de` mit dem Passwort
 *     aus dieser Datei haette Super-Admin-Zugang zur Produktionsdatenbank.
 *     Vercel setzt VERCEL='1' in jeder Umgebung, auch in Preview.
 */
const IS_DEV = process.env.NODE_ENV === 'development' && !process.env.VERCEL
const DEMO_ACCOUNTS: Record<string, { password: string; id: string; name: string; role: string }> = IS_DEV ? {
  'kunde@chairmatch.de':    { password: 'Cm!Kunde#2026xQ',    id: 'dddddddd-0001-4000-a000-000000000001', name: 'Demo Kunde',       role: 'kunde' },
  'anbieter@chairmatch.de': { password: 'Cm!Anbieter#2026xQ', id: 'dddddddd-0002-4000-a000-000000000002', name: 'Demo Anbieter',    role: 'anbieter' },
  'b2b@chairmatch.de':      { password: 'Cm!B2B#2026xQ',      id: 'dddddddd-0005-4000-a000-000000000005', name: 'Demo B2B',          role: 'b2b' },
  'admin@chairmatch.de':    { password: 'Cm!Admin#2026xQ',     id: 'dddddddd-0003-4000-a000-000000000003', name: 'Demo Admin',        role: 'admin' },
  'super@chairmatch.de':    { password: 'Cm!Super#2026xQ',     id: 'dddddddd-0004-4000-a000-000000000004', name: 'Super Admin',       role: 'super_admin' },
} : {}

/**
 * IDs der Demo-Konten. In jeder Nicht-Dev-Umgebung LEER — `DEMO_ACCOUNTS` ist
 * dort selbst leer.
 *
 * Gebraucht wird die Menge von `getServerSession()`: die Rollen-Nachpruefung
 * dort haelt jede Session gegen `profiles`, und zu den Demo-Konten gibt es
 * dort keine Zeile. Ohne diese Ausnahme waere `next dev` mit den Demo-Logins
 * nicht mehr benutzbar.
 */
export const DEMO_USER_IDS: ReadonlySet<string> = new Set(
  Object.values(DEMO_ACCOUNTS).map(a => a.id),
)

/**
 * Credentials-Login als eigenstaendige, exportierte Funktion.
 *
 * NextAuth() gibt den konfigurierten Provider nicht wieder heraus — ohne
 * diesen Export waere der komplette Login-Pfad (Rate-Limit, Supabase-Auth,
 * Profil-Lookup, deaktivierte Konten) nicht testbar.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<'email' | 'password', unknown>>,
) {
  try {
    const parsed = loginSchema.safeParse(credentials)
    if (!parsed.success) return null

    const { email, password } = parsed.data

    // Rate-Limit: 10 Fehlversuche / 15min pro IP.
    // Das `throw` MUSS ausserhalb des try stehen — vorher fing der eigene
    // catch-Block es sofort wieder ein und das Limit war wirkungslos.
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
    let failedAttempts = 0
    try {
      const supabaseAdmin = getSupabaseAdmin()
      const since = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000).toISOString()
      const { count } = await supabaseAdmin
        .from('login_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip', await loginAttemptKey(ip))
        .eq('success', false)
        .gte('created_at', since)
      failedAttempts = count ?? 0
    } catch {
      /* login_attempts table may not exist */
    }
    if (failedAttempts >= RATE_LIMIT) {
      throw new Error('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.')
    }

    // Check demo accounts first
    const demo = DEMO_ACCOUNTS[email.toLowerCase()]
    if (demo && demo.password === password) {
      await logLoginAttempt(ip, email, true)
      return { id: demo.id, email, name: demo.name, role: demo.role }
    }

    // Authenticate via Supabase Auth (mit Anon-Key — nur für Auth)
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      console.error('[AUTH] signInWithPassword failed:', { email, error: error?.message })
      await logLoginAttempt(ip, email, false)
      return null
    }

    await logLoginAttempt(ip, email, true)

    // Profile-Load mit SERVICE-ROLE-CLIENT (bypassed RLS).
    //
    // `maybeSingle()` statt `single()`: nur so laesst sich "kein Profil" von
    // "Abfrage fehlgeschlagen" unterscheiden. `single()` meldet beides als
    // Fehler, und genau dadurch fielen beide Faelle unten in denselben
    // Rueckfall.
    const supabaseAdmin = getSupabaseAdmin()
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, role, is_active, password_must_change')
      .eq('id', data.user.id)
      .maybeSingle()

    if (profileError) {
      // Fail closed. Vorher wurde hier ein Login MIT Rolle ausgestellt,
      // obwohl der Kontostand ungelesen blieb — ein Datenbank-Aussetzer
      // reichte, um `is_active = false` (gesperrtes/geloeschtes Konto) zu
      // ueberspringen.
      console.error('[AUTH] Profile-Lookup failed:', { userId: data.user.id, email, profileError: profileError.message })
      return null
    }

    if (!profile) {
      // KEINE Rolle aus `user_metadata`.
      //
      // Hier stand bis Track 13 `role: data.user.user_metadata?.role`. Diese
      // Metadaten gehoeren dem Konto selbst: jeder Angemeldete setzt sie mit
      // dem oeffentlichen Anon-Key per `supabase.auth.updateUser({ data: … })`
      // frei, und `signUp({ options: { data: … } })` nimmt sie schon bei der
      // Registrierung entgegen (siehe /api/register-provider, das genau so
      // `role: 'anbieter'` hineinschreibt). Wer also einen Auth-Nutzer OHNE
      // Zeile in `profiles` hat, konnte sich seine eigene Rolle aussuchen —
      // `super_admin` eingeschlossen. Der Zustand ist erreichbar: bis Track 13
      // hat /api/register-provider bei fehlgeschlagenem Salon-Insert das
      // Profil geloescht und das Auth-Konto stehen lassen.
      //
      // Der DB-Trigger `handle_new_user` schreibt fuer neue Konten fest
      // 'kunde' (Migration 20260316_fix_register_trigger). Das Nachziehen
      // hier tut dasselbe — der Kommentar an dieser Stelle hat es ohnehin
      // behauptet, ohne dass je ein Profil entstanden waere.
      console.error('[AUTH] Profile not found — lege es mit Rolle kunde an:', { userId: data.user.id, email })
      const nachname = (data.user.user_metadata?.full_name as string) || ''
      const { data: erstellt, error: createError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          full_name: nachname,
          role: 'kunde',
        })
        .select('id, email, full_name, role')
        .single()

      if (createError || !erstellt) {
        console.error('[AUTH] Profil konnte nicht angelegt werden:', {
          userId: data.user.id,
          err: createError?.message,
        })
        return null
      }

      return {
        id: data.user.id,
        email: data.user.email || email,
        name: nachname || data.user.email || email,
        role: 'kunde',
      }
    }

    if ((profile as { is_active?: boolean }).is_active === false) {
      console.error('[AUTH] Profile inactive:', { userId: data.user.id, email })
      return null
    }

    // 2FA-Pruefung.
    //
    // Die Einrichtung lief ueber /api/auth/2fa/setup und /verify; `enabled`
    // in `user_2fa` ist der einzige Wahrheitswert. Bis Track 17 war das eine
    // vollstaendig aufgebaute Funktion ohne Strom: der Nutzer aktivierte 2FA,
    // die Authenticator-App lief, und der Login hat nie danach gefragt. Jetzt
    // prueft `authorizeCredentials` den Code, bevor es die Session ausstellt.
    //
    // Der Code kommt als drittes Feld (`code`) in den Credentials. Ist 2FA
    // aktiviert und kein oder ein falscher Code da, faellt der Login durch —
    // dieselbe generische Meldung wie bei einem falschen Passwort, damit kein
    // Konto-Orakel entsteht.
    const { data: twoFa, error: twoFaErr } = await supabaseAdmin
      .from('user_2fa')
      .select('enabled, secret')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!twoFaErr && twoFa?.enabled === true && twoFa.secret) {
      const code = parsed.data.code
      if (!code || !verifyToken(twoFa.secret, code)) {
        console.error('[AUTH] 2FA verification failed:', { userId: data.user.id, email })
        await logLoginAttempt(ip, email, false)
        return null
      }
    }

    return {
      id: profile.id,
      email: profile.email || data.user.email,
      name: profile.full_name || data.user.email,
      role: profile.role,
      passwordMustChange:
        (profile as { password_must_change?: boolean | null }).password_must_change === true,
    }
  } catch (e) {
    console.error('[AUTH] authorize() crashed:', e)
    return null
  }
}

export const authOptions = {
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        code: { label: '2FA Code', type: 'text' },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    /**
     * `passwordMustChange` — die Haelfte, die bis Track 15 gefehlt hat.
     *
     * Die Middleware entscheidet ueber den Passwort-Zwang mit
     * `session.user.passwordMustChange` (siehe `decideAuthAccess` in
     * src/middleware.ts), es gibt eine Seite dafuer (/auth/change-password mit
     * ?forced=1), eine Route, die das Flag wieder loescht
     * (/api/auth/change-password), und eine Spalte `profiles.password_must_change`
     * in der Produktionsdatenbank. Nur gesetzt hat das Feld auf der Session
     * NIEMAND: weder der `jwt`- noch der `session`-Callback hat es je
     * angefasst, und `authorizeCredentials` hat die Spalte nicht einmal
     * ausgewaehlt. `!!session.passwordMustChange` war damit in jedem Request
     * `false` — der Zwang war eine vollstaendig verdrahtete Kette ohne Strom.
     *
     * Das Flag kommt beim LOGIN in den Token, nicht bei jedem Request: die
     * Middleware laeuft auf der Edge und liest ausschliesslich den Token, eine
     * DB-Abfrage steht ihr dort nicht zur Verfuegung (deshalb prueft
     * `getServerSession` Rolle und Sperre separat gegen `profiles`). Damit ein
     * geaendertes Passwort den Zwang auch wirklich beendet, meldet
     * /auth/change-password nach Erfolg ab — der naechste Login stellt einen
     * Token ohne das Flag aus.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role || 'kunde'
        token.passwordMustChange =
          (user as { passwordMustChange?: boolean }).passwordMustChange === true
        // Zeitpunkt der ANMELDUNG — nicht der Ausstellung des Tokens.
        //
        // Er ist der Anker, an dem `getServerSession` einen Widerruf misst
        // (Track 21, siehe SESSION_REVOKED in src/modules/auth/session.ts).
        // Bewusst NICHT `token.iat`: der Rolling-Refresh (`updateAge: 24h`)
        // stellt den Token neu aus und setzt `iat` dabei neu. Eine gestohlene
        // Sitzung, die weiterbenutzt wird, haette sich damit alle 24 Stunden
        // selbst an jedem Widerruf vorbeigeschoben. Dieser Zweig laeuft nur
        // `if (user)`, also ausschliesslich beim Login; der Refresh reicht den
        // Wert unveraendert durch.
        token.loginAt = Date.now()
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { passwordMustChange?: boolean }).passwordMustChange =
          token.passwordMustChange === true
        ;(session.user as { loginAt?: number }).loginAt =
          typeof token.loginAt === 'number' ? token.loginAt : 0
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: 'jwt',
    // 365 Tage Session-Dauer — User bleibt 1 Jahr eingeloggt (WhatsApp-Style)
    // Bei jeder Aktivität wird die Session automatisch verlängert (Rolling-Refresh)
    maxAge: 365 * 24 * 60 * 60, // 365 Tage in Sekunden
    updateAge: 24 * 60 * 60,    // alle 24h Token erneuern (Rolling-Refresh)
  },
  jwt: {
    // Token läuft genauso lange wie die Session — synchron halten
    maxAge: 365 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      /**
       * `__Secure-`-Praefix in jeder HTTPS-Umgebung.
       *
       * Hier stand fest `'authjs.session-token'`. Das war nicht nur eine
       * Umbenennung des NextAuth-Standards, es hat dessen einzigen
       * Zusatzschutz weggenommen: Auth.js nennt das Cookie in einer
       * HTTPS-Umgebung `__Secure-authjs.session-token`, und dieses Praefix
       * ist eine Regel, die der BROWSER durchsetzt — ein so benanntes Cookie
       * nimmt er nur ueber HTTPS und nur mit `Secure` entgegen.
       *
       * Ohne das Praefix ist der Cookie-Name gewoehnlich, und
       * Cookie-Setzen kennt keine Herkunftstrennung: eine beliebige
       * Subdomain von chairmatch.de — auch eine ueber reines HTTP
       * ausgelieferte, auch eine, die jemand anders betreibt — kann
       * `authjs.session-token` mit `Domain=.chairmatch.de` setzen und damit
       * das echte Cookie ueberschreiben. Das ist der klassische
       * Session-Fixation-Weg: der Angreifer setzt SEINEN Token, das Opfer
       * arbeitet in dessen Sitzung weiter. Das `secure`-Flag unten schuetzt
       * davor NICHT — es regelt, wohin der Browser das Cookie sendet, nicht,
       * wer es setzen darf.
       *
       * In der Entwicklung (`http://localhost`) muss das Praefix WEG, sonst
       * lehnt der Browser das Cookie ab und kein Login funktioniert mehr.
       * Deshalb dieselbe Bedingung wie bei `secure`.
       *
       * OPERATIVE FOLGE: der Name des Cookies aendert sich. Alle bestehenden
       * Sitzungen sind mit dem Deploy einmalig ungueltig, jeder muss sich neu
       * anmelden.
       */
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-authjs.session-token'
          : 'authjs.session-token',
      options: {
        httpOnly: true,          // Schutz vor XSS (JS kann Cookie nicht lesen)
        sameSite: 'lax',         // Schutz vor CSRF, OAuth-Redirects funktionieren
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Nur HTTPS in Production
        maxAge: 365 * 24 * 60 * 60, // 365 Tage persistentes Cookie
      },
    },
  },
} satisfies NextAuthConfig

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
