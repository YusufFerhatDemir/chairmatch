import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Booking, Service, Staff } from '../lib/types'

interface BookingState {
  // Booking flow
  step: number
  selectedService: Service | null
  selectedDay: number | string
  selectedSlot: string | null
  selectedStaff: Staff | null
  customerName: string
  customerEmail: string
  customerPhone: string
  customerNotes: string
  promoCode: string
  promoValid: boolean | null
  promoDiscount: number
  promoType: 'percent' | 'fixed' | null
  bookingDone: boolean

  // Booking history
  bookings: Booking[]
  loadingBookings: boolean

  // Actions
  setStep: (step: number) => void
  setSelectedService: (service: Service | null) => void
  setSelectedDay: (day: number | string) => void
  setSelectedSlot: (slot: string | null) => void
  setSelectedStaff: (staff: Staff | null) => void
  setService: (service: Service | null) => void
  setDay: (day: number | string) => void
  setSlot: (slot: string | null) => void
  setCustomerName: (name: string) => void
  setCustomerEmail: (email: string) => void
  setCustomerPhone: (phone: string) => void
  setCustomerNotes: (notes: string) => void
  setPromoCode: (code: string) => void
  applyPromo: (code: string) => Promise<boolean>
  resetBooking: () => void
  submitBooking: (salonId: string, userId: string) => Promise<string | null>
  loadBookings: (userId: string) => Promise<void>
  cancelBooking: (bookingId: string) => Promise<string | null>
}

export const useBookingStore = create<BookingState>((set, get) => ({
  step: 1,
  selectedService: null,
  selectedDay: 0,
  selectedSlot: null,
  selectedStaff: null,
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  customerNotes: '',
  promoCode: '',
  promoValid: null,
  promoDiscount: 0,
  promoType: null,
  bookingDone: false,
  bookings: [],
  loadingBookings: false,

  setStep: (step) => set({ step }),
  setSelectedService: (selectedService) => set({ selectedService }),
  setSelectedDay: (selectedDay) => set({ selectedDay }),
  setSelectedSlot: (selectedSlot) => set({ selectedSlot }),
  setSelectedStaff: (selectedStaff) => set({ selectedStaff }),
  setService: (selectedService) => set({ selectedService }),
  setDay: (selectedDay) => set({ selectedDay }),
  setSlot: (selectedSlot) => set({ selectedSlot }),
  setCustomerName: (customerName) => set({ customerName }),
  setCustomerEmail: (customerEmail) => set({ customerEmail }),
  setCustomerPhone: (customerPhone) => set({ customerPhone }),
  setCustomerNotes: (customerNotes) => set({ customerNotes }),
  setPromoCode: (promoCode) => set({ promoCode }),

  applyPromo: async (code) => {
    const upper = code.toUpperCase()
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', upper)
      .eq('is_active', true)
      .single()

    if (data) {
      const d = data as Record<string, unknown>
      const discount = Number(d.discount) || 0
      const promoType = (d.type as string) === 'fixed' ? 'fixed' as const : 'percent' as const
      const maxUses = d.max_uses as number | null
      const usedCount = (d.used_count as number) || 0
      const expiresAt = d.expires_at as string | null

      // Check expiry and usage limits
      if (expiresAt && new Date(expiresAt) < new Date()) {
        set({ promoValid: false, promoDiscount: 0, promoType: null })
        return false
      }
      if (maxUses !== null && usedCount >= maxUses) {
        set({ promoValid: false, promoDiscount: 0, promoType: null })
        return false
      }

      set({ promoValid: true, promoDiscount: discount, promoType, promoCode: upper })
      return true
    }
    set({ promoValid: false, promoDiscount: 0, promoType: null })
    return false
  },

  resetBooking: () => set({
    step: 1,
    selectedService: null,
    selectedDay: 0,
    selectedSlot: null,
    selectedStaff: null,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerNotes: '',
    promoCode: '',
    promoValid: null,
    promoDiscount: 0,
    promoType: null,
    bookingDone: false,
  }),

  submitBooking: async (salonId, userId) => {
    const s = get()
    if (!s.selectedService || !s.selectedSlot) return 'Missing data'

    const bookingDate = typeof s.selectedDay === 'string'
      ? new Date(s.selectedDay)
      : (() => { const d = new Date(); d.setDate(d.getDate() + s.selectedDay); return d })()

    const [h, m] = s.selectedSlot.split(':').map(Number)
    const endMinutes = h * 60 + m + s.selectedService.duration_minutes
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`

    let priceCents = s.selectedService.price_cents
    if (s.promoValid && s.promoDiscount > 0) {
      if (s.promoType === 'percent') {
        priceCents = Math.round(priceCents * (1 - s.promoDiscount / 100))
      } else {
        priceCents = Math.max(0, priceCents - s.promoDiscount * 100)
      }
    }

    const { error } = await (supabase.from('bookings') as any).insert({
      customer_id: userId,
      salon_id: salonId,
      service_id: s.selectedService.id,
      staff_id: s.selectedStaff?.id || null,
      booking_date: bookingDate.toISOString().split('T')[0],
      start_time: s.selectedSlot + ':00',
      end_time: endTime + ':00',
      price_cents: priceCents,
      notes: s.customerNotes || null,
    })

    if (error) return error.message
    set({ bookingDone: true })
    return null
  },

  loadBookings: async (userId) => {
    set({ loadingBookings: true })
    const { data } = await supabase
      .from('bookings')
      .select('*, salon:salons(name, category), service:services(name, duration_minutes)')
      .eq('customer_id', userId)
      .order('booking_date', { ascending: false })

    if (data) set({ bookings: data as unknown as Booking[] })
    set({ loadingBookings: false })
  },

  cancelBooking: async (bookingId) => {
    const { error } = await (supabase
      .from('bookings') as any)
      .update({ status: 'cancelled' })
      .eq('id', bookingId)

    if (error) return error.message

    set((s) => ({
      bookings: s.bookings.map((b) =>
        b.id === bookingId ? { ...b, status: 'cancelled' as const } : b
      ),
    }))
    return null
  },
}))
