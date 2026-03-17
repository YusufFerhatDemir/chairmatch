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
  for (const row of toDelete ?? []) {
    const { error } = await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', row.id)
    if (!error) deleted++
    // auth.users löschen erfordert Admin API — hier nur profiles
  }

  return NextResponse.json({ ok: true, deleted, total: toDelete?.length ?? 0 })
}
