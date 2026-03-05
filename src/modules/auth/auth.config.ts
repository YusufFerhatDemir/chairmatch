import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import { prisma } from '@/lib/prisma'
import { loginSchema } from './auth.schemas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Authenticate via Supabase Auth
        const supabase = createClient(supabaseUrl, supabaseAnonKey)
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error || !data.user) return null

        // Load profile from Prisma
        const profile = await prisma.user.findUnique({
          where: { id: data.user.id },
        })

        if (!profile) return null

        return {
          id: profile.id,
          email: profile.email || data.user.email,
          name: profile.fullName || data.user.email,
          role: profile.role,
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
