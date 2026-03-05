import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Salon, SalonCategory } from '../lib/types'
import { tierWeight } from '../lib/utils'

interface SalonState {
  salons: Salon[]
  loading: boolean
  error: string | null
  favorites: string[]
  cities: string[]

  loadSalons: () => Promise<void>
  getSalon: (id: string) => Salon | undefined
  getSalonBySlug: (slug: string) => Salon | undefined
  getFiltered: (params: {
    category?: string
    search?: string
    city?: string
    minRating?: number
    maxPrice?: number
    onlyAvailable?: boolean
    onlyDiscount?: boolean
  }) => Salon[]
  toggleFavorite: (salonId: string, userId?: string) => void
  loadFavorites: (userId: string) => Promise<void>
}

export const useStore = create<SalonState>((set, get) => ({
  salons: [],
  loading: true,
  error: null,
  favorites: JSON.parse(localStorage.getItem('cm_favs') || '[]'),
  cities: [],

  loadSalons: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('salons')
      .select('*, services(*), reviews(*), staff(*), rental_equipment(*)')
      .eq('is_active', true)

    if (error) {
      set({ error: error.message, loading: false })
      return
    }

    const salons = (data || []) as unknown as Salon[]
    const cities = [...new Set(salons.map((s) => s.city).filter(Boolean))] as string[]
    set({ salons, cities: cities.sort(), loading: false })
  },

  getSalon: (id) => get().salons.find((s) => s.id === id),
  getSalonBySlug: (slug) => get().salons.find((s) => s.slug === slug),

  getFiltered: (params) => {
    let list = [...get().salons]

    if (params.category && params.category !== 'all') {
      list = list.filter((s) => s.category === params.category)
    }
    if (params.search) {
      const q = params.search.toLowerCase()
      list = list.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.tagline?.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q)) ||
        s.services?.some((sv) => sv.name.toLowerCase().includes(q))
      )
    }
    if (params.city && params.city !== 'all') {
      list = list.filter((s) => s.city === params.city)
    }
    if (params.minRating && params.minRating > 0) {
      list = list.filter((s) => s.avg_rating >= params.minRating!)
    }
    if (params.maxPrice && params.maxPrice < 500) {
      list = list.filter((s) => s.services?.some((sv) => sv.price_cents / 100 <= params.maxPrice!))
    }
    if (params.onlyAvailable) {
      list = list.filter((s) => s.is_active)
    }
    if (params.onlyDiscount) {
      list = list.filter((s) => (s.discount || 0) > 0)
    }

    list.sort((a, b) => {
      const tw = tierWeight(b.subscription_tier as any) - tierWeight(a.subscription_tier as any)
      if (tw !== 0) return tw
      const bw = (b.boost || 0) - (a.boost || 0)
      if (bw !== 0) return bw
      return b.avg_rating - a.avg_rating
    })

    return list
  },

  toggleFavorite: (salonId, userId) => {
    const favs = get().favorites
    const idx = favs.indexOf(salonId)
    let newFavs: string[]

    if (idx > -1) {
      newFavs = favs.filter((f) => f !== salonId)
      if (userId) {
        supabase.from('favorites').delete().eq('customer_id', userId).eq('salon_id', salonId)
      }
    } else {
      newFavs = [...favs, salonId]
      if (userId) {
        ;(supabase.from('favorites') as any).insert({ customer_id: userId, salon_id: salonId })
      }
    }

    localStorage.setItem('cm_favs', JSON.stringify(newFavs))
    set({ favorites: newFavs })
  },

  loadFavorites: async (userId) => {
    const { data } = await supabase.from('favorites').select('salon_id').eq('customer_id', userId)
    if (data) {
      const favs = (data as any[]).map((f) => f.salon_id)
      localStorage.setItem('cm_favs', JSON.stringify(favs))
      set({ favorites: favs })
    }
  },
}))
