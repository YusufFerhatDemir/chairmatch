import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/lib/types'

export interface ManagedUser {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: UserRole
  is_active: boolean
  preferred_language: string
  created_at: string
  updated_at: string
}

interface UserManagementState {
  users: ManagedUser[]
  loading: boolean
  error: string | null
  searchQuery: string
  roleFilter: UserRole | 'all'

  loadUsers: () => Promise<void>
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>
  toggleUserActive: (userId: string) => Promise<boolean>
  setSearchQuery: (q: string) => void
  setRoleFilter: (f: UserRole | 'all') => void
  getFilteredUsers: () => ManagedUser[]
}

export const useUserManagementStore = create<UserManagementState>((set, get) => ({
  users: [],
  loading: false,
  error: null,
  searchQuery: '',
  roleFilter: 'all',

  loadUsers: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      users: (data || []).map((u: Record<string, unknown>) => ({
        id: u.id as string,
        email: u.email as string | null,
        full_name: u.full_name as string | null,
        phone: u.phone as string | null,
        avatar_url: u.avatar_url as string | null,
        role: u.role as UserRole,
        is_active: (u.is_active as boolean) ?? true,
        preferred_language: (u.preferred_language as string) || 'de',
        created_at: u.created_at as string,
        updated_at: u.updated_at as string,
      })),
      loading: false,
    })
  },

  updateUserRole: async (userId, role) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role } as never)
      .eq('id', userId)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadUsers()
    return true
  },

  toggleUserActive: async (userId) => {
    const user = get().users.find(u => u.id === userId)
    if (!user) return false

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !user.is_active } as never)
      .eq('id', userId)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadUsers()
    return true
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setRoleFilter: (f) => set({ roleFilter: f }),

  getFilteredUsers: () => {
    const { users, searchQuery, roleFilter } = get()
    let filtered = users

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(u =>
        (u.email?.toLowerCase().includes(q)) ||
        (u.full_name?.toLowerCase().includes(q)) ||
        (u.phone?.toLowerCase().includes(q))
      )
    }

    return filtered
  },
}))
