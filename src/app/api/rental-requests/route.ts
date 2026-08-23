import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { createNotification } from '@/lib/notifications'
import { notifyLandlordOfRentalRequest } from '@/lib/rental-request-email'

/**
 * Miet- und Besichtigungsanfragen (Track D).
 *
 * Bisher landete das Formular unter /inserat/[id]/anfragen ausschließlich in
 * localStorage — der Vermieter hat nie etwas davon erfahren. Hier wird die
 * Anfrage persistiert, der Vermieter bekommt eine In-App-Benachrichtigung und
 * (falls Resend konfiguriert ist) eine E-Mail.
 *
 * Die Kostenschätzung wird IMMER server-seitig aus rental_equipment gerechnet.
 * Der Client schickt nur Dauer und Menge.
 */

const UNITS_PER_DAY = 8

/** Wie viele Miettage eine Einheit der jeweiligen Dauer entspricht. */
const DAYS_PER_UNIT: Record<string, number> = {
  hour: 1 / UNITS_PER_DAY,
  day: 1,
  week: 7,
  month: 30,
}

const createSchema = z.object({
  equipmentId: z.string().uuid(),
  requestType: z.enum(['miete', 'besichtigung']).default('miete'),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'preferredDate: YYYY-MM-DD'),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/, 'preferredTime: HH:MM').optional(),
  durationUnit: z.enum(['hour', 'day', 'week', 'month']).optional(),
  units: z.coerce.number().int().min(1).max(999).optional(),
  message: z.string().trim().max(2000).optional(),
})

interface EquipmentForRequest {
  id: string
  salon_id: string
  name: string
  type: string
  price_per_day_cents: number
  price_per_hour_cents: number | null
  price_per_week_cents: number | null
  price_per_month_cents: number | null
  is_available: boolean
  salons?: { name?: string; city?: string; owner_id?: string } | null
}

/**
 * Unverbindliche Kostenschätzung. Gibt es keinen expliziten Preis für die
 * gewählte Dauer, wird über den Tagespreis hochgerechnet — so steht nie „0 €"
 * im Formular, nur weil der Vermieter keinen Wochenpreis gepflegt hat.
 */
function estimateRequestCents(
  equipment: Pick<
    EquipmentForRequest,
    'price_per_day_cents' | 'price_per_hour_cents' | 'price_per_week_cents' | 'price_per_month_cents'
  >,
  durationUnit: string,
  units: number,
): number {
  const explicit: Record<string, number | null> = {
    hour: equipment.price_per_hour_cents,
    day: equipment.price_per_day_cents,
    week: equipment.price_per_week_cents,
    month: equipment.price_per_month_cents,
  }

  const perUnit =
    explicit[durationUnit] ??
    Math.round(equipment.price_per_day_cents * (DAYS_PER_UNIT[durationUnit] ?? 1))

  return Math.max(0, Math.round(perUnit * units))
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
    }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const input = parsed.data

    const today = new Date().toISOString().slice(0, 10)
    if (input.preferredDate < today) {
      return NextResponse.json({ error: 'Datum liegt in der Vergangenheit' }, { status: 400 })
    }
    if (input.requestType === 'miete' && !input.message?.trim()) {
      return NextResponse.json(
        { error: 'Bitte schreibe dem Vermieter eine kurze Nachricht' },
        { status: 400 },
      )
    }

    const supabase = getSupabaseAdmin()
    const { data: rows, error: eqError } = await supabase
      .from('rental_equipment')
      .select(
        'id, salon_id, name, type, price_per_day_cents, price_per_hour_cents, ' +
          'price_per_week_cents, price_per_month_cents, is_available, salons(name, city, owner_id)',
      )
      .eq('id', input.equipmentId)
      .limit(1)

    if (eqError) {
      console.error('rental-requests equipment lookup failed:', eqError)
      return NextResponse.json({ error: 'Mietobjekt konnte nicht geladen werden' }, { status: 500 })
    }

    const equipment = rows?.[0] as unknown as EquipmentForRequest | undefined
    if (!equipment) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }
    if (!equipment.is_available) {
      return NextResponse.json({ error: 'Mietobjekt ist derzeit nicht verfügbar' }, { status: 409 })
    }

    const ownerId = equipment.salons?.owner_id ?? null
    if (ownerId && ownerId === session.user.id) {
      return NextResponse.json(
        { error: 'Eigenes Mietobjekt kann nicht angefragt werden' },
        { status: 400 },
      )
    }

    const isRental = input.requestType === 'miete'
    const durationUnit = isRental ? (input.durationUnit ?? 'hour') : null
    const units = isRental ? (input.units ?? 1) : null
    const estimatedCents =
      isRental && durationUnit && units ? estimateRequestCents(equipment, durationUnit, units) : 0

    const { data: request, error: insertError } = await supabase
      .from('rental_requests')
      .insert({
        equipment_id: equipment.id,
        salon_id: equipment.salon_id,
        requester_id: session.user.id,
        recipient_id: ownerId,
        request_type: input.requestType,
        preferred_date: input.preferredDate,
        preferred_time: input.preferredTime ?? null,
        duration_unit: durationUnit,
        units,
        message: input.message?.trim() || null,
        estimated_cents: estimatedCents,
        status: 'open',
      })
      .select('*')
      .single()

    if (insertError || !request) {
      console.error('rental-requests insert failed:', insertError)
      return NextResponse.json({ error: 'Anfrage konnte nicht gesendet werden' }, { status: 500 })
    }

    // Zustellung an den Vermieter — der eigentliche Punkt der Übung.
    if (ownerId) {
      const label = isRental ? 'Neue Mietanfrage' : 'Neue Besichtigungsanfrage'
      const requesterName = session.user.name || session.user.email || 'Ein Interessent'
      const summary = isRental
        ? `${requesterName} fragt „${equipment.name}" ab ${input.preferredDate} an (${units} × ${durationUnit}, ca. ${(estimatedCents / 100).toFixed(0)} €).`
        : `${requesterName} möchte „${equipment.name}" am ${input.preferredDate} besichtigen.`

      await createNotification(
        ownerId,
        label,
        summary,
        'message',
        String(request.id),
        'rental_request',
      )

      // E-Mail ist Beiwerk: schlägt sie fehl, ist die Anfrage trotzdem da.
      // Doppelversand-Schutz und Zustellstatus stecken in notifyLandlord…().
      try {
        await notifyLandlordOfRentalRequest({
          requestId: String(request.id),
          recipientId: ownerId,
          requestType: input.requestType,
          equipmentName: equipment.name,
          requesterName,
          preferredDate: input.preferredDate,
          preferredTime: input.preferredTime ?? null,
          durationUnit: durationUnit,
          units,
          estimatedCents,
          message: input.message?.trim() || null,
          salonName: equipment.salons?.name ?? null,
          city: equipment.salons?.city ?? null,
        })
      } catch (mailErr) {
        console.error('rental-request mail failed:', mailErr)
      }
    }

    return NextResponse.json({ request, estimatedCents }, { status: 201 })
  } catch (err) {
    console.error('rental-requests POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/**
 * Anfragen des eingeloggten Nutzers.
 * `?role=recipient` liefert die eingegangenen (Vermieter-Sicht),
 * sonst die selbst gestellten (Mieter-Sicht).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const role = new URL(req.url).searchParams.get('role')
    const column = role === 'recipient' ? 'recipient_id' : 'requester_id'

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('rental_requests')
      .select('*, rental_equipment(name, type, salon_id, salons(name, city))')
      .eq(column, session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('rental-requests GET failed:', error)
      return NextResponse.json({ error: 'Anfragen konnten nicht geladen werden' }, { status: 500 })
    }

    return NextResponse.json({ requests: data ?? [] })
  } catch (err) {
    console.error('rental-requests GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
