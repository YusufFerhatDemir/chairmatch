import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface ManagedProvider {
  id: string
  owner_id: string
  name: string
  slug: string | null
  category: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  street: string | null
  house_number: string | null
  postal_code: string | null
  city: string | null
  state: string
  cover_url: string | null
  logo_url: string | null
  gallery: string[] | null
  opening_hours: Record<string, unknown> | null
  avg_rating: number
  review_count: number
  is_verified: boolean
  is_active: boolean
  subscription_tier: string
  created_at: string
  updated_at: string
  // Computed
  tagline?: string
}

export interface ManagedService {
  id: string
  salon_id: string
  name: string
  description: string | null
  category: string | null
  duration_minutes: number
  price_cents: number
  currency: string
  is_active: boolean
  sort_order: number
  created_at: string
}

interface ProviderManagementState {
  providers: ManagedProvider[]
  services: ManagedService[]
  loading: boolean
  loadingServices: boolean
  error: string | null
  searchQuery: string
  selectedProviderId: string | null

  loadProviders: () => Promise<void>
  addProvider: (data: Partial<ManagedProvider>) => Promise<boolean>
  updateProvider: (id: string, data: Partial<ManagedProvider>) => Promise<boolean>
  deleteProvider: (id: string) => Promise<boolean>
  toggleLive: (id: string) => Promise<boolean>
  toggleVerified: (id: string) => Promise<boolean>
  setSearchQuery: (q: string) => void
  setSelectedProvider: (id: string | null) => void
  getFilteredProviders: () => ManagedProvider[]
  uploadImage: (file: File, path: string) => Promise<string | null>

  // Service management
  loadServicesForProvider: (providerId: string) => Promise<void>
  addService: (providerId: string, data: Partial<ManagedService>) => Promise<boolean>
  updateService: (serviceId: string, data: Partial<ManagedService>) => Promise<boolean>
  deleteService: (serviceId: string) => Promise<boolean>
}

export const useProviderManagementStore = create<ProviderManagementState>((set, get) => ({
  providers: [],
  services: [],
  loading: false,
  loadingServices: false,
  error: null,
  searchQuery: '',
  selectedProviderId: null,

  loadProviders: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('salons')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      providers: (data || []).map((p: Record<string, unknown>) => ({
        id: p.id as string,
        owner_id: p.owner_id as string,
        name: p.name as string,
        slug: p.slug as string | null,
        category: p.category as string,
        description: p.description as string | null,
        phone: p.phone as string | null,
        email: p.email as string | null,
        website: p.website as string | null,
        street: p.street as string | null,
        house_number: p.house_number as string | null,
        postal_code: p.postal_code as string | null,
        city: p.city as string | null,
        state: (p.state as string) || 'Berlin',
        cover_url: p.cover_url as string | null,
        logo_url: p.logo_url as string | null,
        gallery: (p.gallery as string[]) || null,
        opening_hours: (p.opening_hours as Record<string, unknown>) || null,
        avg_rating: (p.avg_rating as number) || 0,
        review_count: (p.review_count as number) || 0,
        is_verified: (p.is_verified as boolean) || false,
        is_active: (p.is_active as boolean) ?? true,
        subscription_tier: (p.subscription_tier as string) || 'starter',
        created_at: p.created_at as string,
        updated_at: p.updated_at as string,
      })),
      loading: false,
    })
  },

  addProvider: async (data) => {
    const { error } = await supabase
      .from('salons')
      .insert({
        owner_id: data.owner_id || '',
        name: data.name || '',
        category: data.category || 'barber',
        description: data.description || null,
        phone: data.phone || null,
        email: data.email || null,
        street: data.street || null,
        house_number: data.house_number || null,
        postal_code: data.postal_code || null,
        city: data.city || 'Berlin',
        state: data.state || 'Berlin',
        subscription_tier: data.subscription_tier || 'starter',
        is_active: data.is_active ?? true,
      } as never)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadProviders()
    return true
  },

  updateProvider: async (id, data) => {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.category !== undefined) updateData.category = data.category
    if (data.description !== undefined) updateData.description = data.description
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.email !== undefined) updateData.email = data.email
    if (data.street !== undefined) updateData.street = data.street
    if (data.house_number !== undefined) updateData.house_number = data.house_number
    if (data.postal_code !== undefined) updateData.postal_code = data.postal_code
    if (data.city !== undefined) updateData.city = data.city
    if (data.state !== undefined) updateData.state = data.state
    if (data.subscription_tier !== undefined) updateData.subscription_tier = data.subscription_tier
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.is_verified !== undefined) updateData.is_verified = data.is_verified
    if (data.website !== undefined) updateData.website = data.website
    if (data.cover_url !== undefined) updateData.cover_url = data.cover_url
    if (data.logo_url !== undefined) updateData.logo_url = data.logo_url
    if (data.gallery !== undefined) updateData.gallery = data.gallery
    if (data.opening_hours !== undefined) updateData.opening_hours = data.opening_hours

    const { error } = await supabase
      .from('salons')
      .update(updateData as never)
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadProviders()
    return true
  },

  deleteProvider: async (id) => {
    const { error } = await supabase
      .from('salons')
      .delete()
      .eq('id', id)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadProviders()
    return true
  },

  toggleLive: async (id) => {
    const p = get().providers.find(x => x.id === id)
    if (!p) return false
    return get().updateProvider(id, { is_active: !p.is_active })
  },

  toggleVerified: async (id) => {
    const p = get().providers.find(x => x.id === id)
    if (!p) return false
    return get().updateProvider(id, { is_verified: !p.is_verified })
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedProvider: (id) => {
    set({ selectedProviderId: id, services: [] })
    if (id) get().loadServicesForProvider(id)
  },

  getFilteredProviders: () => {
    const { providers, searchQuery } = get()
    if (!searchQuery.trim()) return providers
    const q = searchQuery.toLowerCase()
    return providers.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    )
  },

  // ─── Services ───
  loadServicesForProvider: async (providerId) => {
    set({ loadingServices: true })
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('salon_id', providerId)
      .order('sort_order', { ascending: true })

    if (error) {
      set({ loadingServices: false, error: error.message })
      return
    }

    set({
      services: (data || []).map((s: Record<string, unknown>) => ({
        id: s.id as string,
        salon_id: s.salon_id as string,
        name: s.name as string,
        description: s.description as string | null,
        category: s.category as string | null,
        duration_minutes: (s.duration_minutes as number) || 30,
        price_cents: (s.price_cents as number) || 0,
        currency: (s.currency as string) || 'EUR',
        is_active: (s.is_active as boolean) ?? true,
        sort_order: (s.sort_order as number) || 0,
        created_at: s.created_at as string,
      })),
      loadingServices: false,
    })
  },

  addService: async (providerId, data) => {
    const { error } = await supabase
      .from('services')
      .insert({
        salon_id: providerId,
        name: data.name || '',
        description: data.description || null,
        category: data.category || null,
        duration_minutes: data.duration_minutes || 30,
        price_cents: data.price_cents || 0,
        currency: 'EUR',
        is_active: data.is_active ?? true,
        sort_order: data.sort_order || 0,
      } as never)

    if (error) {
      set({ error: error.message })
      return false
    }
    await get().loadServicesForProvider(providerId)
    return true
  },

  updateService: async (serviceId, data) => {
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.category !== undefined) updateData.category = data.category
    if (data.duration_minutes !== undefined) updateData.duration_minutes = data.duration_minutes
    if (data.price_cents !== undefined) updateData.price_cents = data.price_cents
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.sort_order !== undefined) updateData.sort_order = data.sort_order

    const { error } = await supabase
      .from('services')
      .update(updateData as never)
      .eq('id', serviceId)

    if (error) {
      set({ error: error.message })
      return false
    }

    const pid = get().selectedProviderId
    if (pid) await get().loadServicesForProvider(pid)
    return true
  },

  deleteService: async (serviceId) => {
    const pid = get().selectedProviderId
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      set({ error: error.message })
      return false
    }
    if (pid) await get().loadServicesForProvider(pid)
    return true
  },

  uploadImage: async (file, path) => {
    const { data, error } = await supabase.storage
      .from('salon-images')
      .upload(path, file, { upsert: true })

    if (error) {
      set({ error: error.message })
      return null
    }

    const { data: urlData } = supabase.storage
      .from('salon-images')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  },
}))
