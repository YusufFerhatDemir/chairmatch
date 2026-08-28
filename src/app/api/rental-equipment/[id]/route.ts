import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  LISTING_COLUMNS,
  ListingError,
  requireOwnedEquipment,
} from '@/modules/rentals/listing.service'
import { SALON_SUSPENDED_MESSAGE, salonAcceptsBusiness } from '@/lib/salon-status'

/**
 * Einzelnes Mietobjekt (Track E).
 *
 * GET    : öffentliche Detaildaten eines buchbaren Mietobjekts
 *          (das Anfrage-/Buchungsformular braucht Name, Preise, Salon)
 * PATCH  : bearbeiten — nur der Salon-Inhaber
 * DELETE : löschen — nur der Salon-Inhaber, und nur ohne aktive Buchungen
 */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const TIME_RE = /^\d{2}:\d{2}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const centsField = z.coerce.number().int().min(0).max(10_000_000)

const patchSchema = z
  .object({
    type: z.enum(['stuhl', 'liege', 'raum', 'opraum']).optional(),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    price_per_day_cents: centsField.optional(),
    price_per_hour_cents: centsField.nullable().optional(),
    price_per_week_cents: centsField.nullable().optional(),
    price_per_month_cents: centsField.nullable().optional(),
    available_days: z.array(z.enum(DAYS)).max(7).optional(),
    available_from: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
    available_to: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
    features: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
    is_available: z.boolean().optional(),
  })
  .strict()

/** Buchungen, die ein Löschen blockieren — bezahlt oder in Kürze aktiv. */
const BLOCKING_STATUSES = ['pending', 'confirmed', 'active']

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('rental_equipment')
      .select(`${LISTING_COLUMNS}, salons(id, name, city, slug, is_active)`)
      .eq('id', id)
      .limit(1)

    if (error) {
      console.error('rental-equipment [id] GET failed:', error)
      return NextResponse.json({ error: 'Mietobjekt konnte nicht geladen werden' }, { status: 500 })
    }

    const row = data?.[0]
    if (!row) {
      return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
    }

    // Diese Route versorgt das Buchungs- und Anfrageformular unter
    // /inserat/[id]. Gehoert das Objekt zu einem gesperrten Salon, faengt der
    // Absendeknopf jetzt zwar in /api/rental-bookings bzw. /api/rental-requests
    // eine 409 — das Formular soll den Mieter aber gar nicht erst Datum und
    // Zeitraum eingeben lassen. Siehe src/lib/salon-status.ts.
    const salon = (row as { salons?: { is_active?: boolean | null } | null }).salons
    if (salon && !salonAcceptsBusiness(salon)) {
      return NextResponse.json({ error: SALON_SUSPENDED_MESSAGE }, { status: 409 })
    }

    return NextResponse.json({ equipment: row })
  } catch (err) {
    console.error('rental-equipment [id] GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }
  const patch = parsed.data
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }
  if (patch.available_from && patch.available_to && patch.available_to <= patch.available_from) {
    return NextResponse.json({ error: 'Endzeit muss nach der Startzeit liegen' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const current = await requireOwnedEquipment(supabase, id, session.user.id)

    const effectiveDayPrice = patch.price_per_day_cents ?? current.price_per_day_cents
    if (patch.is_available === true && effectiveDayPrice <= 0) {
      return NextResponse.json(
        { error: 'Mietobjekt braucht einen Tagespreis, bevor es online gehen kann' },
        { status: 400 },
      )
    }
    const forceOffline = effectiveDayPrice <= 0 ? { is_available: false } : {}

    const { data, error } = await supabase
      .from('rental_equipment')
      .update({ ...patch, ...forceOffline, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(LISTING_COLUMNS)
      .single()

    if (error || !data) {
      console.error('rental-equipment PATCH failed:', error)
      return NextResponse.json({ error: 'Mietobjekt konnte nicht gespeichert werden' }, { status: 500 })
    }

    return NextResponse.json({ equipment: data })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('rental-equipment PATCH error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Mietobjekt nicht gefunden' }, { status: 404 })
  }

  try {
    const supabase = getSupabaseAdmin()
    await requireOwnedEquipment(supabase, id, session.user.id)

    // Löschen würde per ON DELETE CASCADE auch bezahlte Buchungen mitnehmen.
    const { data: blocking, error: bookingError } = await supabase
      .from('rental_bookings')
      .select('id, status')
      .eq('equipment_id', id)
      .in('status', BLOCKING_STATUSES)
      .limit(1)

    if (bookingError) {
      console.error('rental-equipment delete precheck failed:', bookingError)
      return NextResponse.json({ error: 'Buchungen konnten nicht geprüft werden' }, { status: 500 })
    }
    if (blocking && blocking.length > 0) {
      return NextResponse.json(
        {
          error:
            'Mietobjekt hat offene oder laufende Buchungen. Bitte zuerst offline nehmen (is_available = false).',
        },
        { status: 409 },
      )
    }

    const { error } = await supabase.from('rental_equipment').delete().eq('id', id)
    if (error) {
      console.error('rental-equipment DELETE failed:', error)
      return NextResponse.json({ error: 'Mietobjekt konnte nicht gelöscht werden' }, { status: 500 })
    }

    return NextResponse.json({ deleted: id })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('rental-equipment DELETE error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
