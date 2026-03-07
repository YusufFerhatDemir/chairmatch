import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

// Salon actions: approve, suspend, toggle live
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, id, data } = await req.json()
  const supabase = getSupabaseAdmin()

  if (action === 'salon-status') {
    const { error } = await supabase.from('salons').update({ status: data.status, is_live: data.status === 'approved' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'salon-toggle-live') {
    const { error } = await supabase.from('salons').update({ is_live: data.is_live }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'user-role') {
    const { error } = await supabase.from('profiles').update({ role: data.role }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'booking-status') {
    const { error } = await supabase.from('bookings').update({ status: data.status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
