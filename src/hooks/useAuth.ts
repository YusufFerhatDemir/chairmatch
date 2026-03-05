import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    store.initAuth()
  }, [])

  const role = store.profile?.role
  return {
    user: store.user,
    profile: store.profile,
    loading: store.loading,
    error: store.error,
    signIn: store.signIn,
    signUp: store.signUp,
    signOut: store.signOut,
    isAuthenticated: !!store.user,
    isProvider: role === 'anbieter',
    isAdmin: role === 'admin' || role === 'super_admin',
    isSuperAdmin: role === 'super_admin',
  }
}
