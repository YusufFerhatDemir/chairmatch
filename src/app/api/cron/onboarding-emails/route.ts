import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { sendDay3OnboardingEmail, sendReEngagementEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

/**
 * Cron: Tägliche Onboarding-E-Mail-Sequence.
 *
 * - **Day-3**: User die zwischen 3 und 4 Tagen registriert sind und noch keine
 *   Day-3-Mail bekommen haben. Engagement-Tipps.
 * - **Re-Engage**: User die >14 Tage nicht aktiv waren und noch keine
 *   Re-Engage-Mail in den letzten 30 Tagen bekommen haben. Comeback-Rabatt.
 *
 * Schedule: täglich 09:00 UTC (siehe vercel.json)
 * Erst aktiv wenn RESEND_API_KEY gesetzt (sonst Dry-Run).
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const result = { day3: { sent: 0, failed: 0 }, reengage: { sent: 0, failed: 0 } }

  // ── 1) Day-3 Onboarding ──
  try {
    const since = new Date(now - 4 * 24 * 60 * 60 * 1000).toISOString()
    const until = new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data: candidates } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .is('day3_email_sent_at', null)
      .gte('created_at', since)
      .lte('created_at', until)
      .eq('is_active', true)
      .not('email', 'is', null)
      .limit(500)

    for (const u of (candidates ?? []) as Array<{ id: string; email: string; full_name: string | null }>) {
      try {
        await sendDay3OnboardingEmail(u.email, u.full_name || 'lieber ChairMatch-User')
        await supabase
          .from('profiles')
          .update({ day3_email_sent_at: new Date().toISOString() })
          .eq('id', u.id)
        result.day3.sent++
      } catch (e) {
        logger.warn('cron.onboarding.day3_failed', { userId: u.id, err: String(e) })
        result.day3.failed++
      }
    }
  } catch (e) {
    logger.error('cron.onboarding.day3_query_failed', e)
  }

  // ── 2) Re-Engagement ──
  try {
    const inactiveCutoff = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString()
    const reEngageMinAge = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: candidates } = await supabase
      .from('profiles')
      .select('id, email, full_name, reengage_email_sent_at')
      .or(`reengage_email_sent_at.is.null,reengage_email_sent_at.lt.${reEngageMinAge}`)
      .lt('last_active_at', inactiveCutoff)
      .eq('is_active', true)
      .not('email', 'is', null)
      .limit(200) // Vorsichtig: nicht zu viele auf einmal, sonst Resend-Rate-Limit

    for (const u of (candidates ?? []) as Array<{ id: string; email: string; full_name: string | null }>) {
      try {
        await sendReEngagementEmail(u.email, u.full_name || 'lieber ChairMatch-User')
        await supabase
          .from('profiles')
          .update({ reengage_email_sent_at: new Date().toISOString() })
          .eq('id', u.id)
        result.reengage.sent++
      } catch (e) {
        logger.warn('cron.onboarding.reengage_failed', { userId: u.id, err: String(e) })
        result.reengage.failed++
      }
    }
  } catch (e) {
    logger.error('cron.onboarding.reengage_query_failed', e)
  }

  logger.info('cron.onboarding.completed', result)
  return NextResponse.json({ success: true, ...result })
}
