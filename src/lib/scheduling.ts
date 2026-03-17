/**
 * Scheduling helper that enhances the existing booking.service.
 * Calculates available time slots considering opening hours, existing bookings,
 * staff availability, public holidays, break times, and buffer between appointments.
 */

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isPublicHoliday, type Bundesland } from '@/lib/holidays'

/** A time slot with availability info */
export interface TimeSlot {
  time: string       // HH:MM format
  available: boolean
}

/** Configuration for slot generation */
interface SchedulingConfig {
  slotStepMinutes: number     // Step between slots (default 15)
  bufferMinutes: number       // Buffer between appointments (default 10)
  breakStart: number          // Break start in minutes from midnight (default 720 = 12:00)
  breakEnd: number            // Break end in minutes from midnight (default 750 = 12:30)
}

const DEFAULT_CONFIG: SchedulingConfig = {
  slotStepMinutes: 15,
  bufferMinutes: 10,
  breakStart: 720,   // 12:00
  breakEnd: 750,     // 12:30
}

/** Parse "09:00-19:00" or "Geschlossen" into start/end minutes */
function parseHours(hours: string | null): { start: number; end: number } | null {
  if (!hours || hours === 'Geschlossen' || hours.toLowerCase().includes('geschlossen')) {
    return null
  }
  const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/)
  if (!m) return null
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
  return { start, end }
}

/** Get day-of-week index (0=Sun, 1=Mon, ...) for YYYY-MM-DD */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + 'T12:00:00').getDay()
}

/** Format minutes as HH:MM */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Parse HH:MM or HH:MM:SS to minutes from midnight */
function timeToMinutes(time: string): number {
  const parts = time.split(':').map(Number)
  return parts[0] * 60 + parts[1]
}

/**
 * Get available time slots for a salon on a given date.
 *
 * Checks:
 * - Opening hours for the day
 * - Public holidays (salon's state from DB)
 * - Existing confirmed/pending bookings
 * - Optional staff-specific bookings
 * - 30-minute lunch break (12:00-12:30 default)
 * - 10-minute buffer between appointments
 *
 * @param salonId - Salon UUID
 * @param date - YYYY-MM-DD format
 * @param duration - Desired appointment duration in minutes
 * @param staffId - Optional staff member UUID to filter bookings
 * @returns Array of time slots with availability status
 */
export async function getAvailableSlots(
  salonId: string,
  date: string,
  duration: number,
  staffId?: string
): Promise<TimeSlot[]> {
  const config = DEFAULT_CONFIG
  const supabase = getSupabaseAdmin()

  // 1. Fetch salon data (opening hours + state for holiday check)
  const { data: salon } = await supabase
    .from('salons')
    .select('opening_hours, state')
    .eq('id', salonId)
    .single()

  if (!salon) return []

  // 2. Check if the date is a public holiday
  const salonState = (salon.state as Bundesland) || undefined
  if (isPublicHoliday(date, salonState)) {
    return []
  }

  // 3. Determine opening hours for the day
  const oh = (salon.opening_hours as Record<string, string>) ?? {}
  const dayKeys = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const dow = getDayOfWeek(date)
  const dayKey = dayKeys[dow]
  const range = parseHours(oh[dayKey] ?? oh[dayKey.toLowerCase()] ?? null)

  if (!range) return []

  // 4. Fetch existing bookings for the date
  let bookingQuery = supabase
    .from('bookings')
    .select('start_time, end_time')
    .eq('salon_id', salonId)
    .eq('booking_date', date)
    .in('status', ['pending', 'confirmed'])

  if (staffId) {
    bookingQuery = bookingQuery.eq('staff_id', staffId)
  }

  const { data: existingBookings } = await bookingQuery

  // 5. Build a set of blocked minute ranges (including buffer)
  const blockedRanges: { start: number; end: number }[] = []

  for (const b of existingBookings ?? []) {
    const bStart = timeToMinutes(String(b.start_time))
    const bEnd = timeToMinutes(String(b.end_time))
    blockedRanges.push({
      start: bStart - config.bufferMinutes,
      end: bEnd + config.bufferMinutes,
    })
  }

  // 6. Add break time as a blocked range
  blockedRanges.push({
    start: config.breakStart,
    end: config.breakEnd,
  })

  // 7. Generate all possible slots and check availability
  const slots: TimeSlot[] = []

  for (let t = range.start; t + duration <= range.end; t += config.slotStepMinutes) {
    const slotStart = t
    const slotEnd = t + duration

    // Check if this slot overlaps with any blocked range
    const isBlocked = blockedRanges.some(
      br => slotStart < br.end && slotEnd > br.start
    )

    slots.push({
      time: minutesToTime(slotStart),
      available: !isBlocked,
    })
  }

  return slots
}
