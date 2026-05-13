import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { confirmBooking, completeBooking, markNoShow } from '@/modules/booking/booking.actions'
import { withApi, apiError } from '@/lib/api-wrapper'

type Ctx = { params: Promise<{ id: string }> }

// Salon-FK kann je nach Supabase-SDK-Version als Objekt oder Array kommen.
function extractOwnerId(rel: unknown): string | undefined {
  if (!rel) return undefined
  if (Array.isArray(rel)) return (rel[0] as { owner_id?: string })?.owner_id
  return (rel as { owner_id?: string })?.owner_id
}

export const GET = withApi<Ctx>(async (_request, { params }) => {
  const session = await getServerSession()
  if (!session?.user?.id) return apiError('Nicht authentifiziert', 401)

  const { id } = await params
  if (!id) return apiError('Ungültige Buchungs-ID', 400)

  const supabase = getSupabaseAdmin()

  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      salon:salons!inner(name, category, city, owner_id),
      service:services!inner(name, duration_minutes, price_cents),
      customer:profiles!bookings_customer_id_fkey(full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !booking) return apiError('Nicht gefunden', 404)

  const role = (session.user as { role?: string }).role || ''
  const isCustomer = booking.customer_id === session.user.id
  const isSalonOwner = extractOwnerId(booking.salon) === session.user.id
  const isAdmin = ['admin', 'super_admin'].includes(role)

  if (!isCustomer && !isSalonOwner && !isAdmin) {
    return apiError('Keine Berechtigung', 403)
  }

  return NextResponse.json(booking)
})

export const PATCH = withApi<Ctx>(async (request, { params }) => {
  const session = await getServerSession()
  if (!session?.user?.id) return apiError('Nicht authentifiziert', 401)

  const { id } = await params
  if (!id) return apiError('Ungültige Buchungs-ID', 400)

  const supabase = getSupabaseAdmin()
  const { data: booking } = await supabase
    .from('bookings')
    .select('salon_id, salons!inner(owner_id)')
    .eq('id', id)
    .single()

  if (!booking) return apiError('Buchung nicht gefunden', 404)

  const role = (session.user as { role?: string }).role || ''
  const isSalonOwner = extractOwnerId((booking as { salons?: unknown }).salons) === session.user.id
  const isAdmin = ['admin', 'super_admin'].includes(role)

  if (!isSalonOwner && !isAdmin) {
    return apiError('Nur Saloninhaber oder Admins können den Status ändern', 403)
  }

  const body = await (request as NextRequest).json().catch(() => null)
  const newStatus: string | undefined = body?.newStatus || body?.status

  let result
  switch (newStatus?.toLowerCase()) {
    case 'confirmed':
      result = await confirmBooking(id)
      break
    case 'completed':
      result = await completeBooking(id)
      break
    case 'no_show':
      result = await markNoShow(id)
      break
    default:
      return apiError('Ungültiger Status', 400)
  }

  if ('error' in result) return apiError(result.error ?? 'Aktion fehlgeschlagen', 400)
  return NextResponse.json(result)
})
