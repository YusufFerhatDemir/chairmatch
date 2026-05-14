import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

/**
 * Cron: Tägliche DB-Hygiene.
 *
 * Räumt Tabellen auf, die sonst endlos wachsen würden:
 * - `idempotency_keys` älter als 48h
 * - `phone_verifications` älter als 24h
 * - `login_attempts` älter als 30 Tage
 * - `audit_logs` älter als 1 Jahr (DSGVO-konform)
 * - `error_logs` älter als 90 Tage
 *
 * Schedule: täglich 03:00 UTC (siehe vercel.json)
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const now = Date.now()
  const result: Record<string, number | string> = {}

  // 1. idempotency_keys älter 48h
  try {
    const cutoff = new Date(now - 48 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('idempotency_keys')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.idempotency_keys = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.idempotency_keys = `crash: ${(e as Error).message}`
  }

  // 2. phone_verifications älter 24h
  try {
    const cutoff = new Date(now - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('phone_verifications')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.phone_verifications = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.phone_verifications = `crash: ${(e as Error).message}`
  }

  // 3. login_attempts älter 30 Tage
  try {
    const cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('login_attempts')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.login_attempts = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.login_attempts = `crash: ${(e as Error).message}`
  }

  // 4. audit_logs älter 1 Jahr
  try {
    const cutoff = new Date(now - 365 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('audit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.audit_logs = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.audit_logs = `crash: ${(e as Error).message}`
  }

  // 5. error_logs älter 90 Tage
  try {
    const cutoff = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('error_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.error_logs = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.error_logs = `crash: ${(e as Error).message}`
  }

  // 6. visit_logs älter 6 Monate (analytics-Roh-Daten — Aggregate bleiben)
  try {
    const cutoff = new Date(now - 180 * 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase
      .from('visit_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff)
    result.visit_logs = error ? `error: ${error.message}` : (count ?? 0)
  } catch (e) {
    result.visit_logs = `crash: ${(e as Error).message}`
  }

  logger.info('cron.cleanup.completed', result)
  return NextResponse.json({ success: true, deleted: result })
}
