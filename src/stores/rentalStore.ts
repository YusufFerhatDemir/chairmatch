import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface RentalEquipment {
  id: string
  salon_id: string
  type: 'stuhl' | 'liege' | 'raum' | 'opraum'
  name: string
  description: string | null
  price_per_day_cents: number
  price_per_month_cents: number | null
  is_available: boolean
  images: string[]
  created_at: string
  // Joined salon data (optional)
  salon_name?: string
  salon_city?: string
  salon_category?: string
  salon_rating?: number
}

export interface RentalBooking {
  id: string
  equipment_id: string
  renter_id: string
  start_date: string
  end_date: string
  total_cents: number
  status: string
  created_at: string
}

const RENTAL_TYPE_LABELS: Record<string, string> = {
  stuhl: 'Barber-Stuhl / Arbeitsplatz',
  liege: 'Massage- / Kosmetik-Liege',
  raum: 'Behandlungsraum / Kabine',
  opraum: 'OP-Raum (steril)',
}

export { RENTAL_TYPE_LABELS }

interface RentalState {
  equipment: RentalEquipment[]
  myEquipment: RentalEquipment[]
  bookings: RentalBooking[]
  loading: boolean
  error: string | null
  searchQuery: string
  typeFilter: string

  // Browse (for customers/B2B renters)
  loadAllAvailable: () => Promise<void>
  setSearchQuery: (q: string) => void
  setTypeFilter: (t: string) => void
  getFiltered: () => RentalEquipment[]

  // Provider management
  loadMyEquipment: (salonId: string) => Promise<void>
  addEquipment: (data: Partial<RentalEquipment>) => Promise<boolean>
  updateEquipment: (id: string, data: Partial<RentalEquipment>) => Promise<boolean>
  deleteEquipment: (id: string) => Promise<boolean>
  toggleAvailable: (id: string) => Promise<boolean>

  // Booking
  loadBookings: (userId: string) => Promise<void>
  createBooking: (data: Partial<RentalBooking>) => Promise<boolean>
}

export const useRentalStore = create<RentalState>((set, get) => ({
  equipment: [],
  myEquipment: [],
  bookings: [],
  loading: false,
  error: null,
  searchQuery: '',
  typeFilter: 'all',

  loadAllAvailable: async () => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('rental_equipment')
      .select('*, salon:salons(name, city, category, avg_rating)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      equipment: (data || []).map((e: Record<string, unknown>) => {
        const salon = e.salon as Record<string, unknown> | null
        return {
          id: e.id as string,
          salon_id: e.salon_id as string,
          type: e.type as RentalEquipment['type'],
          name: e.name as string,
          description: e.description as string | null,
          price_per_day_cents: (e.price_per_day_cents as number) || 0,
          price_per_month_cents: e.price_per_month_cents as number | null,
          is_available: true,
          images: (e.images as string[]) || [],
          created_at: e.created_at as string,
          salon_name: salon?.name as string | undefined,
          salon_city: salon?.city as string | undefined,
          salon_category: salon?.category as string | undefined,
          salon_rating: salon?.avg_rating as number | undefined,
        }
      }),
      loading: false,
    })
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setTypeFilter: (t) => set({ typeFilter: t }),

  getFiltered: () => {
    const { equipment, searchQuery, typeFilter } = get()
    let filtered = equipment
    if (typeFilter !== 'all') {
      filtered = filtered.filter(e => e.type === typeFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.salon_name?.toLowerCase().includes(q) ||
        e.salon_city?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      )
    }
    return filtered
  },

  loadMyEquipment: async (salonId) => {
    set({ loading: true, error: null })
    const { data, error } = await supabase
      .from('rental_equipment')
      .select('*')
      .eq('salon_id', salonId)
      .order('type')

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      myEquipment: (data || []).map((e: Record<string, unknown>) => ({
        id: e.id as string,
        salon_id: e.salon_id as string,
        type: e.type as RentalEquipment['type'],
        name: e.name as string,
        description: e.description as string | null,
        price_per_day_cents: (e.price_per_day_cents as number) || 0,
        price_per_month_cents: e.price_per_month_cents as number | null,
        is_available: (e.is_available as boolean) ?? true,
        images: (e.images as string[]) || [],
        created_at: e.created_at as string,
      })),
      loading: false,
    })
  },

  addEquipment: async (data) => {
    const { error } = await supabase
      .from('rental_equipment')
      .insert({
        salon_id: data.salon_id || '',
        type: data.type || 'stuhl',
        name: data.name || '',
        description: data.description || null,
        price_per_day_cents: data.price_per_day_cents || 0,
        price_per_month_cents: data.price_per_month_cents || null,
        is_available: data.is_available ?? true,
        images: data.images || [],
      } as never)

    if (error) { set({ error: error.message }); return false }
    if (data.salon_id) await get().loadMyEquipment(data.salon_id)
    return true
  },

  updateEquipment: async (id, data) => {
    const ud: Record<string, unknown> = {}
    if (data.type !== undefined) ud.type = data.type
    if (data.name !== undefined) ud.name = data.name
    if (data.description !== undefined) ud.description = data.description
    if (data.price_per_day_cents !== undefined) ud.price_per_day_cents = data.price_per_day_cents
    if (data.price_per_month_cents !== undefined) ud.price_per_month_cents = data.price_per_month_cents
    if (data.is_available !== undefined) ud.is_available = data.is_available
    if (data.images !== undefined) ud.images = data.images

    const { error } = await supabase
      .from('rental_equipment')
      .update(ud as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }

    const eq = get().myEquipment.find(e => e.id === id)
    if (eq) await get().loadMyEquipment(eq.salon_id)
    return true
  },

  deleteEquipment: async (id) => {
    const eq = get().myEquipment.find(e => e.id === id)
    const { error } = await supabase.from('rental_equipment').delete().eq('id', id)
    if (error) { set({ error: error.message }); return false }
    if (eq) await get().loadMyEquipment(eq.salon_id)
    return true
  },

  toggleAvailable: async (id) => {
    const eq = get().myEquipment.find(e => e.id === id)
    if (!eq) return false
    return get().updateEquipment(id, { is_available: !eq.is_available })
  },

  loadBookings: async (userId) => {
    const { data, error } = await supabase
      .from('rental_bookings')
      .select('*')
      .eq('renter_id', userId)
      .order('created_at', { ascending: false })

    if (error) { set({ error: error.message }); return }

    set({
      bookings: (data || []).map((b: Record<string, unknown>) => ({
        id: b.id as string,
        equipment_id: b.equipment_id as string,
        renter_id: b.renter_id as string,
        start_date: b.start_date as string,
        end_date: b.end_date as string,
        total_cents: (b.total_cents as number) || 0,
        status: (b.status as string) || 'pending',
        created_at: b.created_at as string,
      })),
    })
  },

  createBooking: async (data) => {
    const { error } = await supabase
      .from('rental_bookings')
      .insert({
        equipment_id: data.equipment_id || '',
        renter_id: data.renter_id || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        total_cents: data.total_cents || 0,
        status: 'pending',
      } as never)

    if (error) { set({ error: error.message }); return false }
    if (data.renter_id) await get().loadBookings(data.renter_id)
    return true
  },
}))
