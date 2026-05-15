import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApi, apiError } from '@/lib/api-wrapper'

/**
 * GET /api/admin/kpi — Operational KPI-Cockpit für Super-Admin.
 *
 * North-Star: bestätigte Buchungen (T1, T7, T30) + Listing-Wachstum.
 * Siehe docs/seo/07-kpi-dashboard.md für das Framework.
 */
export const GET = withApi(async () => {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (role !== 'super_admin') return apiError('Forbidden', 403)

  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const since1d = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
  const since60d = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString()

  // Defensive Helper: count mit Fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeCount = async (table: string, builder: (q: any) => any): Promise<number> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = supabase.from(table).select('*', { count: 'exact', head: true })
      const res = await builder(q)
      return (res?.count as number | null) ?? 0
    } catch {
      return 0
    }
  }

  // === FUNNEL: Signups → Listings → Sichtbarkeit → Conversations → Bookings ===

  // Signups
  const signups1d = await safeCount('profiles', (q) => q.gte('created_at', since1d))
  const signups7d = await safeCount('profiles', (q) => q.gte('created_at', since7d))
  const signups30d = await safeCount('profiles', (q) => q.gte('created_at', since30d))

  // Anbieter (Salons)
  const salonsTotal = await safeCount('salons', (q) => q)
  const salonsActive = await safeCount('salons', (q) => q.eq('is_active', true))
  const salonsNew7d = await safeCount('salons', (q) => q.gte('created_at', since7d))

  // Listings (Services / Stuhlplätze)
  const listingsTotal = await safeCount('services', (q) => q)
  const listingsActive = await safeCount('services', (q) => q.eq('is_active', true))
  const listingsNew7d = await safeCount('services', (q) => q.gte('created_at', since7d))

  // Conversations
  const convs7d = await safeCount('conversations', (q) => q.gte('created_at', since7d))
  const convs30d = await safeCount('conversations', (q) => q.gte('created_at', since30d))

  // Bookings (NORTH-STAR)
  const bookings1d = await safeCount('bookings', (q) =>
    q.gte('created_at', since1d).in('status', ['confirmed', 'paid', 'completed'])
  )
  const bookings7d = await safeCount('bookings', (q) =>
    q.gte('created_at', since7d).in('status', ['confirmed', 'paid', 'completed'])
  )
  const bookings30d = await safeCount('bookings', (q) =>
    q.gte('created_at', since30d).in('status', ['confirmed', 'paid', 'completed'])
  )
  const bookingsPrev30d = await safeCount('bookings', (q) =>
    q.gte('created_at', since60d).lt('created_at', since30d).in('status', ['confirmed', 'paid', 'completed'])
  )

  // Bookings-Wachstum (30d vs. previous 30d)
  const bookingsGrowth = bookingsPrev30d > 0
    ? Math.round(((bookings30d - bookingsPrev30d) / bookingsPrev30d) * 100)
    : (bookings30d > 0 ? 100 : 0)

  // Conversion-Rates
  const convToBookingRate = convs30d > 0
    ? Math.round((bookings30d / convs30d) * 100)
    : 0

  // === MARKETPLACE-GESUNDHEIT ===

  // Anti-Bypass-Treffer (7d)
  const bypassBlocked7d = await safeCount('audit_logs', (q) =>
    q.eq('action', 'message.bypass_blocked').gte('created_at', since7d)
  )

  // Reviews (7d)
  const reviews7d = await safeCount('reviews', (q) => q.gte('created_at', since7d))

  // Affiliate-Klicks (wenn Tabelle existiert)
  let affiliateClicks7d = 0
  try {
    affiliateClicks7d = await safeCount('affiliate_clicks', (q) => q.gte('created_at', since7d))
  } catch {
    // ok
  }

  // === SEO / INDEXING ===

  // Salons mit Slug (für Sitemap)
  const salonsIndexable = await safeCount('salons', (q) =>
    q.eq('is_active', true).not('slug', 'is', null)
  )

  // Newsletter-Subscribers
  const newsletterSubs = await safeCount('newsletter_subscribers', (q) =>
    q.eq('is_confirmed', true)
  )

  // === RETENTION / ENGAGEMENT ===

  // DAU (Daily Active Users) — User mit Login in den letzten 24h
  let dau = 0
  try {
    dau = await safeCount('login_attempts', (q) =>
      q.eq('success', true).gte('created_at', since1d)
    )
  } catch {
    // ok
  }

  // WAU
  let wau = 0
  try {
    wau = await safeCount('login_attempts', (q) =>
      q.eq('success', true).gte('created_at', since7d)
    )
  } catch {
    // ok
  }

  // === MILESTONE-TRACKING ===
  // Aus docs/seo/07-execution-plan.md: 50 Listings = Phase 2
  const milestones = {
    phase_2_threshold: 50,
    phase_2_progress: Math.min(100, Math.round((listingsActive / 50) * 100)),
    phase_3_threshold: 500,
    phase_3_progress: Math.min(100, Math.round((listingsActive / 500) * 100)),
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    funnel: {
      signups: { d1: signups1d, d7: signups7d, d30: signups30d },
      salons: { total: salonsTotal, active: salonsActive, new_7d: salonsNew7d },
      listings: { total: listingsTotal, active: listingsActive, new_7d: listingsNew7d },
      conversations: { d7: convs7d, d30: convs30d },
      bookings: {
        d1: bookings1d,
        d7: bookings7d,
        d30: bookings30d,
        prev_30d: bookingsPrev30d,
        growth_pct: bookingsGrowth,
      },
      conversion: {
        conv_to_booking_pct: convToBookingRate,
      },
    },
    marketplace_health: {
      bypass_blocked_7d: bypassBlocked7d,
      reviews_7d: reviews7d,
      affiliate_clicks_7d: affiliateClicks7d,
    },
    seo: {
      salons_indexable: salonsIndexable,
      newsletter_subscribers: newsletterSubs,
    },
    engagement: {
      dau,
      wau,
      dau_wau_ratio: wau > 0 ? Math.round((dau / wau) * 100) : 0,
    },
    milestones,
  })
})
