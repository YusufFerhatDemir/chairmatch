import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

/**
 * GET  /api/admin/newsletter/campaigns
 *      → Liste aller Kampagnen + Stats
 *
 * POST /api/admin/newsletter/campaigns
 *      → Neue Kampagne anlegen oder bestehende updaten
 */

const audienceSchema = z.object({
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
  exclude_tags: z.array(z.string()).optional(),
}).optional()

const createSchema = z.object({
  id: z.string().uuid().optional(),
  subject: z.string().min(1).max(200),
  preview_text: z.string().max(200).optional().nullable(),
  html_content: z.string().min(1),
  audience_filter: audienceSchema,
})

export async function GET() {
  await requireRole(['admin', 'super_admin'])
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from('newsletter_campaigns')
    .select('id, subject, preview_text, status, total_recipients, total_sent, total_opened, total_clicked, total_bounced, sent_at, created_at, updated_at, audience_filter')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data || [] })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(['admin', 'super_admin'])
  const body = await req.json().catch(() => ({}))
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültige Eingabe', details: parsed.error.flatten() }, { status: 400 })
  }

  const sb = getSupabaseAdmin()
  const userId = (session.user as { id?: string })?.id

  const payload = {
    subject: parsed.data.subject,
    preview_text: parsed.data.preview_text ?? null,
    html_content: parsed.data.html_content,
    audience_filter: parsed.data.audience_filter ?? {},
    updated_at: new Date().toISOString(),
    created_by: userId ?? null,
  }

  if (parsed.data.id) {
    const { data, error } = await sb
      .from('newsletter_campaigns')
      .update(payload)
      .eq('id', parsed.data.id)
      .select('id')
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data?.id })
  }

  const { data, error } = await sb
    .from('newsletter_campaigns')
    .insert(payload)
    .select('id')
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data?.id })
}
