import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

export async function GET() {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  try {
    // --- Revenue by month (last 12 months) ---
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const { data: payments } = await supabase
      .from('bookings')
      .select('price_cents, created_at, status')
      .gte('created_at', twelveMonthsAgo.toISOString())

    const revenueByMonth: Record<string, number> = {}
    const bookingsByMonth: Record<string, number> = {}
    const bookingsByStatus: Record<string, number> = {}

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      revenueByMonth[key] = 0
      bookingsByMonth[key] = 0
    }

    for (const b of payments ?? []) {
      const date = new Date(b.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in revenueByMonth) {
        revenueByMonth[key] += (Number(b.price_cents) || 0) / 100
        bookingsByMonth[key] += 1
      }
      const status = b.status || 'unknown'
      bookingsByStatus[status] = (bookingsByStatus[status] || 0) + 1
    }

    const totalRevenue = Object.values(revenueByMonth).reduce((a, b) => a + b, 0)
    const totalBookings = (payments ?? []).length

    // --- Bookings: last 30 days (daily) ---
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: recentBookings } = await supabase
      .from('bookings')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const bookingsByDay: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      bookingsByDay[key] = 0
    }
    for (const b of recentBookings ?? []) {
      const key = new Date(b.created_at).toISOString().slice(0, 10)
      if (key in bookingsByDay) {
        bookingsByDay[key] += 1
      }
    }

    // --- Users ---
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, created_at, is_active')

    const usersByRole: Record<string, number> = {}
    const userGrowth: Record<string, number> = {}
    const activeUsers = (profiles ?? []).filter((p: { is_active?: boolean }) => p.is_active !== false).length

    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      userGrowth[key] = 0
    }

    for (const p of profiles ?? []) {
      const role = (p as { role?: string }).role || 'kunde'
      usersByRole[role] = (usersByRole[role] || 0) + 1

      const date = new Date(p.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in userGrowth) {
        userGrowth[key] += 1
      }
    }

    // --- Providers ---
    const { data: salons } = await supabase
      .from('salons')
      .select('id, is_active, is_verified')

    const activeProviders = (salons ?? []).filter((s: { is_active?: boolean }) => s.is_active).length
    const verifiedProviders = (salons ?? []).filter((s: { is_verified?: boolean }) => s.is_verified).length
    const totalProviders = (salons ?? []).length

    // --- Reviews ---
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating, created_at, salon_id')

    const avgRating = reviews?.length
      ? reviews.reduce((sum: number, r: { rating?: number }) => sum + (r.rating ?? 0), 0) / reviews.length
      : 0

    const reviewsByMonth: Record<string, number> = {}
    for (let i = 11; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      reviewsByMonth[key] = 0
    }
    for (const r of reviews ?? []) {
      const date = new Date(r.created_at)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (key in reviewsByMonth) {
        reviewsByMonth[key] += 1
      }
    }

    // --- Compliance: documents submitted vs required ---
    const { data: documents } = await supabase
      .from('compliance_documents')
      .select('salon_id, status')

    const docsPerSalon: Record<string, { submitted: number; approved: number }> = {}
    for (const doc of documents ?? []) {
      const sid = (doc as { salon_id: string }).salon_id
      if (!docsPerSalon[sid]) docsPerSalon[sid] = { submitted: 0, approved: 0 }
      docsPerSalon[sid].submitted += 1
      if ((doc as { status?: string }).status === 'approved') {
        docsPerSalon[sid].approved += 1
      }
    }

    const REQUIRED_DOCS = 3 // Gewerbeanmeldung, Hygienezertifikat, Haftpflicht
    let compliantCount = 0
    for (const sid of Object.keys(docsPerSalon)) {
      if (docsPerSalon[sid].approved >= REQUIRED_DOCS) {
        compliantCount += 1
      }
    }
    const complianceRate = totalProviders > 0
      ? Math.round((compliantCount / totalProviders) * 100)
      : 0

    // --- Top 10 salons by revenue ---
    const { data: allBookingsForRevenue } = await supabase
      .from('bookings')
      .select('salon_id, price_cents')
      .in('status', ['completed', 'confirmed'])

    const revenueBySalon: Record<string, number> = {}
    for (const b of allBookingsForRevenue ?? []) {
      const sid = b.salon_id
      revenueBySalon[sid] = (revenueBySalon[sid] || 0) + (Number(b.price_cents) || 0) / 100
    }
    const topSalonIdsByRevenue = Object.entries(revenueBySalon)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, revenue]) => ({ id, revenue }))

    const topRevenueIds = topSalonIdsByRevenue.map(s => s.id)
    const { data: topRevenueNames } = topRevenueIds.length > 0
      ? await supabase.from('salons').select('id, name').in('id', topRevenueIds)
      : { data: [] }
    const revenueNameMap = new Map((topRevenueNames ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

    const topSalonsByRevenue = topSalonIdsByRevenue.map(s => ({
      id: s.id,
      name: revenueNameMap.get(s.id) || s.id.slice(0, 8),
      revenue: Math.round(s.revenue * 100) / 100,
    }))

    // --- Top 10 salons by rating ---
    const ratingBySalon: Record<string, { sum: number; count: number }> = {}
    for (const r of reviews ?? []) {
      const sid = (r as { salon_id: string }).salon_id
      if (!ratingBySalon[sid]) ratingBySalon[sid] = { sum: 0, count: 0 }
      ratingBySalon[sid].sum += r.rating ?? 0
      ratingBySalon[sid].count += 1
    }
    const topSalonIdsByRating = Object.entries(ratingBySalon)
      .filter(([, v]) => v.count >= 1)
      .map(([id, v]) => ({ id, avg: v.sum / v.count, count: v.count }))
      .sort((a, b) => b.avg - a.avg || b.count - a.count)
      .slice(0, 10)

    const topRatingIds = topSalonIdsByRating.map(s => s.id)
    const { data: topRatingNames } = topRatingIds.length > 0
      ? await supabase.from('salons').select('id, name').in('id', topRatingIds)
      : { data: [] }
    const ratingNameMap = new Map((topRatingNames ?? []).map((s: { id: string; name: string }) => [s.id, s.name]))

    const topSalonsByRating = topSalonIdsByRating.map(s => ({
      id: s.id,
      name: ratingNameMap.get(s.id) || s.id.slice(0, 8),
      avgRating: Math.round(s.avg * 10) / 10,
      reviewCount: s.count,
    }))

    // --- Conversion rate ---
    const completedBookings = (payments ?? []).filter((b: { status?: string }) => b.status === 'completed').length
    const conversionRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 1000) / 10
      : 0

    return NextResponse.json({
      kpis: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalBookings,
        activeUsers,
        activeProviders,
        avgRating: Math.round(avgRating * 10) / 10,
        conversionRate,
      },
      revenueByMonth,
      bookingsByMonth,
      bookingsByStatus,
      bookingsByDay,
      usersByRole,
      userGrowth,
      providers: {
        total: totalProviders,
        active: activeProviders,
        verified: verifiedProviders,
      },
      reviewsByMonth,
      compliance: {
        rate: complianceRate,
        compliant: compliantCount,
        total: totalProviders,
      },
      topSalonsByRevenue,
      topSalonsByRating,
    })
  } catch (err) {
    console.error('MIS API error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
