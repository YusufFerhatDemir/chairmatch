import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const DAYS: Record<string, number> = { Mo: 1, Di: 2, Mi: 3, Do: 4, Fr: 5, Sa: 6, So: 0 }
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
      .select('opening_hours')
      .eq('id', salonId)
      .single()

    const oh = (salon?.opening_hours as Record<string, string>) ?? {}
    const dayKeys = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
    const dow = getDayOfWeek(date)
    const dayKey = dayKeys[dow]
    const range = parseHours(oh[dayKey] ?? oh[dayKey.toLowerCase()] ?? null)
    if (!range) return NextResponse.json({ slots: [] })

    const { data: existing } = await supabase
      .from('bookings')
      .select('start_time, end_time')
      .eq('salon_id', salonId)
      .eq('booking_date', date)
      .in('status', ['pending', 'confirmed'])

    const blocked = new Set<string>()
    for (const b of existing ?? []) {
      const [sh, sm] = String(b.start_time).split(':').map(Number)
      const [eh, em] = String(b.end_time).split(':').map(Number)
      const startMin = sh * 60 + sm
      const endMin = eh * 60 + em
      for (let t = startMin; t < endMin; t += SLOT_STEP) {
        blocked.add(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`)
      }
    }

    const allSlots = generateSlots(date, range.start, range.end, durationMin, SLOT_STEP)
    const freeSlots = allSlots.filter((slot) => {
      const [h, m] = slot.split(':').map(Number)
      const slotStart = h * 60 + m
      for (let t = slotStart; t < slotStart + durationMin; t += SLOT_STEP) {
        const k = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
        if (blocked.has(k)) return false
      }
      return true
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
      .select('opening_hours')
      .eq('id', equipment.salon_id)
      .single()

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
      .in('status', ['pending', 'confirmed'])

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
