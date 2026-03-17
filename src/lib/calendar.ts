/**
 * Calendar helpers for generating .ics files and Google Calendar URLs
 * from ChairMatch booking data.
 */

export interface CalendarBooking {
  id: string
  booking_date: string      // YYYY-MM-DD
  start_time: string        // HH:MM or HH:MM:SS
  end_time: string          // HH:MM or HH:MM:SS
  salon?: {
    name: string
    street?: string | null
    house_number?: string | null
    postal_code?: string | null
    city?: string | null
  } | null
  service?: {
    name: string
  } | null
  notes?: string | null
}

/**
 * Convert a date string (YYYY-MM-DD) and time string (HH:MM or HH:MM:SS)
 * into an iCalendar UTC datetime string (YYYYMMDDTHHmmSSZ).
 * Assumes times are in Europe/Berlin timezone for conversion.
 */
function toICSDatetime(dateStr: string, timeStr: string): string {
  // Normalize time to HH:MM:SS
  const timeParts = timeStr.split(':')
  const hours = timeParts[0] || '00'
  const minutes = timeParts[1] || '00'
  const seconds = timeParts[2] || '00'

  // Build a Date in local time, then format as iCal TZID value
  // For simplicity we use the raw values with a TZID parameter
  const d = dateStr.replace(/-/g, '')
  return `${d}T${hours}${minutes}${seconds}`
}

/**
 * Build a full address string from salon fields.
 */
function buildAddress(salon: CalendarBooking['salon']): string {
  if (!salon) return ''
  const parts: string[] = []
  if (salon.street) {
    parts.push(salon.house_number ? `${salon.street} ${salon.house_number}` : salon.street)
  }
  if (salon.postal_code || salon.city) {
    parts.push([salon.postal_code, salon.city].filter(Boolean).join(' '))
  }
  return parts.join(', ')
}

/**
 * Build the event title: "Service @ Salon"
 */
function buildTitle(booking: CalendarBooking): string {
  const serviceName = booking.service?.name || 'Termin'
  const salonName = booking.salon?.name || 'ChairMatch'
  return `${serviceName} @ ${salonName}`
}

/**
 * Generate a .ics (iCalendar) file string for a booking.
 */
export function generateICS(booking: CalendarBooking): string {
  const title = buildTitle(booking)
  const location = buildAddress(booking.salon)
  const dtStart = toICSDatetime(booking.booking_date, booking.start_time)
  const dtEnd = toICSDatetime(booking.booking_date, booking.end_time)
  const now = new Date()
  const dtstamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const descriptionParts: string[] = []
  if (booking.service?.name) {
    descriptionParts.push(`Service: ${booking.service.name}`)
  }
  if (booking.salon?.name) {
    descriptionParts.push(`Salon: ${booking.salon.name}`)
  }
  if (location) {
    descriptionParts.push(`Adresse: ${location}`)
  }
  if (booking.notes) {
    descriptionParts.push(`Notizen: ${booking.notes}`)
  }
  descriptionParts.push('Gebucht über ChairMatch')

  // Escape special characters for iCal
  const escapeIcal = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ChairMatch//Booking//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:booking-${booking.id}@chairmatch.de`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Berlin:${dtStart}`,
    `DTEND;TZID=Europe/Berlin:${dtEnd}`,
    `SUMMARY:${escapeIcal(title)}`,
    `DESCRIPTION:${escapeIcal(descriptionParts.join('\\n'))}`,
    location ? `LOCATION:${escapeIcal(location)}` : null,
    'STATUS:CONFIRMED',
    `URL:https://chairmatch.de/booking/${booking.id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean)

  return lines.join('\r\n')
}

/**
 * Generate a Google Calendar "Add Event" URL for a booking.
 */
export function generateGoogleCalendarUrl(booking: CalendarBooking): string {
  const title = buildTitle(booking)
  const location = buildAddress(booking.salon)

  // Google Calendar expects dates in YYYYMMDDTHHmmSS/YYYYMMDDTHHmmSS format
  const dtStart = toICSDatetime(booking.booking_date, booking.start_time)
  const dtEnd = toICSDatetime(booking.booking_date, booking.end_time)

  const descriptionParts: string[] = []
  if (booking.service?.name) descriptionParts.push(`Service: ${booking.service.name}`)
  if (booking.salon?.name) descriptionParts.push(`Salon: ${booking.salon.name}`)
  if (booking.notes) descriptionParts.push(`Notizen: ${booking.notes}`)
  descriptionParts.push('Gebucht über ChairMatch - https://chairmatch.de')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtStart}/${dtEnd}`,
    ctz: 'Europe/Berlin',
    details: descriptionParts.join('\n'),
  })

  if (location) {
    params.set('location', location)
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
