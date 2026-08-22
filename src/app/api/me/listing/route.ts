import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import {
  LISTING_COLUMNS,
  ListingError,
  ensurePrimaryListing,
  getPrimaryListing,
} from '@/modules/rentals/listing.service'

/**
 * Haupt-Inserat des eingeloggten Vermieters.
 *
 * Ersetzt `cm_vermieter_preise`, `cm_vermieter_verfuegbarkeit` und
 * `cm_vermieter_ausstattung` — alle drei Seiten bearbeiten dieselbe
 * rental_equipment-Zeile.
 *
 * Preise kommen in Cent, nicht in Euro: der Buchungs-/Stripe-Pfad rechnet
 * durchgängig in Cent, und Fließkomma-Euros hätten hier Rundungsfehler in
 * echte Rechnungsbeträge getragen.
 */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const TIME_RE = /^\d{2}:\d{2}$/

const centsField = z.coerce.number().int().min(0).max(10_000_000)

const patchSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: z.enum(['stuhl', 'liege', 'raum', 'opraum']).optional(),
    description: z.string().trim().max(2000).optional(),
    price_per_hour_cents: centsField.nullable().optional(),
    price_per_day_cents: centsField.optional(),
    price_per_week_cents: centsField.nullable().optional(),
    price_per_month_cents: centsField.nullable().optional(),
    available_days: z.array(z.enum(DAYS)).max(7).optional(),
    available_from: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
    available_to: z.string().regex(TIME_RE, 'Format: HH:MM').nullable().optional(),
    features: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
    images: z.array(z.string().max(500)).max(24).optional(),
    is_available: z.boolean().optional(),
  })
  .strict()

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const listing = await getPrimaryListing(supabase, session.user.id)
    return NextResponse.json({ listing })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('me/listing GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
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

  if (
    patch.available_from &&
    patch.available_to &&
    patch.available_to <= patch.available_from
  ) {
    return NextResponse.json({ error: 'Endzeit muss nach der Startzeit liegen' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const listing = await ensurePrimaryListing(supabase, session.user.id)

    // Ohne Tagespreis darf ein Inserat nicht online gehen — sonst könnte
    // jemand es für 0 € buchen.
    const effectiveDayPrice = patch.price_per_day_cents ?? listing.price_per_day_cents
    if (patch.is_available === true && effectiveDayPrice <= 0) {
      return NextResponse.json(
        { error: 'Inserat braucht einen Tagespreis, bevor es online gehen kann' },
        { status: 400 },
      )
    }
    // Tagespreis auf 0 gesetzt → Inserat automatisch offline nehmen.
    const forceOffline = effectiveDayPrice <= 0 ? { is_available: false } : {}

    const { data, error } = await supabase
      .from('rental_equipment')
      .update({ ...patch, ...forceOffline, updated_at: new Date().toISOString() })
      .eq('id', listing.id)
      .select(LISTING_COLUMNS)
      .single()

    if (error) {
      console.error('me/listing PATCH failed:', error)
      return NextResponse.json({ error: 'Inserat konnte nicht gespeichert werden' }, { status: 500 })
    }

    return NextResponse.json({ listing: data })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('me/listing PATCH error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
