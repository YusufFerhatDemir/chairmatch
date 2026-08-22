import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  LISTING_COLUMNS,
  ListingError,
  requireOwnedSalon,
} from '@/modules/rentals/listing.service'

/**
 * CRUD für Mietobjekte (Track E) — bisher wurde rental_equipment nur gelesen.
 *
 * GET  : alle Mietobjekte des eingeloggten Vermieters
 * POST : neues Mietobjekt in seinem Salon anlegen
 *
 * Einzeln bearbeiten/löschen: /api/rental-equipment/[id]
 */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const TIME_RE = /^\d{2}:\d{2}$/
const centsField = z.coerce.number().int().min(0).max(10_000_000)

const createSchema = z.object({
  type: z.enum(['stuhl', 'liege', 'raum', 'opraum']),
  name: z.string().trim().min(2, 'Name zu kurz').max(120),
  description: z.string().trim().max(2000).optional(),
  price_per_day_cents: centsField,
  price_per_hour_cents: centsField.nullable().optional(),
  price_per_week_cents: centsField.nullable().optional(),
  price_per_month_cents: centsField.nullable().optional(),
  available_days: z.array(z.enum(DAYS)).max(7).optional(),
  available_from: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
  available_to: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
  features: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  is_available: z.boolean().optional(),
})

/** Wie viele Mietobjekte ein Salon anlegen darf — Bremse gegen Spam-Inserate. */
const MAX_PER_SALON = 30

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const salon = await requireOwnedSalon(supabase, session.user.id)

    const { data, error } = await supabase
      .from('rental_equipment')
      .select(LISTING_COLUMNS)
      .eq('salon_id', salon.id)
      .order('created_at', { ascending: true })
      .limit(MAX_PER_SALON)

    if (error) {
      console.error('rental-equipment GET failed:', error)
      return NextResponse.json({ error: 'Mietobjekte konnten nicht geladen werden' }, { status: 500 })
    }

    return NextResponse.json({ equipment: data ?? [], salon: { id: salon.id, name: salon.name } })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('rental-equipment GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

  if (input.available_from && input.available_to && input.available_to <= input.available_from) {
    return NextResponse.json({ error: 'Endzeit muss nach der Startzeit liegen' }, { status: 400 })
  }
  if (input.is_available && input.price_per_day_cents <= 0) {
    return NextResponse.json(
      { error: 'Mietobjekt braucht einen Tagespreis, bevor es online gehen kann' },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseAdmin()
    const salon = await requireOwnedSalon(supabase, session.user.id)

    const { data: existing, error: countError } = await supabase
      .from('rental_equipment')
      .select('id')
      .eq('salon_id', salon.id)
      .limit(MAX_PER_SALON + 1)

    if (countError) {
      console.error('rental-equipment count failed:', countError)
      return NextResponse.json({ error: 'Mietobjekte konnten nicht geprüft werden' }, { status: 500 })
    }
    if ((existing?.length ?? 0) >= MAX_PER_SALON) {
      return NextResponse.json(
        { error: `Maximal ${MAX_PER_SALON} Mietobjekte pro Salon` },
        { status: 409 },
      )
    }

    const { data, error } = await supabase
      .from('rental_equipment')
      .insert({
        salon_id: salon.id,
        ...input,
        is_available: input.is_available ?? input.price_per_day_cents > 0,
      })
      .select(LISTING_COLUMNS)
      .single()

    if (error || !data) {
      console.error('rental-equipment insert failed:', error)
      return NextResponse.json({ error: 'Mietobjekt konnte nicht angelegt werden' }, { status: 500 })
    }

    return NextResponse.json({ equipment: data }, { status: 201 })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('rental-equipment POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
