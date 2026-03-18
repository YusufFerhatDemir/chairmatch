import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Cron: Hard-Delete nach 30 Tagen (DSGVO)
 * Vercel Cron: vercel.json "crons": [{ "path": "/api/cron/hard-delete", "schedule": "0 2 * * *" }]
 * Oder: Vercel Dashboard → Cron Jobs
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffIso = cutoff.toISOString()

  const { data: toDelete } = await supabase
    .from('profiles')
    .select('id')
    .not('delete_requested_at', 'is', null)
    .lte('delete_requested_at', cutoffIso)

  let deleted = 0
  const errors: string[] = []
  for (const row of toDelete ?? []) {
    // 1. Mark profile as deleted
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', row.id)
    if (error) {
      errors.push(`profile ${row.id}: ${error.message}`)
      continue
    }
    // 2. Delete auth.users via Admin API
    try {
      const { error: authErr } = await supabase.auth.admin.deleteUser(row.id)
      if (authErr) errors.push(`auth ${row.id}: ${authErr.message}`)
    } catch {
      errors.push(`auth ${row.id}: Admin API nicht verfügbar`)
    }
    deleted++
  }

  if (errors.length > 0) {
    console.error('Hard-delete errors:', errors)
  }

  return NextResponse.json({ ok: true, deleted, total: toDelete?.length ?? 0, errors: errors.length })
}
