import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { requireRole } from '@/modules/auth/session'

/**
 * POST /api/admin/newsletter/subscribers/import
 * Body: { rows: [{ email, name?, tags?, source? }] }
 *
 * Bulk-Import via JSON-Array (Client parst CSV).
 * ON CONFLICT email: bestehende werden NICHT überschrieben.
 */

const rowSchema = z.object({
  email: z.string().email(),
  name: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  source: z.string().optional(),
})
const schema = z.object({
  rows: z.array(rowSchema).min(1).max(5000),
  defaultTags: z.array(z.string()).optional(),
  defaultSource: z.string().optional(),
})

export async function POST(req: NextRequest) {
  await requireRole(['admin', 'super_admin'])
  const body = await req.json().catch(() => ({}))
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ungültiges Format' }, { status: 400 })
  }

  const sb = getSupabaseAdmin()

  // bereits existierende E-Mails ermitteln
  const emails = parsed.data.rows.map(r => r.email.toLowerCase().trim())
  const { data: existing } = await sb
    .from('newsletter_subscribers')
    .select('email')
    .in('email', emails)
  const existingSet = new Set((existing || []).map((r: { email: string }) => r.email))

  const toInsert = parsed.data.rows
    .map(r => ({
      email: r.email.toLowerCase().trim(),
      name: r.name || null,
      tags: r.tags && r.tags.length > 0 ? r.tags : (parsed.data.defaultTags || []),
      source: r.source || parsed.data.defaultSource || 'csv_import',
      status: 'active' as const,
    }))
    .filter(r => !existingSet.has(r.email))

  let inserted = 0
  if (toInsert.length > 0) {
    // Batches à 500
    for (let i = 0; i < toInsert.length; i += 500) {
      const slice = toInsert.slice(i, i + 500)
      const { error } = await sb.from('newsletter_subscribers').insert(slice)
      if (error) {
        return NextResponse.json({
          error: error.message,
          inserted,
          skipped: existingSet.size,
        }, { status: 500 })
      }
      inserted += slice.length
    }
  }

  return NextResponse.json({
    success: true,
    inserted,
    skipped: existingSet.size,
    totalRows: parsed.data.rows.length,
  })
}
