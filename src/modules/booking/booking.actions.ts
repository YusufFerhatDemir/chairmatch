'use server'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createBookingSchema, cancelBookingSchema } from './booking.schemas'
import { checkConflict, snapshotPolicy, validateTransition, validatePromoCode, calculatePrice } from './booking.service'
import { getServerSession } from '@/modules/auth/session'
import { sendBookingConfirmation, sendProviderNotification } from '@/lib/email'

/** Rolle des Aufrufers gegenueber einer konkreten Buchung. */
type BookingActor = 'customer' | 'provider'

/** Fehlerform der Actions: `status` faellt in den Routen auf 400 zurueck. */
type ActionFailure = { error: string; status?: number }

type ActorResult =
  | ActionFailure
  | { booking: Record<string, string | null>; actor: BookingActor; userId: string }

/**
 * Laedt eine Buchung UND bestimmt, in welcher Rolle der eingeloggte Nutzer
 * darauf zugreift.
 *
 * Ohne diese Pruefung war jede Buchung fuer jeden eingeloggten Nutzer
 * angreifbar:
 *
 *   - `cancelBooking` schloss aus "nicht der Kunde" direkt auf "also der
 *     Anbieter" und liess damit jeden Fremden mit Anbieter-Rechten stornieren.
 *   - `confirmBooking`, `completeBooking` und `markNoShow` pruefen bis hier
 *     ueberhaupt keinen Bezug zwischen Nutzer und Buchung.
 *
 * Der Handler `/api/bookings/[id]` pruefte den Besitz zwar selbst, `/cancel`
 * aber nur die blosse Existenz einer Session — und beide Actions sind als
 * Server Actions ohnehin auch direkt aufrufbar. Die Autorisierung gehoert
 * deshalb in die Action, nicht in den Handler.
 */
async function resolveBookingActor(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  bookingId: string,
): Promise<ActorResult> {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return { error: 'Nicht authentifiziert.', status: 401 }

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  if (!booking) return { error: 'Buchung nicht gefunden.' }

  if (booking.customer_id === userId) {
    return { booking, actor: 'customer', userId }
  }

  const role = (session.user as { role?: string }).role || ''
  if (['admin', 'super_admin'].includes(role)) {
    return { booking, actor: 'provider', userId }
  }

  const { data: salon } = await supabase
    .from('salons')
    .select('owner_id')
    .eq('id', booking.salon_id)
    .single()

  if (salon && salon.owner_id === userId) {
    return { booking, actor: 'provider', userId }
  }

  return { error: 'Keine Berechtigung fuer diese Buchung.', status: 403 }
}

/** Nur Saloninhaber/Admin duerfen den Status setzen — nie der Kunde. */
function requireProviderActor(result: ActorResult): ActionFailure | null {
  if ('error' in result) return result
  if (result.actor !== 'provider') {
    return { error: 'Nur Saloninhaber oder Admins koennen den Status aendern.', status: 403 }
  }
  return null
}

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
        user_id: customerId,
        booking_id: newBooking.id,
        type: riskLevel || 'HIGH',
        given: true,
      })
    } catch {
      console.error('Failed to create consent record')
    }
  }

  // Step 5: Send confirmation emails — best effort, never aborts booking
  try {
    const [customerRes, salonRes] = await Promise.all([
      supabase.from('profiles').select('email, full_name').eq('id', customerId).single(),
      supabase.from('salons').select('name, owner_id').eq('id', data.salonId).single(),
    ])

    const customerEmail = customerRes.data?.email
    const customerName = customerRes.data?.full_name ?? undefined
    const salonName = salonRes.data?.name ?? 'ChairMatch Salon'
    const ownerId = salonRes.data?.owner_id

    const emailDetails = {
      bookingId: newBooking.id,
      salonName,
      serviceName: service.name,
      date: data.date,
      startTime: data.startTime,
      endTime: endTimeStr,
      priceCents: finalPriceCents,
      customerName,
    }

    const tasks: Promise<unknown>[] = []

    if (customerEmail) {
      tasks.push(sendBookingConfirmation(customerEmail, emailDetails))
    }

    if (ownerId) {
      const ownerRes = await supabase.from('profiles').select('email').eq('id', ownerId).single()
      if (ownerRes.data?.email) {
        tasks.push(
          sendProviderNotification(ownerRes.data.email, 'new_booking', {
            salonName,
            customerName,
            bookingId: newBooking.id,
            message: `Neue Buchung: ${service.name} am ${data.date} um ${data.startTime} Uhr.`,
          }),
        )
      }
    }

    await Promise.allSettled(tasks)
  } catch {
    console.error('Failed to send booking emails')
  }

  return { success: true, bookingId: newBooking.id }
}

export async function cancelBooking(input: unknown) {
  const parsed = cancelBookingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { bookingId, reason } = parsed.data

  const supabase = getSupabaseAdmin()

  // Kunde, Saloninhaber oder Admin — sonst 403. Der Actor kommt aus der
  // echten Beziehung, nicht aus "ist nicht der Kunde".
  const resolved = await resolveBookingActor(supabase, bookingId)
  if ('error' in resolved) return resolved
  const { booking, actor, userId } = resolved

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
      user_id: userId,
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
  const supabase = getSupabaseAdmin()

  const resolved = await resolveBookingActor(supabase, bookingId)
  const denied = requireProviderActor(resolved)
  if (denied) return denied
  const { booking, userId } = resolved as Exclude<ActorResult, ActionFailure>

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
      user_id: userId,
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
  const supabase = getSupabaseAdmin()

  const resolved = await resolveBookingActor(supabase, bookingId)
  const denied = requireProviderActor(resolved)
  if (denied) return denied
  const { booking, userId } = resolved as Exclude<ActorResult, ActionFailure>

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
      user_id: userId,
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
  const supabase = getSupabaseAdmin()

  const resolved = await resolveBookingActor(supabase, bookingId)
  const denied = requireProviderActor(resolved)
  if (denied) return denied
  const { booking, userId } = resolved as Exclude<ActorResult, ActionFailure>

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
      user_id: userId,
      action: 'BOOKING_NO_SHOW',
      entity: 'booking',
      entity_id: bookingId,
    })
  } catch {
    console.error('Failed to create audit log')
  }

  return { success: true }
}

/**
 * Buchungen lesen — immer auf den Aufrufer eingegrenzt.
 *
 * Vorher hatte diese Action keinerlei Session-Pruefung: ein Aufruf ohne
 * Filter gab mit dem Service-Role-Client saemtliche Buchungen der Plattform
 * zurueck (Kundennamen, Termine, Salons). Als Export einer `'use server'`-
 * Datei ist sie ein eigener Endpunkt, der Schutz im Route-Handler
 * `/api/bookings` reichte also nicht.
 */
export async function getBookings(filters?: { customerId?: string; salonId?: string }) {
  const session = await getServerSession()
  const userId = session?.user?.id
  if (!userId) return []

  const supabase = getSupabaseAdmin()
  const role = (session.user as { role?: string }).role || ''
  const isAdmin = ['admin', 'super_admin'].includes(role)

  // Nicht-Admins duerfen nur eigene Buchungen und Buchungen in eigenen
  // Salons sehen. Ein fremder `customerId`-Filter liefert eine leere Liste,
  // kein fremdes Ergebnis.
  const scoped: { customerId?: string; salonId?: string } = { ...filters }
  if (!isAdmin) {
    if (scoped.salonId) {
      const { data: salon } = await supabase
        .from('salons')
        .select('owner_id')
        .eq('id', scoped.salonId)
        .single()
      if (!salon || salon.owner_id !== userId) return []
    } else {
      if (scoped.customerId && scoped.customerId !== userId) return []
      scoped.customerId = userId
    }
  }

  let query = supabase
    .from('bookings')
    .select(`
      *,
      salon:salons(name, category, city),
      service:services(name, duration_minutes, price_cents)
    `)
    .order('created_at', { ascending: false })

  if (scoped.customerId) {
    query = query.eq('customer_id', scoped.customerId)
  }
  if (scoped.salonId) {
    query = query.eq('salon_id', scoped.salonId)
  }

  const { data } = await query
  return data || []
}
