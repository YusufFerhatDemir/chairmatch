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

/** Minuten seit Mitternacht aus "HH:MM[:SS]". */
function minutesOfDay(time: unknown): number {
  const [h, m] = String(time).split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

/**
 * Hat die frisch angelegte Buchung ein Rennen um denselben Slot verloren?
 *
 * Gepraeft wird gegen alle anderen aktiven Buchungen desselben Salons am
 * selben Tag. Bei Ueberschneidung gewinnt die aeltere Buchung; bei exakt
 * gleichem Zeitstempel entscheidet die id, damit die Ordnung total bleibt
 * und nicht beide Seiten zuruecktreten.
 */
async function losesSlotRace(
  neu: Record<string, unknown>,
  durationMinutes: number,
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data: others } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, created_at')
    .eq('salon_id', neu.salon_id as string)
    .eq('booking_date', neu.booking_date as string)
    .in('status', ['confirmed', 'pending'])
    .neq('id', neu.id as string)

  if (!others || others.length === 0) return false

  const start = minutesOfDay(neu.start_time)
  const end = neu.end_time ? minutesOfDay(neu.end_time) : start + durationMinutes
  const eigenerStempel = String(neu.created_at ?? '')
  const eigeneId = String(neu.id ?? '')

  return others.some(other => {
    const oStart = minutesOfDay(other.start_time)
    const oEnd = minutesOfDay(other.end_time)
    const ueberschneidet = start < oEnd && end > oStart
    if (!ueberschneidet) return false

    const fremderStempel = String(other.created_at ?? '')
    if (fremderStempel !== eigenerStempel) return fremderStempel < eigenerStempel
    return String(other.id ?? '') < eigeneId
  })
}

/** Wie oft ein CAS auf denselben Rabattcode wiederholt wird, bevor er als voll gilt. */
const PROMO_CLAIM_ATTEMPTS = 5

/**
 * Belegt atomar einen Platz im Kontingent eines Rabattcodes.
 *
 * Der Compare-and-Swap `.eq('used_count', gelesen)` laesst bei gleichzeitigen
 * Buchungen nur einen Schreiber gewinnen; der Verlierer liest neu und
 * versucht es erneut, bis das Kontingent erschoepft ist. Ohne diese Bedingung
 * war der Deckel `max_uses` wirkungslos.
 */
async function claimPromoCode(rawCode: string): Promise<{
  claimed: boolean
  discount: number
  type: 'percent' | 'fixed' | null
}> {
  const supabase = getSupabaseAdmin()
  const code = rawCode.toUpperCase()
  const nichtEingeloest = { claimed: false, discount: 0, type: null } as const

  for (let versuch = 0; versuch < PROMO_CLAIM_ATTEMPTS; versuch++) {
    const promo = await validatePromoCode(code)
    if (!promo.valid) return nichtEingeloest

    const { data: row } = await supabase
      .from('promo_codes')
      .select('used_count, max_uses')
      .eq('code', code)
      .single()

    if (!row) return nichtEingeloest

    const gelesen = row.used_count ?? 0
    if (row.max_uses === null || row.max_uses === undefined) {
      // Unbegrenzter Code: hochzaehlen ist reine Statistik, kein Deckel.
      await supabase
        .from('promo_codes')
        .update({ used_count: gelesen + 1 })
        .eq('code', code)
      return { claimed: true, discount: promo.discount, type: promo.type }
    }

    if (gelesen >= row.max_uses) return nichtEingeloest

    const { data: gewonnen } = await supabase
      .from('promo_codes')
      .update({ used_count: gelesen + 1 })
      .eq('code', code)
      .eq('used_count', gelesen)
      .select('id')

    if (gewonnen && gewonnen.length > 0) {
      return { claimed: true, discount: promo.discount, type: promo.type }
    }
    // Jemand anderes war schneller — neu lesen und erneut versuchen.
  }

  console.warn(`[promo] ${code}: Kontingent nach ${PROMO_CLAIM_ATTEMPTS} Versuchen nicht belegbar`)
  return nichtEingeloest
}

/** Gibt einen belegten Platz zurueck (Buchung kam doch nicht zustande). */
async function releasePromoCode(rawCode: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const code = rawCode.toUpperCase()
  const { data: row } = await supabase
    .from('promo_codes')
    .select('used_count')
    .eq('code', code)
    .single()

  const gelesen = row?.used_count ?? 0
  if (gelesen <= 0) return
  await supabase
    .from('promo_codes')
    .update({ used_count: gelesen - 1 })
    .eq('code', code)
    .eq('used_count', gelesen)
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

  // Fehlendes salonId hat bis 2026-08-27 einen ERFOLG gemeldet:
  // `{ success: true, bookingId: 'demo-…' }`, ohne irgendetwas zu schreiben.
  // Die Route macht daraus 201, der Kunde sieht "gebucht", der Salon sieht
  // nie einen Termin. Dieselbe stille Erfolgsluege, die im Bewertungs-
  // Formular bereits ausgebaut wurde — nur hier am Kernprodukt.
  if (!data.salonId) {
    return { error: 'Salon fehlt. Bitte den Termin erneut ueber die Salonseite buchen.' }
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

  // Die Leistung muss zu DIESEM Salon gehoeren. Geprueft wurde das nie:
  // `serviceId` und `salonId` kamen unabhaengig aus dem Request. Damit liess
  // sich die guenstige Leistung eines fremden Salons zum Preis von dort auf
  // einen anderen Salon buchen — Preis, Dauer und Termin stammten aus zwei
  // verschiedenen Betrieben.
  if (service.salon_id !== data.salonId) {
    return { error: 'Dienstleistung nicht gefunden.' }
  }

  // Deaktivierte Leistungen waren weiter buchbar — der Filter fehlte schlicht.
  if (service.is_active === false) {
    return { error: 'Diese Dienstleistung wird derzeit nicht angeboten.' }
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

  // Promo-Code: pruefen UND das Kontingent sofort belegen.
  //
  // Vorher lagen Pruefung und Verbrauch weit auseinander — `validatePromoCode`
  // hier oben, das Hochzaehlen als "best effort" nach dem Insert, und zwar als
  // read-then-write ohne Bedingung. Zwei gleichzeitige Buchungen lasen beide
  // used_count = 4 (max_uses = 5) und schrieben beide 5: der Deckel eines
  // Rabattcodes war damit praktisch nicht durchsetzbar.
  //
  // Jetzt wird der Platz im Kontingent per Compare-and-Swap belegt, bevor der
  // Preis faellt. Wer keinen Platz bekommt, bucht zum vollen Preis — nie
  // umgekehrt. Schlaegt der Insert danach fehl, wird der Platz zurueckgegeben.
  let finalPriceCents = service.price_cents
  let promoClaimed = false
  if (data.promoCode) {
    const claim = await claimPromoCode(data.promoCode)
    if (claim.claimed) {
      promoClaimed = true
      finalPriceCents = calculatePrice(service.price_cents, claim.discount, claim.type)
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
    // Der Rabatt-Platz war schon belegt — zurueckgeben, sonst verfaellt er
    // fuer eine Buchung, die es nie gegeben hat.
    if (promoClaimed && data.promoCode) {
      await releasePromoCode(data.promoCode)
    }
    return { error: 'Buchung konnte nicht erstellt werden.' }
  }

  // Step 2: Slot-Nachpruefung.
  //
  // `checkConflict` oben ist ein SELECT vor dem INSERT — zwischen beiden
  // passt eine zweite Buchung. Fuer Miet-Buchungen faengt das der
  // EXCLUDE-Constraint `rental_bookings_no_overlap` ab; `bookings` hat kein
  // Gegenstueck (Migration 20260827_bookings_no_overlap liegt bereit, ist
  // aber noch nicht angewendet). Bis dahin entscheidet die Nachpruefung:
  // beide Seiten sehen einander jetzt, und die JUENGERE tritt zurueck. Der
  // Vergleich ist total geordnet (created_at, dann id), also gibt genau eine
  // von zwei kollidierenden Buchungen auf — nie beide.
  const verlierer = await losesSlotRace(newBooking, service.duration_minutes)
  if (verlierer) {
    await supabase.from('bookings').delete().eq('id', newBooking.id)
    if (promoClaimed && data.promoCode) {
      await releasePromoCode(data.promoCode)
    }
    return { error: 'Dieser Zeitslot ist bereits belegt.' }
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
