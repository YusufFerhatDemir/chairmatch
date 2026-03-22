import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { isInvestorOrAbove } from '@/lib/rbac'

export async function GET() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!isInvestorOrAbove(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  const [
    { count: userCount },
    { count: salonCount },
    { count: bookingCount },
    { count: verifiedSalonCount },
    { count: providerCount },
    { count: orderCount },
    { count: reviewCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('salons').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'anbieter'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('reviews').select('*', { count: 'exact', head: true }),
  ])

  // Revenue
  const { data: paidBookings } = await supabase.from('bookings').select('price_cents').eq('payment_status', 'paid')
  const bookingRevenue = (paidBookings || []).reduce((s, b) => s + (Number(b.price_cents) || 0), 0) / 100

  const { data: paidOrders } = await supabase.from('orders').select('total_cents').eq('payment_status', 'paid')
  const orderRevenue = (paidOrders || []).reduce((s, o) => s + (Number(o.total_cents) || 0), 0) / 100

  // Monthly user growth (last 6 months)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: recentUsers } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', sixMonthsAgo.toISOString())
    .order('created_at')

  const userGrowth: Record<string, number> = {}
  for (const u of recentUsers || []) {
    const key = u.created_at.slice(0, 7)
    userGrowth[key] = (userGrowth[key] || 0) + 1
  }

  // Cities
  const { data: salonCities } = await supabase
    .from('salons')
    .select('city')
    .not('city', 'is', null)

  const citySet = new Set((salonCities || []).map(s => s.city).filter(Boolean))

  // Categories
  const { data: salonCategories } = await supabase
    .from('salons')
    .select('category')
    .not('category', 'is', null)

  const catSet = new Set((salonCategories || []).map(s => s.category).filter(Boolean))

  return NextResponse.json({
    platform: {
      users: userCount ?? 0,
      salons: salonCount ?? 0,
      verifiedSalons: verifiedSalonCount ?? 0,
      providers: providerCount ?? 0,
      bookings: bookingCount ?? 0,
      orders: orderCount ?? 0,
      reviews: reviewCount ?? 0,
      cities: citySet.size,
      categories: catSet.size,
    },
    revenue: {
      bookingRevenue,
      orderRevenue,
      totalRevenue: bookingRevenue + orderRevenue,
    },
    growth: {
      userGrowth,
    },
  })
}
