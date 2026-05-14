import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { headers } from 'next/headers'
import { getSupabaseAdmin, getSupabaseAnon } from '@/lib/supabase-server'
import { loginSchema } from './auth.schemas'
import { logger } from '@/lib/logger'

// Fail-fast: kein stiller Fallback auf altes Supabase-Projekt mehr.
// Supabase-Clients holen wir aus '@/lib/supabase-server' — die werfen
// laut, wenn die ENV-Variablen fehlen.

const RATE_LIMIT = 10
const RATE_WINDOW_MIN = 15

async function logLoginAttempt(ip: string, email: string, success: boolean) {
  try {
    await getSupabaseAdmin().from('login_attempts').insert({ ip, email, success })
  } catch {
    /* table may not exist */
  }
}

// Demo accounts — only active in development
const IS_DEV = process.env.NODE_ENV === 'development'
const DEMO_ACCOUNTS: Record<string, { password: string; id: string; name: string; role: string }> = IS_DEV ? {
  'kunde@chairmatch.de':    { password: 'Cm!Kunde#2026xQ',    id: 'dddddddd-0001-4000-a000-000000000001', name: 'Demo Kunde',       role: 'kunde' },
  'anbieter@chairmatch.de': { password: 'Cm!Anbieter#2026xQ', id: 'dddddddd-0002-4000-a000-000000000002', name: 'Demo Anbieter',    role: 'anbieter' },
  'b2b@chairmatch.de':      { password: 'Cm!B2B#2026xQ',      id: 'dddddddd-0005-4000-a000-000000000005', name: 'Demo B2B',          role: 'b2b' },
  'admin@chairmatch.de':    { password: 'Cm!Admin#2026xQ',     id: 'dddddddd-0003-4000-a000-000000000003', name: 'Demo Admin',        role: 'admin' },
  'super@chairmatch.de':    { password: 'Cm!Super#2026xQ',     id: 'dddddddd-0004-4000-a000-000000000004', name: 'Super Admin',       role: 'super_admin' },
} : {}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const parsed = loginSchema.safeParse(credentials)
          if (!parsed.success) return null

          const { email, password } = parsed.data

          // Rate-Limit: 10 Fehlversuche / 15min pro IP
          const h = await headers()
          const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown'
          try {
            const supabaseAdmin = getSupabaseAdmin()
            const since = new Date(Date.now() - RATE_WINDOW_MIN * 60 * 1000).toISOString()
            const { count } = await supabaseAdmin
              .from('login_attempts')
              .select('*', { count: 'exact', head: true })
              .eq('ip', ip)
              .eq('success', false)
              .gte('created_at', since)
            if ((count ?? 0) >= RATE_LIMIT) {
              throw new Error('Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.')
            }
          } catch {
            /* login_attempts table may not exist */
          }

          // Check demo accounts first
          const demo = DEMO_ACCOUNTS[email.toLowerCase()]
          if (demo && demo.password === password) {
            await logLoginAttempt(ip, email, true)
            return { id: demo.id, email, name: demo.name, role: demo.role }
          }

          // Authenticate via Supabase Auth (mit Anon-Key — nur für Auth)
          const supabase = getSupabaseAnon()
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error || !data.user) {
            logger.warn('auth.signin.invalid_credentials', { email, supabaseError: error?.message })
            await logLoginAttempt(ip, email, false)
            return null
          }

          await logLoginAttempt(ip, email, true)

          // Last-active-Tracking für Re-Engagement-Mails (fire-and-forget)
          try {
            const adminClient = getSupabaseAdmin()
            void adminClient
              .from('profiles')
              .update({ last_active_at: new Date().toISOString() })
              .eq('id', data.user.id)
          } catch { /* nicht-kritisch */ }

          // Profile-Load mit SERVICE-ROLE-CLIENT (bypassed RLS)
          const supabaseAdmin = getSupabaseAdmin()
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, full_name, role, is_active, password_must_change')
            .eq('id', data.user.id)
            .single()

          if (profileError) {
            logger.warn('auth.signin.profile_lookup_failed', { userId: data.user.id, email, error: profileError.message })
            // Fallback: trotzdem Login zulassen mit Daten aus auth.user
            return {
              id: data.user.id,
              email: data.user.email || email,
              name: (data.user.user_metadata?.full_name as string) || data.user.email || email,
              role: (data.user.user_metadata?.role as string) || 'kunde',
            }
          }

          if (!profile) {
            logger.warn('auth.signin.profile_not_found', { userId: data.user.id, email })
            // Auto-create Profile via auth.user-Metadata
            return {
              id: data.user.id,
              email: data.user.email || email,
              name: (data.user.user_metadata?.full_name as string) || data.user.email || email,
              role: (data.user.user_metadata?.role as string) || 'kunde',
            }
          }

          if ((profile as { is_active?: boolean }).is_active === false) {
            logger.warn('auth.signin.profile_inactive', { userId: data.user.id, email })
            return null
          }

          return {
            id: profile.id,
            email: profile.email || data.user.email,
            name: profile.full_name || data.user.email,
            role: profile.role,
            passwordMustChange: !!(profile as { password_must_change?: boolean }).password_must_change,
          }
        } catch (e) {
          logger.error('auth.authorize.crashed', e)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role || 'kunde'
        token.passwordMustChange = !!(user as { passwordMustChange?: boolean }).passwordMustChange
      }
      // Wenn Session aktualisiert wird (z.B. nach Password-Change), Flag refreshen
      if (trigger === 'update') {
        try {
          const supabaseAdmin = getSupabaseAdmin()
          const { data: p } = await supabaseAdmin
            .from('profiles')
            .select('password_must_change')
            .eq('id', token.id as string)
            .single()
          token.passwordMustChange = !!(p as { password_must_change?: boolean } | null)?.password_must_change
        } catch { /* swallow */ }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { passwordMustChange?: boolean }).passwordMustChange = !!token.passwordMustChange
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
      name: 'authjs.session-token',
      options: {
        httpOnly: true,          // Schutz vor XSS (JS kann Cookie nicht lesen)
        sameSite: 'lax',         // Schutz vor CSRF, OAuth-Redirects funktionieren
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Nur HTTPS in Production
        maxAge: 365 * 24 * 60 * 60, // 365 Tage persistentes Cookie
      },
    },
  },
})
