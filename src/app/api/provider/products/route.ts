import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ListingError, getOwnedSalon } from '@/modules/rentals/listing.service'
import {
  getProductsBySalon,
  getOrCreateSalonSeller,
  slugify,
} from '@/modules/marketplace/marketplace.service'

/**
 * Produkte des eingeloggten Anbieters.
 *
 * Zwei Dinge standen hier bis Track 14 schief:
 *
 * 1. KEINE VALIDIERUNG. `priceCents` wurde roh uebernommen — negativ, als
 *    String, in beliebiger Groesse. Genau dieser Wert wird spaeter zum
 *    Stueckpreis einer Bestellposition und damit zu `unit_amount` der
 *    Stripe-Line-Items.
 * 2. `is_unlimited_stock: !stockQuantity`. Wer `stockQuantity: 0` angab, also
 *    „ausverkauft", bekam damit „unbegrenzt lieferbar". Der Lagerbestand ist
 *    jetzt ein eigenes, ausdrueckliches Feld.
 *
 * Dazu der bekannte `.single()`-Fehler auf `salons`: bei zwei Salons
 * antwortet PostgREST mit PGRST116, und der Anbieter bekam „Kein Salon
 * gefunden" — dieselbe Stelle, die in /api/provider/services schon ueber
 * getOwnedSalon laeuft.
 */

const centsField = z.coerce.number().int().min(0).max(10_000_000)

const createSchema = z
  .object({
    name: z.string().trim().min(2, 'Name zu kurz').max(160),
    description: z.string().trim().max(5000).nullable().optional(),
    priceCents: centsField,
    categoryId: z.string().uuid().nullable().optional(),
    brand: z.string().trim().max(120).nullable().optional(),
    images: z.array(z.string().trim().min(1).max(2000)).max(12).optional(),
    target: z.enum(['b2c', 'b2b', 'both']).default('b2c'),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
    isUnlimitedStock: z.boolean().optional(),
  })
  .strict()

async function ownedSalonId(userId: string): Promise<{ salonId: string } | { response: NextResponse }> {
  try {
    const salon = await getOwnedSalon(getSupabaseAdmin(), userId)
    if (!salon) {
      return {
        response: NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 }),
      }
    }
    return { salonId: salon.id }
  } catch (err) {
    const status = err instanceof ListingError ? err.status : 500
    return { response: NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status }) }
  }
}

/** Provider: list own salon products */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const owned = await ownedSalonId(session.user.id)
    if ('response' in owned) return owned.response

    const products = await getProductsBySalon(owned.salonId)
    return NextResponse.json(products)
  } catch (err) {
    console.error('provider/products GET error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Provider: create product */
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
        { error: parsed.error.issues[0].message, details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }
    const input = parsed.data

    const owned = await ownedSalonId(session.user.id)
    if ('response' in owned) return owned.response

    const supabase = getSupabaseAdmin()
    const seller = await getOrCreateSalonSeller(session.user.id, owned.salonId)

    // Wer gar keinen Bestand pflegt, fuehrt keinen — das war auch bisher das
    // Verhalten des Dashboard-Formulars, das kein Bestandsfeld hat. Wer eine
    // 0 ANGIBT, meint aber „ausverkauft"; vorher machte `!stockQuantity`
    // daraus „unbegrenzt lieferbar".
    const unlimited = input.isUnlimitedStock ?? input.stockQuantity === undefined
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        seller_id: seller.id,
        salon_id: owned.salonId,
        category_id: input.categoryId ?? null,
        name: input.name,
        slug: slugify(input.name) + '-' + Date.now().toString(36),
        description: input.description ?? null,
        price_cents: input.priceCents,
        brand: input.brand ?? null,
        images: input.images ?? [],
        target: input.target,
        stock_quantity: unlimited ? 0 : (input.stockQuantity ?? 0),
        is_unlimited_stock: unlimited,
      })
      .select('*, product_categories(slug, name)')
      .single()

    if (error) {
      console.error('provider/products POST failed:', error)
      return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
    }
    return NextResponse.json(product, { status: 201 })
  } catch (err) {
    console.error('provider/products POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
