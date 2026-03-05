import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export interface PlatformStats {
  // Users
  totalUsers: number
  kundeCount: number
  anbieterCount: number
  adminCount: number
  superAdminCount: number
  inactiveUsers: number

  // Providers
  totalProviders: number
  liveProviders: number
  verifiedProviders: number

  // Bookings
  totalBookings: number
  todayBookings: number
  weekBookings: number
  monthBookings: number
  cancelledBookings: number
  confirmedBookings: number

  // Revenue
  totalRevenueCents: number
  monthRevenueCents: number
  weekRevenueCents: number

  // Promo
  totalPromoCodes: number
  activePromoCodes: number
  totalPromoUsage: number

  // WhatsApp
  totalMessages: number
  sentMessages: number
  deliveredMessages: number
  failedMessages: number

  // Top providers
  topProviders: { name: string; bookings: number; revenue: number }[]
}

interface StatistikState {
  stats: PlatformStats | null
  loading: boolean
  error: string | null
  loadStats: () => Promise<void>
}

const today = () => new Date().toISOString().split('T')[0]
const weekAgo = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
const monthAgo = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().split('T')[0]
}

export const useStatistikStore = create<StatistikState>((set) => ({
  stats: null,
  loading: false,
  error: null,

  loadStats: async () => {
    set({ loading: true, error: null })
    try {
      // Users
      const { data: users } = await supabase.from('profiles').select('role, is_active')
      const userList = (users || []) as { role: string; is_active: boolean }[]
      const totalUsers = userList.length
      const kundeCount = userList.filter(u => u.role === 'kunde').length
      const anbieterCount = userList.filter(u => u.role === 'anbieter').length
      const adminCount = userList.filter(u => u.role === 'admin').length
      const superAdminCount = userList.filter(u => u.role === 'super_admin').length
      const inactiveUsers = userList.filter(u => !u.is_active).length

      // Providers
      const { data: providers } = await supabase.from('salons').select('is_live, is_verified')
      const provList = (providers || []) as { is_live: boolean; is_verified: boolean }[]
      const totalProviders = provList.length
      const liveProviders = provList.filter(p => p.is_live).length
      const verifiedProviders = provList.filter(p => p.is_verified).length

      // Bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('booking_date, status, price_cents, salon_id')
      const bookList = (bookings || []) as { booking_date: string; status: string; price_cents: number; salon_id: string }[]
      const totalBookings = bookList.length
      const todayBookings = bookList.filter(b => b.booking_date === today()).length
      const weekBookings = bookList.filter(b => b.booking_date >= weekAgo()).length
      const monthBookings = bookList.filter(b => b.booking_date >= monthAgo()).length
      const cancelledBookings = bookList.filter(b => b.status === 'cancelled').length
      const confirmedBookings = bookList.filter(b => b.status === 'confirmed').length

      // Revenue
      const activeBookings = bookList.filter(b => b.status !== 'cancelled')
      const totalRevenueCents = activeBookings.reduce((s, b) => s + (b.price_cents || 0), 0)
      const monthRevenueCents = activeBookings
        .filter(b => b.booking_date >= monthAgo())
        .reduce((s, b) => s + (b.price_cents || 0), 0)
      const weekRevenueCents = activeBookings
        .filter(b => b.booking_date >= weekAgo())
        .reduce((s, b) => s + (b.price_cents || 0), 0)

      // Top providers (by booking count)
      const provMap: Record<string, { bookings: number; revenue: number }> = {}
      for (const b of activeBookings) {
        if (!provMap[b.salon_id]) provMap[b.salon_id] = { bookings: 0, revenue: 0 }
        provMap[b.salon_id].bookings++
        provMap[b.salon_id].revenue += b.price_cents || 0
      }
      const { data: salonNames } = await supabase.from('salons').select('id, name')
      const nameMap: Record<string, string> = {}
      for (const s of (salonNames || []) as { id: string; name: string }[]) {
        nameMap[s.id] = s.name
      }
      const topProviders = Object.entries(provMap)
        .map(([id, d]) => ({ name: nameMap[id] || id, bookings: d.bookings, revenue: d.revenue }))
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5)

      // Promo codes
      const { data: promos } = await supabase.from('promo_codes').select('is_active, used_count')
      const promoList = (promos || []) as { is_active: boolean; used_count: number }[]
      const totalPromoCodes = promoList.length
      const activePromoCodes = promoList.filter(p => p.is_active).length
      const totalPromoUsage = promoList.reduce((s, p) => s + (p.used_count || 0), 0)

      // WhatsApp
      const { data: waMsgs } = await supabase.from('whatsapp_messages').select('status')
      const waList = (waMsgs || []) as { status: string }[]
      const totalMessages = waList.length
      const sentMessages = waList.filter(m => m.status === 'sent').length
      const deliveredMessages = waList.filter(m => m.status === 'delivered').length
      const failedMessages = waList.filter(m => m.status === 'failed').length

      set({
        stats: {
          totalUsers, kundeCount, anbieterCount, adminCount, superAdminCount, inactiveUsers,
          totalProviders, liveProviders, verifiedProviders,
          totalBookings, todayBookings, weekBookings, monthBookings, cancelledBookings, confirmedBookings,
          totalRevenueCents, monthRevenueCents, weekRevenueCents,
          totalPromoCodes, activePromoCodes, totalPromoUsage,
          totalMessages, sentMessages, deliveredMessages, failedMessages,
          topProviders,
        },
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: String(err) })
    }
  },
}))
