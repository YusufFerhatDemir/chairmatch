'use server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createBookingSchema, cancelBookingSchema } from './booking.schemas'
import { checkConflict, snapshotPolicy, validateTransition, validatePromoCode, calculatePrice } from './booking.service'
import { getServerSession } from '@/modules/auth/session'

export async function createBooking(input: unknown) {
  const parsed = createBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const data = parsed.data
  const session = await getServerSession()
  const customerId = session?.user?.id
  if (!customerId) {
    return { error: 'Nicht authentifiziert. Bitte melden Sie sich an.' }
  }

  if (!data.salonId) {
    return { success: true, bookingId: 'demo-' + Date.now() }
  }

  const supabase = getSupabaseAdmin()

  // Load service to get duration and price
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', data.serviceId)
    .single()

  if (!service) {
    return { error: 'Dienstleistung nicht gefunden.' }
  }

  const riskLevel = (service as { risk_level?: string }).risk_level
  if (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH') {
    if (!data.consentGiven) {
      return { error: 'Für diese Behandlung ist eine Einwilligung (Risikoaufklärung) erforderlich.' }
    }
  }

  // Check for slot conflict
  const hasConflict = await checkConflict(
    data.salonId,
    data.date,
    data.startTime,
    service.duration_minutes
  )
  if (hasConflict) {
    return { error: 'Dieser Zeitslot ist bereits belegt.' }
  }

  // Snapshot policy
  const policy = await snapshotPolicy(data.salonId)

  // Validate promo code
  let finalPriceCents = service.price_cents
  if (data.promoCode) {
    const promo = await validatePromoCode(data.promoCode)
    if (promo.valid) {
      finalPriceCents = calculatePrice(service.price_cents, promo.discount, promo.type)
    }
  }

  // Calculate end time from start time + duration
  const [startH, startM] = data.startTime.split(':').map(Number)
  const endMinutes = startH * 60 + startM + service.duration_minutes
  const endH = Math.floor(endMinutes / 60)
  const endM = endMinutes % 60
  const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

  // Sequential calls (best effort, no real transaction in REST API)
  // Step 1: Create booking
  const { data: newBooking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      customer_id: customerId,
      salon_id: data.salonId,
      service_id: data.serviceId,
      staff_id: data.staffId || null,
      booking_date: data.date,
      start_time: `${data.startTime}:00`,
      end_time: `${endTimeStr}:00`,
      status: 'pending',
      price_cents: finalPriceCents,
      notes: data.notes || null,
    })
    .select()
    .single()

  if (bookingError || !newBooking) {
    return { error: 'Buchung konnte nicht erstellt werden.' }
  }

  // Step 2: Increment promo usage (best effort)
  if (data.promoCode && finalPriceCents < service.price_cents) {
    try {
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('used_count')
        .eq('code', data.promoCode.toUpperCase())
        .single()

      await supabase
        .from('promo_codes')
        .update({ used_count: (promo?.used_count || 0) + 1 })
        .eq('code', data.promoCode.toUpperCase())
    } catch {
      // Best effort - log but continue
      console.error('Failed to update promo code usage')
    }
  }

  // Step 3: Audit log (best effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id: customerId,
      action: 'BOOKING_CREATED',
      entity: 'booking',
      entity_id: newBooking.id,
      details: {
        salonId: data.salonId,
        serviceId: data.serviceId,
        date: data.date,
        startTime: data.startTime,
        priceCents: finalPriceCents,
        policySnapshot: policy,
      },
    })
  } catch {
    console.error('Failed to create audit log')
  }

  // Step 4: Consent (HIGH/VERY_HIGH)
  if (data.consentGiven && (riskLevel === 'HIGH' || riskLevel === 'VERY_HIGH')) {
    try {
      await supabase.from('consents').insert({
        booking_id: newBooking.id,
        signed_at: new Date().toISOString(),
      })
    } catch {
      console.error('Failed to create consent record')
    }
  }

  return { success: true, bookingId: newBooking.id }
}

export async function cancelBooking(input: unknown) {
  const parsed = cancelBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const session = await getServerSession()
  const { bookingId, reason } = parsed.data

  const supabase = getSupabaseAdmin()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    return { error: 'Buchung nicht gefunden.' }
  }

  // Determine actor
  const isCustomer = session?.user?.id === booking.customer_id
  const actor: 'customer' | 'provider' = isCustomer ? 'customer' : 'provider'

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'CANCELLED', actor)) {
    return { error: 'Stornierung nicht möglich.' }
  }

  // Sequential calls (best effort)
  await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      cancellation_reason: reason || null,
    })
    .eq('id', bookingId)

  try {
    await supabase.from('audit_logs').insert({
      user_id: session?.user?.id || null,
      action: 'BOOKING_CANCELLED',
      entity: 'booking',
      entity_id: bookingId,
      details: { reason, actor },
    })
  } catch {
    console.error('Failed to create audit log')
  }

  return { success: true }
}

export async function confirmBooking(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const supabase = getSupabaseAdmin()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'CONFIRMED', 'provider')) {
    return { error: 'Bestätigung nicht möglich.' }
  }

  await supabase
    .from('bookings')
    .update({ status: 'confirmed' })
    .eq('id', bookingId)

  try {
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'BOOKING_CONFIRMED',
      entity: 'booking',
      entity_id: bookingId,
    })
  } catch {
    console.error('Failed to create audit log')
  }

  return { success: true }
}

export async function completeBooking(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const supabase = getSupabaseAdmin()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'COMPLETED', 'provider')) {
    return { error: 'Abschluss nicht möglich.' }
  }

  await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('id', bookingId)

  try {
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'BOOKING_COMPLETED',
      entity: 'booking',
      entity_id: bookingId,
    })
  } catch {
    console.error('Failed to create audit log')
  }

  return { success: true }
}

export async function markNoShow(bookingId: string) {
  const session = await getServerSession()
  if (!session?.user) return { error: 'Nicht authentifiziert.' }

  const supabase = getSupabaseAdmin()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  const currentStatus = booking.status?.toUpperCase() || 'PENDING'
  if (!validateTransition(currentStatus, 'NO_SHOW', 'provider')) {
    return { error: 'No-Show Markierung nicht möglich.' }
  }

  await supabase
    .from('bookings')
    .update({ status: 'no_show' })
    .eq('id', bookingId)

  try {
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'BOOKING_NO_SHOW',
      entity: 'booking',
      entity_id: bookingId,
    })
  } catch {
    console.error('Failed to create audit log')
  }

  return { success: true }
}

export async function getBookings(filters?: { customerId?: string; salonId?: string }) {
  const supabase = getSupabaseAdmin()

  let query = supabase
    .from('bookings')
    .select(`
      *,
      salon:salons(name, category, city),
      service:services(name, duration_minutes, price_cents)
    `)
    .order('created_at', { ascending: false })

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId)
  }
  if (filters?.salonId) {
    query = query.eq('salon_id', filters.salonId)
  }

  const { data } = await query
  return data || []
}
