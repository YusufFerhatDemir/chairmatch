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

    // --- Booking Funnel (letzte 30 Tage) ---
    // Funnel-Stufen: Visit → Booking-Start → Bezahlt → Abgeschlossen
    // Visits aus analytics (best-effort, falls Tabelle existiert)
    let visitCount = 0
    try {
      const { count } = await supabase
        .from('visit_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
      visitCount = count ?? 0
    } catch {
      // visit_logs evtl. nicht vorhanden — best-effort
    }

    const recentTotalBookings = (recentBookings ?? []).length
    const recentBookingsByStatus: Record<string, number> = {}
    for (const b of recentBookings ?? []) {
      // Wir haben hier nur created_at; status aus payments via Join wäre besser.
      // Vereinfachung: alle gleich behandeln, status-spezifisches Aggregat aus bookingsByStatus
      recentBookingsByStatus['total'] = (recentBookingsByStatus['total'] || 0) + 1
    }
    const paidCount = (payments ?? []).filter((b: { status?: string }) =>
      ['confirmed', 'completed', 'paid'].includes(b.status || '')).length
    const completedRecent = (payments ?? []).filter((b: { status?: string }) =>
      b.status === 'completed').length

    const bookingFunnel = {
      visits: visitCount,
      bookingsStarted: recentTotalBookings,
      paid: paidCount,
      completed: completedRecent,
      // Conversion-Raten zwischen den Stufen
      visitToBooking: visitCount > 0
        ? Math.round((recentTotalBookings / visitCount) * 1000) / 10
        : 0,
      bookingToPaid: recentTotalBookings > 0
        ? Math.round((paidCount / recentTotalBookings) * 1000) / 10
        : 0,
      paidToCompleted: paidCount > 0
        ? Math.round((completedRecent / paidCount) * 1000) / 10
        : 0,
    }

    // --- Provider Health Score ---
    // Composite-Score 0-100 pro aktivem Anbieter:
    //   30%  Rating (avg / 5 * 30)
    //   25%  Booking-Volume (last 30d, capped bei 50 für 25 Punkte)
    //   25%  Compliance (approved docs / required)
    //   20%  Activity (booking updates in last 14d → bool)
    const providerHealthScores: { id: string; name: string; score: number; breakdown: Record<string, number> }[] = []

    if ((salons ?? []).length > 0) {
      // Bookings pro Salon last 30d
      const fourteenDaysAgo = new Date()
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)
      const { data: recentBySalon } = await supabase
        .from('bookings')
        .select('salon_id, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
      const bookingsPerSalon30d: Record<string, number> = {}
      const lastActivityPerSalon: Record<string, number> = {}
      for (const b of recentBySalon ?? []) {
        const sid = (b as { salon_id: string }).salon_id
        bookingsPerSalon30d[sid] = (bookingsPerSalon30d[sid] || 0) + 1
        const ts = new Date((b as { created_at: string }).created_at).getTime()
        lastActivityPerSalon[sid] = Math.max(lastActivityPerSalon[sid] || 0, ts)
      }

      const salonNames = new Map((salons ?? []).map((s: { id: string; name?: string }) => [s.id, s.name || s.id.slice(0, 8)]))

      for (const salon of (salons ?? []).filter((s: { is_active?: boolean }) => s.is_active)) {
        const sid = (salon as { id: string }).id
        const ratingData = ratingBySalon[sid]
        const avgR = ratingData ? ratingData.sum / ratingData.count : 0
        const ratingScore = Math.round((avgR / 5) * 30)

        const recentB = bookingsPerSalon30d[sid] || 0
        const volumeScore = Math.min(Math.round((recentB / 50) * 25), 25)

        const docs = docsPerSalon[sid] || { submitted: 0, approved: 0 }
        const complianceScore = Math.round((Math.min(docs.approved, REQUIRED_DOCS) / REQUIRED_DOCS) * 25)

        const lastTs = lastActivityPerSalon[sid] || 0
        const activeRecent = lastTs > fourteenDaysAgo.getTime()
        const activityScore = activeRecent ? 20 : 0

        const total = ratingScore + volumeScore + complianceScore + activityScore
        providerHealthScores.push({
          id: sid,
          name: salonNames.get(sid) || sid.slice(0, 8),
          score: total,
          breakdown: {
            rating: ratingScore,
            volume: volumeScore,
            compliance: complianceScore,
            activity: activityScore,
          },
        })
      }
      providerHealthScores.sort((a, b) => a.score - b.score) // niedrigste zuerst (Risk-Liste)
    }

    const atRiskProviders = providerHealthScores.filter(p => p.score < 50).slice(0, 10)

    // --- Recent Errors (last 24h) ---
    let recentErrors: { id: string; message: string; level: string; created_at: string; count?: number }[] = []
    try {
      const twentyFourHoursAgo = new Date()
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
      const { data: errors } = await supabase
        .from('error_logs')
        .select('id, message, level, created_at')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(20)
      recentErrors = (errors as { id: string; message: string; level: string; created_at: string }[]) ?? []
    } catch {
      // error_logs evtl. nicht vorhanden — best-effort
    }

    // --- Provider Onboarding Pipeline ---
    // Status-Counts: registered (signup nur), docs_uploaded, verified, active
    const onboardingPipeline = {
      registered: totalProviders - verifiedProviders,
      docsUploaded: Object.keys(docsPerSalon).length,
      verified: verifiedProviders,
      active: activeProviders,
    }

    // --- Platform Revenue (platform_transactions) ---
    interface PlatformTx {
      id: string
      type: 'booking' | 'chair_rental' | 'opraum_rental' | 'subscription' | 'affiliate' | 'refund'
      platform_fee_cents: number
      amount_cents: number
      status: 'pending' | 'succeeded' | 'failed' | 'refunded'
      created_at: string
      provider_user_id: string | null
      customer_user_id: string | null
    }

    let platformRevenue = {
      totalCommissionEur: 0,
      thisMonthEur: 0,
      todayEur: 0,
      bySource: {
        booking: 0,
        chairRental: 0,
        opraumRental: 0,
        subscription: 0,
        affiliate: 0,
      },
    }
    let recentRefunds: PlatformTx[] = []
    let platformTransactions: PlatformTx[] = []

    try {
      const { data: txs } = await supabase
        .from('platform_transactions')
        .select('id, type, platform_fee_cents, amount_cents, status, created_at, provider_user_id, customer_user_id')
        .order('created_at', { ascending: false })
        .limit(500)

      platformTransactions = (txs as PlatformTx[]) ?? []

      const now = new Date()
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const sourceMap: Record<string, keyof typeof platformRevenue.bySource> = {
        booking: 'booking',
        chair_rental: 'chairRental',
        opraum_rental: 'opraumRental',
        subscription: 'subscription',
        affiliate: 'affiliate',
      }

      for (const tx of platformTransactions) {
        if (tx.status !== 'succeeded') continue
        const feeEur = (Number(tx.platform_fee_cents) || 0) / 100
        platformRevenue.totalCommissionEur += feeEur

        const created = new Date(tx.created_at)
        if (created >= startOfMonth) platformRevenue.thisMonthEur += feeEur
        if (created >= startOfToday) platformRevenue.todayEur += feeEur

        const sourceKey = sourceMap[tx.type]
        if (sourceKey) {
          platformRevenue.bySource[sourceKey] += feeEur
        }
      }

      // Runden
      platformRevenue = {
        totalCommissionEur: Math.round(platformRevenue.totalCommissionEur * 100) / 100,
        thisMonthEur: Math.round(platformRevenue.thisMonthEur * 100) / 100,
        todayEur: Math.round(platformRevenue.todayEur * 100) / 100,
        bySource: {
          booking: Math.round(platformRevenue.bySource.booking * 100) / 100,
          chairRental: Math.round(platformRevenue.bySource.chairRental * 100) / 100,
          opraumRental: Math.round(platformRevenue.bySource.opraumRental * 100) / 100,
          subscription: Math.round(platformRevenue.bySource.subscription * 100) / 100,
          affiliate: Math.round(platformRevenue.bySource.affiliate * 100) / 100,
        },
      }

      recentRefunds = platformTransactions
        .filter(tx => tx.status === 'refunded')
        .slice(0, 10)
    } catch (err) {
      console.warn('platform_transactions noch nicht verfügbar:', err)
    }

    // Recent transactions für UI (Top 25 succeeded/pending)
    const recentTransactions = platformTransactions
      .filter(tx => tx.status !== 'failed')
      .slice(0, 25)
      .map(tx => ({
        id: tx.id,
        type: tx.type,
        amountEur: Math.round((Number(tx.amount_cents) || 0) / 100 * 100) / 100,
        platformFeeEur: Math.round((Number(tx.platform_fee_cents) || 0) / 100 * 100) / 100,
        status: tx.status,
        createdAt: tx.created_at,
      }))

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
      // Neu
      bookingFunnel,
      providerHealthScores: providerHealthScores.slice(0, 50), // Top 50 für UI
      atRiskProviders,
      recentErrors,
      onboardingPipeline,
      platformRevenue,
      recentRefunds: recentRefunds.map(r => ({
        id: r.id,
        type: r.type,
        amountEur: Math.round((Number(r.amount_cents) || 0) / 100 * 100) / 100,
        platformFeeEur: Math.round((Number(r.platform_fee_cents) || 0) / 100 * 100) / 100,
        createdAt: r.created_at,
      })),
      recentTransactions,
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('MIS API error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
