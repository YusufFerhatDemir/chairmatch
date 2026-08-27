import { getSupabaseAdmin } from '@/lib/supabase-server'
import { VALID_TRANSITIONS } from './booking.types'
import { hoursUntilBooking } from '@/lib/berlin-time'

/** Minuten seit Mitternacht aus "HH:MM" oder "HH:MM:SS". NaN bei Unsinn. */
export function minutesOfDay(time: unknown): number {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(time))
  if (!m) return NaN
  const stunden = Number(m[1])
  const minuten = Number(m[2])
  if (stunden > 23 || minuten > 59) return NaN
  return stunden * 60 + minuten
}

/** "HH:MM" aus Minuten seit Mitternacht. */
export function timeOfMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Terminende aus Beginn + Dauer — oder null, wenn der Termin ueber
 * Mitternacht laufen wuerde.
 *
 * Das war ein echter Ausfall und kein theoretischer: der Endzeitpunkt wurde
 * ungeprueft aus `startH * 60 + startM + duration` gebildet. Eine Behandlung
 * um 23:30 mit 90 Minuten Dauer ergab `end_time = '25:00:00'` — dafuer weist
 * Postgres den INSERT zurueck (22008), die Route antwortete 400 mit
 * "Buchung konnte nicht erstellt werden", und niemand konnte sehen, woran es
 * lag. Jetzt scheitert es vorher, mit einem Satz, der den Grund nennt.
 */
export function endTimeFor(startTime: string, durationMinutes: number): string | null {
  const start = minutesOfDay(startTime)
  if (Number.isNaN(start)) return null
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return null
  const ende = start + durationMinutes
  if (ende > 24 * 60) return null
  return timeOfMinutes(ende)
}

/** Ueberschneiden sich [aStart, aEnd) und [bStart, bEnd)? */
export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart
}

/** Statuswerte, die einen Zeitslot wirklich belegen. */
export const BLOCKING_STATUSES = ['pending', 'confirmed'] as const

/**
 * Liegt der Terminbeginn in der Vergangenheit?
 *
 * Bis Track 6 pruefte das niemand: `createBookingSchema` prueft nur das
 * Format `YYYY-MM-DD`. Ein Termin liess sich damit auf gestern buchen — der
 * Salon bekam eine Benachrichtigung ueber einen Termin, der nie stattfinden
 * kann, und die Stornofrist war von der ersten Sekunde an gerissen.
 */
export function startsInPast(date: string, startTime: string, now: number = Date.now()): boolean {
  const stunden = hoursUntilBooking(date, startTime, now)
  return Number.isNaN(stunden) ? true : stunden < 0
}

/**
 * Check if a time slot conflicts with existing bookings.
 * Uses booking_date + start_time/end_time from the actual DB schema.
 */
export async function checkConflict(
  salonId: string,
  date: string,
  startTime: string,
  durationMinutes: number = 30
): Promise<boolean> {
  const supabase = getSupabaseAdmin()

  const { data: existingBookings, error } = await supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('salon_id', salonId)
    .eq('booking_date', date)
    .in('status', [...BLOCKING_STATUSES])

  // Fehler beim Lesen hiess bisher "kein Konflikt": `const { data } = …` warf
  // den Fehler weg, `!data` fuehrte direkt in `return false`, und die Buchung
  // lief durch. Ein Ausfall der Belegungsabfrage — Netz, Rechte, Schema —
  // machte die Ueberschneidungspruefung damit lautlos wirkungslos, also genau
  // dann, wenn man sie am dringendsten braucht. Fehler heisst jetzt belegt.
  if (error) {
    console.error('[booking] Belegungspruefung fehlgeschlagen:', error.message)
    return true
  }

  if (!existingBookings || existingBookings.length === 0) {
    return false
  }

  const startMinutes = minutesOfDay(startTime)
  if (Number.isNaN(startMinutes)) return true
  const endMinutes = startMinutes + durationMinutes

  return existingBookings.some(booking => {
    const bStart = minutesOfDay(booking.start_time)
    const bEnd = minutesOfDay(booking.end_time)
    // Eine Bestandszeile ohne brauchbare Zeiten laesst sich nicht ausschliessen
    // — sie gilt als belegend, nicht als frei.
    if (Number.isNaN(bStart) || Number.isNaN(bEnd)) return true
    return overlaps(startMinutes, endMinutes, bStart, bEnd)
  })
}

export async function snapshotPolicy(salonId: string) {
  const supabase = getSupabaseAdmin()

  const { data: policy } = await supabase
    .from('booking_policies')
    .select('*')
    .eq('salon_id', salonId)
    .single()

  return {
    depositPercent: policy?.deposit_percent ?? 0,
    cancellationHours: policy?.cancellation_hours ?? 24,
    noShowFeeCents: policy?.no_show_fee_cents ?? 0,
  }
}

/**
 * Stornofrist, wenn der Salon keine eigene hinterlegt hat.
 *
 * Kein erfundener Preis, sondern der Wert, den `snapshotPolicy` schon vorher
 * als Rueckfall benutzt hat — hier nur benannt, damit UI und Action denselben
 * meinen.
 */
export const DEFAULT_CANCELLATION_HOURS = 24

export interface CancellationWindow {
  /** Frist des Salons in Stunden (aus `booking_policies.cancellation_hours`). */
  cancellationHours: number
  /** Stunden bis Terminbeginn; negativ, wenn er vorbei ist. null bei unlesbarer Zeit. */
  hoursBeforeStart: number | null
  /** Fristgerecht abgesagt? */
  freeOfCharge: boolean
  /** Frist gerissen — die Absage ist trotzdem moeglich. */
  deadlinePassed: boolean
}

/**
 * Wertet die Stornofrist aus. Rechnet, entscheidet aber nichts ueber Geld.
 *
 * `cancelBooking` hat die Frist bis Track 6 komplett ignoriert: `snapshotPolicy`
 * lieferte `cancellationHours` an `createBooking`, wo der Wert nur im Audit-Log
 * landete — beim Stornieren fragte ihn niemand ab. Jede Absage galt als
 * fristgerecht, auch fuenf Minuten vor dem Termin, und der Hinweis "kostenlos
 * bis 24 Std. vorher" im Buchungsformular hatte im Code keine Entsprechung.
 *
 * Was hier BEWUSST NICHT passiert: eine Gebuehr beziffern. Dafuer gibt es
 * keine Spalte — weder `bookings.cancellation_fee_cents` noch
 * `booking_policies.cancellation_fee_cents` existieren (Spaltensonde
 * 2026-08-27, siehe src/test/live-schema.ts). Ein Betrag waere frei erfunden
 * und liesse sich nirgends festschreiben. Diese Funktion sagt deshalb nur, OB
 * die Frist gerissen ist; was das kostet, klaert der Salon mit dem Kunden.
 *
 * Unlesbare Zeitangaben gelten als fristgerecht: dass die Frist gerissen wurde,
 * muss belegbar sein, sonst traegt der Kunde einen Datenfehler.
 */
export function evaluateCancellationWindow(
  bookingDate: unknown,
  startTime: unknown,
  cancellationHours: number = DEFAULT_CANCELLATION_HOURS,
  now: number = Date.now(),
): CancellationWindow {
  const frist =
    Number.isFinite(cancellationHours) && cancellationHours >= 0
      ? cancellationHours
      : DEFAULT_CANCELLATION_HOURS

  const stunden = hoursUntilBooking(String(bookingDate ?? ''), String(startTime ?? ''), now)
  if (Number.isNaN(stunden)) {
    return {
      cancellationHours: frist,
      hoursBeforeStart: null,
      freeOfCharge: true,
      deadlinePassed: false,
    }
  }

  const fristgerecht = stunden >= frist
  return {
    cancellationHours: frist,
    hoursBeforeStart: stunden,
    freeOfCharge: fristgerecht,
    deadlinePassed: !fristgerecht,
  }
}

export function validateTransition(
  currentStatus: string,
  newStatus: string,
  actor: 'customer' | 'provider' | 'system'
): boolean {
  // Aufrufer liefern GROSSSCHREIBUNG ('PENDING' aus booking.actions), die
  // Tabelle steht in DB-Schreibweise ('pending'). Ohne Normalisierung traf
  // KEINE einzige Transition zu — Bestaetigen/Abschliessen/Stornieren/No-Show
  // liefen alle in "nicht moeglich".
  const from = currentStatus?.toLowerCase()
  const to = newStatus?.toLowerCase()
  return VALID_TRANSITIONS.some(
    t => t.from.toLowerCase() === from && t.to.toLowerCase() === to && t.actor === actor
  )
}

/**
 * Endpreis nach Rabatt, in Cents.
 *
 * Der Prozentpfad war ungedeckelt: `validatePromoCode()` reicht durch, was in
 * `promo_codes.discount` steht, und ein Code mit 150 hat daraus einen
 * NEGATIVEN Preis gemacht — also eine Gutschrift statt einer Zahlung. Beide
 * Pfade enden jetzt bei 0.
 */
export function calculatePrice(
  basePriceCents: number,
  promoDiscount: number,
  promoType: 'percent' | 'fixed' | null
): number {
  if (!promoType || promoDiscount <= 0) return basePriceCents

  if (promoType === 'percent') {
    return Math.max(0, Math.round(basePriceCents * (1 - promoDiscount / 100)))
  }
  return Math.max(0, basePriceCents - promoDiscount * 100)
}

export async function validatePromoCode(code: string): Promise<{
  valid: boolean
  discount: number
  type: 'percent' | 'fixed' | null
}> {
  const supabase = getSupabaseAdmin()

  const { data: promo } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('code', code.toUpperCase())
    .single()

  if (!promo || !promo.is_active) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { valid: false, discount: 0, type: null }
  }

  if (promo.max_uses !== null && (promo.used_count ?? 0) >= promo.max_uses) {
    return { valid: false, discount: 0, type: null }
  }

  return {
    valid: true,
    discount: Number(promo.discount),
    type: promo.type as 'percent' | 'fixed',
  }
}
