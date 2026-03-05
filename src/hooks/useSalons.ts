import { useEffect } from 'react'
import { useStore } from '@/stores/salonStore'

export function useSalons() {
  const store = useStore()

  useEffect(() => {
    if (store.salons.length === 0 && !store.loading) {
      store.loadSalons()
    }
  }, [])

  return {
    salons: store.salons,
    loading: store.loading,
    error: store.error,
    cities: store.cities,
    getSalon: store.getSalon,
    getSalonBySlug: store.getSalonBySlug,
    favorites: store.favorites,
    toggleFavorite: store.toggleFavorite,
    reload: store.loadSalons,
  }
}
