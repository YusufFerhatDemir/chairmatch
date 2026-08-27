import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { ListingError, getOwnedSalon } from '@/modules/rentals/listing.service'

/**
 * Leistungen des eingeloggten Anbieters.
 *
 * Drei Dinge standen hier bis Track 10 schief:
 *
 * 1. KEIN GET. Die Seite /anbieter/mein-salon/services hatte damit gar keine
 *    Quelle und zeigte stattdessen eine fest verdrahtete "0" mit dem Zusatz
 *    "Noch keine Services" — auch fuer einen Salon mit acht gepflegten
 *    Leistungen. Der Anbieter sah seinen eigenen Bestand als leer.
 *
 * 2. `getOwnedSalonId` benutzte `.single()`. PostgREST beantwortet das mit
 *    einem Fehler, sobald der Nutzer MEHR als einen Salon hat (PGRST116) —
 *    dann kam `data` als undefined zurueck und der Anbieter bekam
 *    "Kein Salon" 404, obwohl er zwei hat. Jetzt laeuft das ueber
 *    `getOwnedSalon` (order + limit 1), dieselbe Auswahl wie in
 *    /api/me/salon und /api/me/listing.
 *
 * 3. KEINE VALIDIERUNG. POST schrieb `body.name` ungeprueft (auch leer oder
 *    beliebig lang) und `body.price_cents || 0` ungeprueft — ein negativer
 *    Preis oder ein String landete unveraendert in der Spalte, die die
 *    Buchung spaeter als Geldbetrag liest. PATCH kopierte jeden erlaubten
 *    Schluessel roh aus dem Body.
 */

const SERVICE_COLUMNS =
  'id, salon_id, name, description, duration_minutes, price_cents, is_active, sort_order, created_at'

/** Preise in Cent: nicht negativ, und nicht groesser als 100.000 €. */
const centsField = z.coerce.number().int().min(0).max(10_000_000)
const durationField = z.coerce.number().int().min(5).max(24 * 60)

const createSchema = z
  .object({
    name: z.string().trim().min(2, 'Name braucht mindestens 2 Zeichen').max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    duration_minutes: durationField.default(30),
    price_cents: centsField.default(0),
    sort_order: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .strict()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const patchSchema = z
  .object({
    id: z.string().regex(UUID_RE, 'Ungültige Leistungs-ID'),
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    duration_minutes: durationField.optional(),
    price_cents: centsField.optional(),
    is_active: z.boolean().optional(),
    sort_order: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .strict()

const deleteSchema = z.object({ id: z.string().regex(UUID_RE, 'Ungültige Leistungs-ID') }).strict()

/**
 * Salon des Nutzers oder eine fertige Antwort, warum es keinen gibt.
 * Bewusst kein Wurf: alle vier Handler brauchen genau diese Verzweigung.
 */
async function ownedSalonId(
  userId: string,
): Promise<{ salonId: string } | { response: NextResponse }> {
  try {
    const salon = await getOwnedSalon(getSupabaseAdmin(), userId)
    if (!salon) {
      return {
        response: NextResponse.json(
          { error: 'Kein Salon hinterlegt. Bitte zuerst das Anbieter-Onboarding abschließen.' },
          { status: 404 },
        ),
      }
    }
    return { salonId: salon.id }
  } catch (err) {
    const status = err instanceof ListingError ? err.status : 500
    return {
      response: NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status }),
    }
  }
}

async function requireProvider(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return { response: NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 }) }
  }
  return { userId: session.user.id }
}

/** Body lesen; ungueltiges JSON ist 400, nicht 500. */
async function readJson(req: NextRequest): Promise<{ body: unknown } | { response: NextResponse }> {
  try {
    return { body: await req.json() }
  } catch {
    return { response: NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 }) }
  }
}

/** GET /api/provider/services — eigene Leistungen, aktive wie inaktive. */
export async function GET() {
  const who = await requireProvider()
  if ('response' in who) return who.response

  const owned = await ownedSalonId(who.userId)
  if ('response' in owned) return owned.response

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('services')
    .select(SERVICE_COLUMNS)
    .eq('salon_id', owned.salonId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) {
    console.error('provider/services GET failed:', error)
    return NextResponse.json({ error: 'Leistungen konnten nicht geladen werden' }, { status: 500 })
  }

  const services = data ?? []
  return NextResponse.json({
    services,
    // Die Zahl, die die Seite gross anzeigt — hier gerechnet, damit sie
    // nicht im Browser aus einer eventuell gefilterten Liste entsteht.
    activeCount: services.filter(s => s.is_active).length,
  })
}

export async function POST(req: NextRequest) {
  const who = await requireProvider()
  if ('response' in who) return who.response

  const json = await readJson(req)
  if ('response' in json) return json.response

  const parsed = createSchema.safeParse(json.body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const owned = await ownedSalonId(who.userId)
  if ('response' in owned) return owned.response

  const supabase = getSupabaseAdmin()
  const { error, data } = await supabase
    .from('services')
    .insert({
      salon_id: owned.salonId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      duration_minutes: parsed.data.duration_minutes,
      price_cents: parsed.data.price_cents,
      is_active: true,
      sort_order: parsed.data.sort_order,
    })
    .select(SERVICE_COLUMNS)
    .single()

  if (error) {
    console.error('provider/services POST failed:', error)
    return NextResponse.json({ error: 'Leistung konnte nicht angelegt werden' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const who = await requireProvider()
  if ('response' in who) return who.response

  const json = await readJson(req)
  if ('response' in json) return json.response

  const parsed = patchSchema.safeParse(json.body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message, details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { id, ...updates } = parsed.data
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
  }

  const owned = await ownedSalonId(who.userId)
  if ('response' in owned) return owned.response

  const supabase = getSupabaseAdmin()
  // `.eq('salon_id', ...)` ist der Besitznachweis: eine fremde Leistungs-ID
  // trifft keine Zeile und aendert nichts.
  const { data, error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', id)
    .eq('salon_id', owned.salonId)
    .select(SERVICE_COLUMNS)

  if (error) {
    console.error('provider/services PATCH failed:', error)
    return NextResponse.json({ error: 'Leistung konnte nicht gespeichert werden' }, { status: 500 })
  }
  // Vorher meldete die Route auch dann `success: true`, wenn die ID zu einem
  // fremden Salon gehoerte und nichts getroffen wurde.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Leistung nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ success: true, service: data[0] })
}

export async function DELETE(req: NextRequest) {
  const who = await requireProvider()
  if ('response' in who) return who.response

  const json = await readJson(req)
  if ('response' in json) return json.response

  const parsed = deleteSchema.safeParse(json.body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const owned = await ownedSalonId(who.userId)
  if ('response' in owned) return owned.response

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('services')
    .delete()
    .eq('id', parsed.data.id)
    .eq('salon_id', owned.salonId)
    .select('id')

  if (error) {
    console.error('provider/services DELETE failed:', error)
    return NextResponse.json({ error: 'Leistung konnte nicht gelöscht werden' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Leistung nicht gefunden' }, { status: 404 })
  }

  return NextResponse.json({ success: true, id: parsed.data.id })
}
