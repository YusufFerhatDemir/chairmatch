import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { loginSchema } from './auth.schemas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

          // Check demo accounts first
          const demo = DEMO_ACCOUNTS[email.toLowerCase()]
          if (demo && demo.password === password) {
            return { id: demo.id, email, name: demo.name, role: demo.role }
          }

          // Authenticate via Supabase Auth
          const supabase = createClient(supabaseUrl, supabaseAnonKey)
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error || !data.user) return null

          // Load profile via Supabase REST API (works with IPv4, no direct DB needed)
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, email, full_name, role')
            .eq('id', data.user.id)
            .single()

          if (!profile) return null

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
