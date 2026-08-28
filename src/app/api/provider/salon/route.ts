import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { ListingError, getOwnedSalon } from '@/modules/rentals/listing.service'
import { openingHoursSchema } from '@/lib/opening-hours'

/**
 * Stammdaten des eigenen Salons.
 *
 * Bis Track 14 gab es hier KEIN Schema: `for (const key of allowed) if (key in
 * body) updates[key] = body[key]`. Die Allowlist entschied nur, WELCHE
 * Spalte beschrieben wird, nicht WOMIT — `name: {}`, `postal_code: 12345`
 * (Zahl statt String) oder ein 2-MB-`description` gingen unveraendert in die
 * Tabelle, aus der die oeffentliche Salon-Seite und der Schema.org-Export
 * lesen. Offener Punkt aus Track 13, jetzt geschlossen.
 *
 * Der zweite Fund derselben Route betrifft `opening_hours`: das Dashboard
 * schickt ausgeschriebene Tagesnamen, gelesen werden Kuerzel. Warum das den
 * Salon unbuchbar machte, steht in src/lib/opening-hours.ts.
 *
 * `.single()` auf `salons` ist ausserdem `getOwnedSalon` gewichen — bei zwei
 * Salons antwortet PostgREST mit PGRST116, und der Inhaber bekam „Kein Salon
 * gefunden".
 */

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional()

const patchSchema = z
  .object({
    name: z.string().trim().min(2, 'Name zu kurz').max(160).optional(),
    description: optionalText(4000),
    city: optionalText(120),
    street: optionalText(180),
    house_number: optionalText(20),
    postal_code: optionalText(12),
    phone: optionalText(40),
    email: z.union([z.string().trim().email('Ungültige E-Mail').max(180), z.literal('')]).nullable().optional(),
    // Anbieter tippen „example.de" ohne Schema — das war bisher erlaubt und
    // soll es bleiben; ergaenzt wird https://, geprueft wird danach.
    website: z
      .union([z.string().trim().max(300), z.literal('')])
      .nullable()
      .optional()
      .transform(wert => {
        if (wert === null || wert === undefined || wert === '') return wert
        return /^https?:\/\//i.test(wert) ? wert : `https://${wert}`
      })
      .refine(
        wert =>
          wert === null || wert === undefined || wert === '' || URL.canParse(wert),
        'Ungültige Webadresse',
      ),
    opening_hours: openingHoursSchema.optional(),
    category: optionalText(60),
    logo_url: optionalText(500),
    cover_url: optionalText(500),
  })
  .strict()

export async function PATCH(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
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
      { error: parsed.error.issues[0].message, details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const updates: Record<string, unknown> = { ...parsed.data }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  let salon
  try {
    salon = await getOwnedSalon(supabase, session.user.id)
  } catch (err) {
    const status = err instanceof ListingError ? err.status : 500
    return NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status })
  }
  if (!salon) {
    return NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 })
  }

  const { error } = await supabase.from('salons').update(updates).eq('id', salon.id)

  if (error) {
    console.error('provider/salon PATCH failed:', error)
    return NextResponse.json({ error: 'Salon konnte nicht gespeichert werden' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
