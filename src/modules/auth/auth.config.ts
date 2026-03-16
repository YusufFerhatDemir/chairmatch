import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { loginSchema } from './auth.schemas'

const FALLBACK_URL = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

const RATE_LIMIT = 10
const RATE_WINDOW_MIN = 15

async function logLoginAttempt(ip: string, email: string, success: boolean) {
  try {
    await getSupabaseAdmin().from('login_attempts').insert({ ip, email, success })
  } catch {
    /* table may not exist */
  }
}

// Demo accounts — matched against profiles table by email
const DEMO_ACCOUNTS: Record<string, { password: string; id: string; name: string; role: string }> = {
  'kunde@chairmatch.de':    { password: 'kunde123',    id: 'dddddddd-0001-4000-a000-000000000001', name: 'Demo Kunde',       role: 'kunde' },
  'anbieter@chairmatch.de': { password: 'anbieter123', id: 'dddddddd-0002-4000-a000-000000000002', name: 'Demo Anbieter',    role: 'anbieter' },
  'b2b@chairmatch.de':      { password: 'b2b123',      id: 'dddddddd-0005-4000-a000-000000000005', name: 'Demo B2B',          role: 'b2b' },
  'admin@chairmatch.de':    { password: 'admin123',    id: 'dddddddd-0003-4000-a000-000000000003', name: 'Demo Admin',        role: 'admin' },
  'super@chairmatch.de':    { password: 'super123',    id: 'dddddddd-0004-4000-a000-000000000004', name: 'Super Admin',       role: 'super_admin' },
}

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

          // Authenticate via Supabase Auth
          const supabase = createClient(supabaseUrl, supabaseAnonKey)
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error || !data.user) {
            await logLoginAttempt(ip, email, false)
            return null
          }

          await logLoginAttempt(ip, email, true)

          // Load profile via Supabase REST API (works with IPv4, no direct DB needed)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role, is_active')
            .eq('id', data.user.id)
            .single()

          if (!profile) return null
          if ((profile as { is_active?: boolean }).is_active === false) return null

          return {
            id: profile.id,
            email: profile.email || data.user.email,
            name: profile.full_name || data.user.email,
            role: profile.role,
          }
        } catch {
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role || 'kunde'
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth',
  },
  session: {
    strategy: 'jwt',
  },
})
