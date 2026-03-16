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

// Salon actions: approve, suspend, toggle active
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, id, data } = await req.json()
  const supabase = getSupabaseAdmin()

  if (action === 'salon-status') {
    // Map status to is_active/is_verified
    const updates: Record<string, boolean> = {}
    if (data.status === 'approved') {
      updates.is_active = true
      updates.is_verified = true
    } else if (data.status === 'suspended') {
      updates.is_active = false
    } else if (data.status === 'pending') {
      updates.is_verified = false
    }
    const { error } = await supabase.from('salons').update(updates).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'salon-toggle-active') {
    const { error } = await supabase.from('salons').update({ is_active: data.is_active }).eq('id', id)
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
