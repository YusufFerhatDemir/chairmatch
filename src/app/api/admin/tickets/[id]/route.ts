import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const status = body.status
  const admin_notes = body.admin_notes

  const updates: { status?: string; admin_notes?: string; updated_at?: string } = { updated_at: new Date().toISOString() }
  if (['OPEN', 'IN_PROGRESS', 'SUBMITTED', 'DONE'].includes(status)) updates.status = status
  if (typeof admin_notes === 'string') updates.admin_notes = admin_notes.slice(0, 2000)

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('submission_tickets')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
