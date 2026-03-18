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

const VALID_ACTIONS = ['salon-status', 'salon-toggle-active', 'user-role', 'booking-status'] as const
const VALID_SALON_STATUSES = ['approved', 'suspended', 'pending'] as const
const VALID_ROLES = ['kunde', 'anbieter', 'b2b', 'admin', 'super_admin'] as const
const VALID_BOOKING_STATUSES = ['confirmed', 'cancelled', 'completed', 'no_show'] as const

// Salon actions: approve, suspend, toggle active
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { action, id, data } = await req.json()

  if (!action || !id || !data) {
    return NextResponse.json({ error: 'action, id und data sind erforderlich' }, { status: 400 })
  }

  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  if (action === 'salon-status') {
    if (!VALID_SALON_STATUSES.includes(data.status)) {
      return NextResponse.json({ error: 'Ungültiger Salon-Status' }, { status: 400 })
    }
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
    if (typeof data.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active muss boolean sein' }, { status: 400 })
    }
    const { error } = await supabase.from('salons').update({ is_active: data.is_active }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'user-role') {
    if (!VALID_ROLES.includes(data.role)) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 })
    }
    const { error } = await supabase.from('profiles').update({ role: data.role }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (action === 'booking-status') {
    if (!VALID_BOOKING_STATUSES.includes(data.status)) {
      return NextResponse.json({ error: 'Ungültiger Buchungsstatus' }, { status: 400 })
    }
    const { error } = await supabase.from('bookings').update({ status: data.status }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
