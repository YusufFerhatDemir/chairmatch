import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

/**
 * GET  /api/admin/newsletter/subscribers
 *      → ?q= (Suche) ?status=  ?page=  ?per_page= (max 200)
 *
 * PATCH /api/admin/newsletter/subscribers
 *      → Body: { id, status?, tags?, name? }
 *
 * DELETE /api/admin/newsletter/subscribers?id=...
 *      → DSGVO-Löschung
 */

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'unsubscribed', 'bounced']).optional(),
  tags: z.array(z.string()).optional(),
  name: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  await requireRole(['admin', 'super_admin'])

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const status = url.searchParams.get('status') ?? ''
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1)
  const perPage = Math.min(200, Math.max(10, Number(url.searchParams.get('per_page')) || 50))
  const from = (page - 1) * perPage
  const to = from + perPage - 1

  const sb = getSupabaseAdmin()
  let query = sb
    .from('newsletter_subscribers')
    .select('id, email, name, status, source, tags, subscribed_at, unsubscribed_at, last_sent_at', { count: 'exact' })
    .order('subscribed_at', { ascending: false })
    .range(from, to)

  if (q) query = query.ilike('email', `%${q}%`)
  if (status && ['active', 'unsubscribed', 'bounced'].includes(status)) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Stats
  const [{ count: total }, { count: active }, { count: unsub }] = await Promise.all([
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }),
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    sb.from('newsletter_subscribers').select('*', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
  ])

  return NextResponse.json({
    subscribers: data || [],
    pagination: { page, perPage, total: count ?? 0 },
    stats: {
      total: total ?? 0,
      active: active ?? 0,
      unsubscribed: unsub ?? 0,
    },
  })
}

export async function PATCH(req: NextRequest) {
  await requireRole(['admin', 'super_admin'])
  const body = await req.json().catch(() => ({}))
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Ungültige Eingabe' }, { status: 400 })

  const sb = getSupabaseAdmin()
  const update: Record<string, unknown> = {}
  if (parsed.data.status !== undefined) {
    update.status = parsed.data.status
    update.unsubscribed_at = parsed.data.status === 'unsubscribed' ? new Date().toISOString() : null
  }
  if (parsed.data.tags !== undefined) update.tags = parsed.data.tags
  if (parsed.data.name !== undefined) update.name = parsed.data.name

  const { error } = await sb
    .from('newsletter_subscribers')
    .update(update)
    .eq('id', parsed.data.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  await requireRole(['admin', 'super_admin'])
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Keine ID' }, { status: 400 })
  const sb = getSupabaseAdmin()
  const { error } = await sb.from('newsletter_subscribers').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
