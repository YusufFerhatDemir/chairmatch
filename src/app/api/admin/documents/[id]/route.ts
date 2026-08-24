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
  const status = body.verified_status
  if (status !== 'approved' && status !== 'rejected') {
    return NextResponse.json({ error: 'verified_status muss approved oder rejected sein' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  // Live heisst die Spalte `status`, nicht `verified_status`. Das Feld im
  // Request-Body behaelt seinen Namen — die API-Form aendert sich nicht.
  const { error } = await supabase
    .from('documents')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
