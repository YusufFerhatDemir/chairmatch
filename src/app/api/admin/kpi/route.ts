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

  /**
   * Zaehler, der einen Fehlschlag NICHT als 0 ausgibt.
   *
   * Vorher lieferte jeder Fehler hier eine glatte 0 zurueck — eine fehlende
   * Tabelle, ein Rechtefehler, ein Timeout. Im Cockpit war das nicht von
   * "es gibt wirklich keine" zu unterscheiden: "Buchungen 30d: 0" konnte
   * heissen, dass niemand gebucht hat, oder dass die Abfrage gar nicht erst
   * lief. Genau diese Verwechslung stand in Track 10 schon einmal im
   * Anbieter-Dashboard.
   *
   * `null` heisst jetzt "unbekannt" und faerbt jede daraus abgeleitete Quote
   * ebenfalls auf `null`. Was danebengeht, steht in `errors`.
   */
  const failures: string[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safeCount = async (table: string, builder: (q: any) => any, label?: string): Promise<number | null> => {
    const name = label ?? table
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const q: any = supabase.from(table).select('*', { count: 'exact', head: true })
      const res = await builder(q)
      if (res?.error) {
        failures.push(`${name}: ${res.error.message}`)
        return null
      }
      const count = res?.count as number | null | undefined
      if (count === null || count === undefined) {
        failures.push(`${name}: kein count in der Antwort`)
        return null
      }
      return count
    } catch (e) {
      failures.push(`${name}: ${e instanceof Error ? e.message : String(e)}`)
      return null
    }
  }

  /** Prozentsatz nur, wenn beide Seiten bekannt sind. */
  const ratio = (part: number | null, whole: number | null): number | null => {
    if (part === null || whole === null || whole <= 0) return null
    return Math.round((part / whole) * 100)
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
  const bookingsGrowth =
    bookings30d === null || bookingsPrev30d === null
      ? null
      : bookingsPrev30d > 0
        ? Math.round(((bookings30d - bookingsPrev30d) / bookingsPrev30d) * 100)
        : (bookings30d > 0 ? 100 : 0)

  // Conversion-Rates
  const convToBookingRate = ratio(bookings30d, convs30d)

  // === MARKETPLACE-GESUNDHEIT ===

  // Anti-Bypass-Treffer (7d)
  const bypassBlocked7d = await safeCount('audit_logs', (q) =>
    q.eq('action', 'message.bypass_blocked').gte('created_at', since7d)
  )

  // Reviews (7d)
  const reviews7d = await safeCount('reviews', (q) => q.gte('created_at', since7d))

  // Affiliate-Klicks (Tabelle existiert evtl. nicht — dann null, nicht 0)
  const affiliateClicks7d = await safeCount('affiliate_clicks', (q) =>
    q.gte('created_at', since7d)
  )

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

  /**
   * DAU/WAU — aktive PERSONEN, nicht Anmeldevorgaenge.
   *
   * Hier stand `safeCount('login_attempts', ...)`: die Zahl der Zeilen mit
   * `success = true` im Fenster, beschriftet als "Daily Active Users". Wer
   * sich an einem Tag fuenfmal anmeldet — Handy, Rechner, abgelaufene
   * Session — zaehlte fuenfmal. DAU war damit systematisch zu hoch, und
   * `dau_wau_ratio` (die Kennzahl, an der Stickiness gemessen wird) aus zwei
   * verschieden stark ueberzeichneten Zahlen gebildet.
   *
   * `login_attempts` hat live KEINE `user_id` (Spaltensonde 2026-08-27), die
   * Person steckt nur in `email`. Also: Adressen holen und eindeutig zaehlen.
   * Die Obergrenze schuetzt den Speicher; wird sie erreicht, sagt die Antwort
   * das (`capped`), statt eine zu kleine Zahl als Wahrheit auszugeben.
   */
  const ACTIVE_USER_SCAN_LIMIT = 20_000

  const distinctActiveUsers = async (
    since: string,
    label: string,
  ): Promise<{ count: number | null; capped: boolean }> => {
    try {
      const { data, error } = await supabase
        .from('login_attempts')
        .select('email')
        .eq('success', true)
        .gte('created_at', since)
        .limit(ACTIVE_USER_SCAN_LIMIT)

      if (error) {
        failures.push(`${label}: ${error.message}`)
        return { count: null, capped: false }
      }

      const rows = (data ?? []) as { email: string | null }[]
      const unique = new Set(
        rows
          .map((r) => (r.email ?? '').trim().toLowerCase())
          .filter((e) => e.length > 0),
      )
      return { count: unique.size, capped: rows.length >= ACTIVE_USER_SCAN_LIMIT }
    } catch (e) {
      failures.push(`${label}: ${e instanceof Error ? e.message : String(e)}`)
      return { count: null, capped: false }
    }
  }

  const dauResult = await distinctActiveUsers(since1d, 'dau')
  const wauResult = await distinctActiveUsers(since7d, 'wau')

  // === MILESTONE-TRACKING ===
  // Aus docs/seo/07-execution-plan.md: 50 Listings = Phase 2
  const progressTo = (threshold: number): number | null =>
    listingsActive === null ? null : Math.min(100, Math.round((listingsActive / threshold) * 100))

  const milestones = {
    phase_2_threshold: 50,
    phase_2_progress: progressTo(50),
    phase_3_threshold: 500,
    phase_3_progress: progressTo(500),
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
      // Eindeutige Adressen mit erfolgreicher Anmeldung im Fenster.
      dau: dauResult.count,
      wau: wauResult.count,
      dau_wau_ratio: ratio(dauResult.count, wauResult.count),
      // true = die Rohdatengrenze wurde erreicht, die Zahl ist eine Untergrenze.
      capped: dauResult.capped || wauResult.capped,
    },
    milestones,
    /**
     * Was nicht ermittelt werden konnte. Leer heisst: jede Zahl oben ist
     * gemessen. Jedes `null` oben hat hier seinen Grund.
     */
    errors: failures,
  })
})
