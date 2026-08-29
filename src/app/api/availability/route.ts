import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { minutesOfDay, overlaps, BLOCKING_STATUSES } from '@/modules/booking/booking.service'
import { berlinToday } from '@/lib/berlin-time'
import { SALON_SUSPENDED_MESSAGE, salonAcceptsBusiness } from '@/lib/salon-status'
import { CLOSED_MESSAGES, istFeiertag } from '@/lib/salon-open'

const SLOT_STEP = 15 // minutes

/** Parse "09:00–19:00" or "Geschlossen" */
function parseHours(hours: string | null): { start: number; end: number } | null {
  if (!hours || hours === 'Geschlossen' || hours.toLowerCase().includes('geschlossen')) return null
  const m = hours.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/)
  if (!m) return null
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
  const end = parseInt(m[3], 10) * 60 + parseInt(m[4], 10)
  return { start, end }
}

/** Get day of week (0=Sun, 1=Mon, ...) for YYYY-MM-DD */
function getDayOfWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return d.getDay()
}

/** Generate time slots for a date given opening hours and duration */
function generateSlots(
  dateStr: string,
  openStart: number,
  openEnd: number,
  durationMin: number,
  step: number
): string[] {
  const slots: string[] = []
  for (let t = openStart; t + durationMin <= openEnd; t += step) {
    const h = Math.floor(t / 60)
    const m = t % 60
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return slots
}

/** APPOINTMENT: GET /api/availability?salonId=&date=&serviceId= */
export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const salonId = searchParams.get('salonId')
  const resourceId = searchParams.get('resourceId') // for RENTAL (equipment_id)
  const date = searchParams.get('date') // YYYY-MM-DD
  const serviceId = searchParams.get('serviceId')
  const duration = parseInt(searchParams.get('duration') ?? '60', 10)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'date required (YYYY-MM-DD)' }, { status: 400 })
  }

  // APPOINTMENT flow
  if (salonId && serviceId) {
    const { data: service } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .eq('salon_id', salonId)
      .single()

    const durationMin = service?.duration_minutes ?? duration

    const { data: salon } = await supabase
      .from('salons')
      .select('opening_hours, is_active, state')
      .eq('id', salonId)
      .single()

    // Ein gesperrter Salon (is_active = false) hat keine buchbaren Zeiten.
    // Bis Track 15 bot diese Route ihm weiter das volle Raster an, obwohl er
    // aus jeder oeffentlichen Liste verschwunden war — und `createBooking`
    // nahm den Termin danach an. Siehe src/lib/salon-status.ts.
    if (!salonAcceptsBusiness(salon)) {
      return NextResponse.json({
        slots: [],
        unavailable: 'salon_inactive',
        message: SALON_SUSPENDED_MESSAGE,
      })
    }

    // Gesetzlicher Feiertag → kein Raster.
    //
    // `opening_hours` kennt nur Wochentage. Der 25. Dezember 2026 ist ein
    // Freitag; ohne diese Pruefung bot die Route dafuer das volle
    // Freitagsraster an, und `createBooking` nahm den Termin an. Die
    // Pruefung stand seit jeher in `lib/scheduling.ts` — einem Modul ohne
    // einen einzigen Aufrufer.
    if (istFeiertag(date, salon?.state)) {
      return NextResponse.json({
        slots: [],
        unavailable: 'holiday',
        message: CLOSED_MESSAGES.holiday,
      })
    }

    const oh = (salon?.opening_hours as Record<string, string>) ?? {}
    const dayKeys = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const dow = getDayOfWeek(date)
    const dayKey = dayKeys[dow]
    const range = parseHours(oh[dayKey] ?? oh[dayKey.toLowerCase()] ?? null)
    if (!range) return NextResponse.json({ slots: [] })

    const { data: existing, error: belegungFehler } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('salon_id', salonId)
      .eq('booking_date', date)
      .in('status', [...BLOCKING_STATUSES])

    // Faellt die Belegungsabfrage aus, ist JEDER Slot frei — das ist genau die
    // Antwort, die zu Doppelbuchungen fuehrt. Lieber ehrlich nichts anbieten.
    if (belegungFehler) {
      return NextResponse.json(
        { error: 'Belegung konnte nicht geladen werden.' },
        { status: 503 },
      )
    }

    // Belegte Zeitraeume als Intervalle, nicht als Raster-Punkte.
    //
    // Vorher wurde jede Bestandsbuchung in Punkte im 15-Minuten-Raster
    // zerlegt (`blocked.add(...)`) und ein Kandidat gegen dieselben Punkte
    // geprueft. Das haelt nur, solange jede Buchung exakt auf dem Raster
    // liegt. Eine Buchung von 09:10 bis 09:40 belegte die Punkte 9:10 und
    // 9:25 — ein Kandidat um 09:00 prueft 9:00 und 9:15, trifft keinen davon
    // und galt als frei, obwohl er sich 30 Minuten lang ueberschneidet.
    // Genau diese Buchung liess der Kalender dann zu.
    const belegt: { start: number; end: number }[] = []
    for (const b of existing ?? []) {
      const start = minutesOfDay(b.start_time)
      const end = minutesOfDay(b.end_time)
      if (Number.isNaN(start) || Number.isNaN(end)) continue
      belegt.push({ start, end })
    }

    const allSlots = generateSlots(date, range.start, range.end, durationMin, SLOT_STEP)

    // Heute nichts anbieten, was schon vorbei ist — `createBooking` weist es
    // ohnehin ab (`startsInPast`), und ein anklickbarer Slot in der
    // Vergangenheit ist ein Versprechen, das die Buchung nicht halten kann.
    const jetztMinuten =
      date === berlinToday()
        ? (() => {
            const uhr = new Intl.DateTimeFormat('de-DE', {
              timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false,
            }).format(new Date())
            return minutesOfDay(uhr)
          })()
        : null

    const freeSlots = allSlots.filter((slot) => {
      const slotStart = minutesOfDay(slot)
      if (Number.isNaN(slotStart)) return false
      if (jetztMinuten !== null && slotStart <= jetztMinuten) return false
      const slotEnd = slotStart + durationMin
      return !belegt.some(b => overlaps(slotStart, slotEnd, b.start, b.end))
    })

    return NextResponse.json({ slots: freeSlots, durationMinutes: durationMin })
  }

  // RENTAL flow (resourceId = equipment_id)
  if (resourceId) {
    const durationMin = duration
    const { data: equipment } = await supabase
      .from('rental_equipment')
      .select('salon_id')
      .eq('id', resourceId)
      .eq('is_available', true)
      .single()

    if (!equipment) return NextResponse.json({ slots: [] })

    const { data: salon } = await supabase
      .from('salons')
      .select('opening_hours, is_active, state')
      .eq('id', equipment.salon_id)
      .single()

    if (!salonAcceptsBusiness(salon)) {
      return NextResponse.json({
        slots: [],
        unavailable: 'salon_inactive',
        message: SALON_SUSPENDED_MESSAGE,
      })
    }

    // Dieselbe Sperre wie im Termin-Zweig: das Stundenraster kommt aus den
    // Oeffnungszeiten desselben Salons. Die Tages-Miete selbst (Zeitraum
    // ueber `/api/rental-bookings`) beruehrt das nicht.
    if (istFeiertag(date, salon?.state)) {
      return NextResponse.json({
        slots: [],
        unavailable: 'holiday',
        message: CLOSED_MESSAGES.holiday,
      })
    }

    const oh = (salon?.opening_hours as Record<string, string>) ?? {}
    const dayKeys = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const dow = getDayOfWeek(date)
    const dayKey = dayKeys[dow]
    const range = parseHours(oh[dayKey] ?? oh[dayKey.toLowerCase()] ?? null)
    if (!range) return NextResponse.json({ slots: [] })

    const { data: existing } = await supabase
      .from('rental_bookings')
      .select('start_date, end_date')
      .eq('equipment_id', resourceId)
      .in('status', [...BLOCKING_STATUSES])

    for (const b of existing ?? []) {
      if (date >= b.start_date && date <= b.end_date) {
        return NextResponse.json({ slots: [] })
      }
    }

    const allSlots = generateSlots(date, range.start, range.end, durationMin, SLOT_STEP)
    return NextResponse.json({ slots: allSlots, durationMinutes: durationMin })
  }

  return NextResponse.json({ error: 'salonId+serviceId or resourceId required' }, { status: 400 })
}
