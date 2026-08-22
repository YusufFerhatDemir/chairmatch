import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ListingError, getOwnedSalon, requireOwnedSalon } from '@/modules/rentals/listing.service'

/**
 * Salon-Stammdaten des eingeloggten Anbieters.
 *
 * Ersetzt `cm_anbieter_beschreibung` und `cm_anbieter_zeiten`.
 *
 * Format der Öffnungszeiten ist bewusst das bereits etablierte:
 * `{ "Mo": "09:00 - 18:00", ..., "So": "Geschlossen" }` — genau das lesen
 * schon `lib/scheduling.ts`, `api/availability` und der Schema.org-Export.
 * Ein zweites Format hätte die Buchungslogik still ausgehebelt.
 */

const DAY_KEYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
const HOURS_RE = /^(?:Geschlossen|\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})$/

const patchSchema = z
  .object({
    description: z.string().trim().max(4000).optional(),
    opening_hours: z
      .record(z.enum(DAY_KEYS), z.string().regex(HOURS_RE, 'Format: "09:00 - 18:00" oder "Geschlossen"'))
      .optional(),
    logo_url: z.string().max(500).nullable().optional(),
    gallery: z.array(z.string().max(500)).max(24).optional(),
  })
  .strict()

export async function GET() {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const salon = await getOwnedSalon(supabase, session.user.id)
    if (!salon) return NextResponse.json({ salon: null })

    const { data, error } = await supabase
      .from('salons')
      .select('id, name, description, opening_hours, logo_url, gallery')
      .eq('id', salon.id)
      .single()

    if (error) {
      console.error('me/salon GET failed:', error)
      return NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status: 500 })
    }

    return NextResponse.json({ salon: data })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('me/salon GET error:', err)
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
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }

  try {
    const supabase = getSupabaseAdmin()
    const salon = await requireOwnedSalon(supabase, session.user.id)

    const { data, error } = await supabase
      .from('salons')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', salon.id)
      .select('id, name, description, opening_hours, logo_url, gallery')
      .single()

    if (error) {
      console.error('me/salon PATCH failed:', error)
      return NextResponse.json({ error: 'Salon konnte nicht gespeichert werden' }, { status: 500 })
    }

    return NextResponse.json({ salon: data })
  } catch (err) {
    if (err instanceof ListingError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('me/salon PATCH error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
