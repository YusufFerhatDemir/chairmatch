import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { invalidateAccountState } from '@/modules/auth/session'
import { dbError } from '@/lib/api-wrapper'
import { notifyIndexers } from '@/lib/indexing'
import { cityToSlug } from '@/lib/seo'

// Best-effort: sobald ein Salon live geschaltet wird, Suchmaschinen sofort
// anpingen statt auf den nächsten Sitemap-Crawl zu warten. Blockiert die
// Admin-Response nie (fire-and-forget, notifyIndexers wirft nie).
async function pingSalonIndexers(salonId: string) {
  const supabase = getSupabaseAdmin()
  const { data: salon } = await supabase
    .from('salons')
    .select('slug, city')
    .eq('id', salonId)
    .single()
  if (!salon?.slug) return
  const urls = [`https://www.chairmatch.de/salon/${salon.slug}`]
  if (salon.city) urls.push(`https://www.chairmatch.de/${cityToSlug(salon.city)}`)
  void notifyIndexers(urls)
}

async function requireAdmin() {
  const session = await getServerSession()
  const role = (session?.user as { role?: string })?.role
  if (!['admin', 'super_admin'].includes(role || '')) {
    return null
  }
  return session
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const VALID_SALON_STATUSES = ['approved', 'suspended', 'pending'] as const
const VALID_ROLES = ['kunde', 'anbieter', 'b2b', 'investor', 'admin', 'super_admin'] as const
const VALID_BOOKING_STATUSES = ['confirmed', 'cancelled', 'completed', 'no_show'] as const

const adminPatchSchema = z.object({
  action: z.enum(['salon-status', 'salon-toggle-active', 'user-role', 'booking-status']),
  id: z.string().regex(UUID, 'Ungültige ID'),
  data: z.record(z.string(), z.unknown()),
})

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = adminPatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { action, id, data } = parsed.data
  const d = data as Record<string, string | boolean | undefined>

  const supabase = getSupabaseAdmin()

  if (action === 'salon-status') {
    const status = String(d.status ?? '')
    if (!(VALID_SALON_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Salon-Status' }, { status: 400 })
    }
    const updates: Record<string, boolean> = {}
    if (status === 'approved') {
      updates.is_active = true
      updates.is_verified = true
    } else if (status === 'suspended') {
      updates.is_active = false
    } else if (status === 'pending') {
      updates.is_verified = false
    }
    const { error } = await supabase.from('salons').update(updates).eq('id', id)
    if (error) return dbError('admin-PATCH-salon-status', error)
    if (updates.is_active) void pingSalonIndexers(id)
  }

  if (action === 'salon-toggle-active') {
    if (typeof d.is_active !== 'boolean') {
      return NextResponse.json({ error: 'is_active muss boolean sein' }, { status: 400 })
    }
    const { error } = await supabase.from('salons').update({ is_active: d.is_active }).eq('id', id)
    if (error) return dbError('admin-PATCH-toggle-active', error)
    if (d.is_active) void pingSalonIndexers(id)
  }

  if (action === 'user-role') {
    const role = String(d.role ?? '')
    if (!(VALID_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Ungültige Rolle' }, { status: 400 })
    }
    const callerRole = (session.user as { role?: string })?.role
    if (['admin', 'super_admin'].includes(role) && callerRole !== 'super_admin') {
      return NextResponse.json({ error: 'Nur super_admin darf Admin-Rollen vergeben' }, { status: 403 })
    }
    const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
    if (error) return dbError('admin-PATCH-user-role', error)
    invalidateAccountState(id)
  }

  if (action === 'booking-status') {
    const status = String(d.status ?? '')
    if (!(VALID_BOOKING_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ error: 'Ungültiger Buchungsstatus' }, { status: 400 })
    }
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) return dbError('admin-PATCH-booking-status', error)
  }

  return NextResponse.json({ success: true })
}
