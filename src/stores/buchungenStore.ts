import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface AdminBooking {
  id: string
  customer_id: string
  salon_id: string
  service_id: string
  staff_id: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: string
  price_cents: number
  notes: string | null
  created_at: string
  // Joined
  customer_name: string | null
  customer_email: string | null
  salon_name: string | null
  service_name: string | null
  service_duration: number | null
}

interface CalendarDay {
  date: string
  count: number
  revenue: number
}

interface BuchungenState {
  bookings: AdminBooking[]
  calendarDays: CalendarDay[]
  loading: boolean
  error: string | null

  // Filters
  dateFilter: string // 'all' | 'today' | 'week' | 'month' | specific date
  statusFilter: string // 'all' | 'confirmed' | 'pending' | 'cancelled'
  searchQuery: string

  loadBookings: () => Promise<void>
  updateStatus: (id: string, status: string) => Promise<boolean>
  setDateFilter: (f: string) => void
  setStatusFilter: (f: string) => void
  setSearchQuery: (q: string) => void
  getFiltered: () => AdminBooking[]
  getCalendarDays: (yearMonth: string) => CalendarDay[]
}

const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().split('T')[0] }
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] }

export const useBuchungenStore = create<BuchungenState>((set, get) => ({
  bookings: [],
  calendarDays: [],
  loading: false,
  error: null,
  dateFilter: 'all',
  statusFilter: 'all',
  searchQuery: '',

  loadBookings: async () => {
    set({ loading: true, error: null })

    // Load bookings with joined data
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:profiles!customer_id(full_name, email),
        salon:salons(name),
        service:services(name, duration_minutes)
      `)
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })
      .limit(500)

    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    const bookings: AdminBooking[] = (data || []).map((b: Record<string, unknown>) => {
      const customer = b.customer as Record<string, unknown> | null
      const salon = b.salon as Record<string, unknown> | null
      const service = b.service as Record<string, unknown> | null
      return {
        id: b.id as string,
        customer_id: b.customer_id as string,
        salon_id: b.salon_id as string,
        service_id: b.service_id as string,
        staff_id: b.staff_id as string | null,
        booking_date: b.booking_date as string,
        start_time: b.start_time as string,
        end_time: b.end_time as string,
        status: b.status as string,
        price_cents: (b.price_cents as number) || 0,
        notes: b.notes as string | null,
        created_at: b.created_at as string,
        customer_name: customer?.full_name as string | null,
        customer_email: customer?.email as string | null,
        salon_name: salon?.name as string | null,
        service_name: service?.name as string | null,
        service_duration: service?.duration_minutes as number | null,
      }
    })

    // Build calendar data
    const dayMap: Record<string, { count: number; revenue: number }> = {}
    for (const b of bookings) {
      if (!dayMap[b.booking_date]) dayMap[b.booking_date] = { count: 0, revenue: 0 }
      dayMap[b.booking_date].count++
      if (b.status !== 'cancelled') dayMap[b.booking_date].revenue += b.price_cents
    }
    const calendarDays = Object.entries(dayMap).map(([date, d]) => ({
      date, count: d.count, revenue: d.revenue,
    }))

    set({ bookings, calendarDays, loading: false })
  },

  updateStatus: async (id, status) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status } as never)
      .eq('id', id)

    if (error) { set({ error: error.message }); return false }

    set((s) => ({
      bookings: s.bookings.map(b =>
        b.id === id ? { ...b, status } : b
      ),
    }))
    return true
  },

  setDateFilter: (f) => set({ dateFilter: f }),
  setStatusFilter: (f) => set({ statusFilter: f }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  getFiltered: () => {
    const { bookings, dateFilter, statusFilter, searchQuery } = get()
    let filtered = bookings

    // Date filter
    if (dateFilter === 'today') {
      filtered = filtered.filter(b => b.booking_date === today())
    } else if (dateFilter === 'week') {
      filtered = filtered.filter(b => b.booking_date >= weekAgo())
    } else if (dateFilter === 'month') {
      filtered = filtered.filter(b => b.booking_date >= monthAgo())
    } else if (dateFilter !== 'all' && dateFilter.includes('-')) {
      filtered = filtered.filter(b => b.booking_date === dateFilter)
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(b =>
        (b.customer_name?.toLowerCase().includes(q)) ||
        (b.customer_email?.toLowerCase().includes(q)) ||
        (b.salon_name?.toLowerCase().includes(q)) ||
        (b.service_name?.toLowerCase().includes(q))
      )
    }

    return filtered
  },

  getCalendarDays: (yearMonth) => {
    return get().calendarDays.filter(d => d.date.startsWith(yearMonth))
  },
}))
