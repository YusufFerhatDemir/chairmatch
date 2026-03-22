export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'
import AdminDashboardClient from './AdminDashboardClient'

export default async function AdminPage() {
  await requireRole(['admin', 'super_admin'])
  const supabase = getSupabaseAdmin()

  // Parallel data fetching
  const [
    { count: userCount },
    { count: salonCount },
    { count: bookingCount },
    { count: reviewCount },
    { count: orderCount },
    { count: verifiedSalonCount },
    { count: activeUserCount },
    { count: providerCount },
    { count: pendingBookingCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'anbieter'),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // Recent bookings
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('id, booking_date, start_time, status, price_cents, created_at, salon:salons(name), service:services(name), customer:profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Recent users
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  // Revenue calculation
  const { data: paidBookings } = await supabase
    .from('bookings')
    .select('price_cents')
    .eq('payment_status', 'paid')

  const totalRevenue = (paidBookings || []).reduce((sum, b) => sum + (Number(b.price_cents) || 0), 0)

  // Unverified salons (pending verification)
  const { data: pendingSalons } = await supabase
    .from('salons')
    .select('id, name, city, category, created_at')
    .eq('is_verified', false)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <AdminDashboardClient
      stats={{
        users: userCount ?? 0,
        activeUsers: activeUserCount ?? 0,
        salons: salonCount ?? 0,
        verifiedSalons: verifiedSalonCount ?? 0,
        providers: providerCount ?? 0,
        bookings: bookingCount ?? 0,
        pendingBookings: pendingBookingCount ?? 0,
        reviews: reviewCount ?? 0,
        orders: orderCount ?? 0,
        totalRevenueCents: totalRevenue,
      }}
      recentBookings={(recentBookings || []) as Record<string, unknown>[]}
      recentUsers={(recentUsers || []) as Record<string, unknown>[]}
      pendingSalons={(pendingSalons || []) as Record<string, unknown>[]}
    />
  )
}
