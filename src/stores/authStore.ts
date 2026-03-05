import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  authTab: 'login' | 'register'

  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setAuthTab: (tab: 'login' | 'register') => void
  signUp: (email: string, password: string, fullName?: string) => Promise<string | null>
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  loadProfile: () => Promise<void>
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,
  authTab: 'login',

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setAuthTab: (authTab) => set({ authTab }),

  signUp: async (email, password, fullName) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    })
    if (error) {
      set({ loading: false, error: error.message })
      return error.message
    }
    // Auto sign-in if email confirmation disabled
    if (data.user && data.session) {
      set({ user: data.user, loading: false })
      await get().loadProfile()
    } else {
      set({ loading: false })
    }
    return null
  },

  signIn: async (email, password) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      set({ loading: false, error: error.message })
      return error.message
    }
    if (data.user) {
      set({ user: data.user, loading: false })
      await get().loadProfile()
    } else {
      set({ loading: false })
    }
    return null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },

  loadProfile: async () => {
    const user = get().user
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (data) set({ profile: data as unknown as Profile })
  },

  initAuth: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      set({ user: session.user })
      await get().loadProfile()
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        set({ user: session.user })
        get().loadProfile()
      } else {
        set({ user: null, profile: null })
      }
    })
  },
}))
