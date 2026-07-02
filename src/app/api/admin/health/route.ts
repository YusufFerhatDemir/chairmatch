import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { withApi, apiError } from '@/lib/api-wrapper'
import { isSentryConfigured } from '@/lib/error-tracking'

/**
 * GET /api/admin/health — System-Vitals für Super-Admin-Dashboard.
 *
 * Zeigt Status aller externen Services und der wichtigsten DB-Tabellen.
 * Hilft beim Launch-Vorbereitungs-Check.
 */
export const GET = withApi(async () => {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (role !== 'super_admin') return apiError('Forbidden', 403)

  const supabase = getSupabaseAdmin()
  const health: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    deploy_commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    env: process.env.VERCEL_ENV || process.env.NODE_ENV,
  }

  // External Services Status
  health.services = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resend_email: !!process.env.RESEND_API_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
    twilio_sms: !!process.env.TWILIO_ACCOUNT_SID && !!process.env.TWILIO_AUTH_TOKEN,
    sentry: isSentryConfigured(),
    nextauth_secret: !!process.env.NEXTAUTH_SECRET || !!process.env.AUTH_SECRET,
    cron_secret: !!process.env.CRON_SECRET,
    google_maps: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY,
    vapid: !!process.env.VAPID_PUBLIC_KEY && !!process.env.VAPID_PRIVATE_KEY,
  }

  // DB-Tabellen-Größen (Top-Tabellen)
  try {
    const tables = ['profiles', 'salons', 'services', 'bookings', 'reviews', 'favorites',
                    'newsletter_subscribers', 'idempotency_keys', 'phone_verifications',
                    'login_attempts', 'audit_logs', 'error_logs']
    const counts: Record<string, number | string> = {}
    const results = await Promise.all(tables.map(async (t) => {
      try {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
        return [t, count ?? 0] as const
      } catch {
        return [t, 'n/a'] as const
      }
    }))
    for (const [t, c] of results) counts[t] = c
    health.db = counts
  } catch (e) {
    health.db = { error: String(e) }
  }

  // Letzte Errors (24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: errorCount24h } = await supabase
      .from('error_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since)
    health.errors_last_24h = errorCount24h ?? 0
  } catch {
    health.errors_last_24h = 'n/a'
  }

  // Letzte Logins (24h)
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: loginCount24h } = await supabase
      .from('login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('success', true)
      .gte('created_at', since)
    health.successful_logins_last_24h = loginCount24h ?? 0
  } catch {
    health.successful_logins_last_24h = 'n/a'
  }

  // Launch-Readiness-Score: wie viele Services sind konfiguriert
  const servicesObj = health.services as Record<string, boolean>
  const configured = Object.values(servicesObj).filter(Boolean).length
  const total = Object.keys(servicesObj).length
  health.launch_readiness = {
    score: Math.round((configured / total) * 100),
    configured,
    total,
    missing: Object.entries(servicesObj).filter(([, v]) => !v).map(([k]) => k),
  }

  return NextResponse.json(health)
})
