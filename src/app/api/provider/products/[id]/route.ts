import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ListingError, getOwnedSalon } from '@/modules/rentals/listing.service'

/**
 * Einzelnes Produkt des Anbieters.
 *
 * `.eq('salon_id', salon.id)` ist der Besitznachweis — eine fremde Produkt-ID
 * trifft keine Zeile. Neu in Track 14: ein Schema (vorher wurde jeder
 * bekannte Schluessel roh aus dem Body kopiert, `priceCents` eingeschlossen)
 * und `getOwnedSalon` statt `.single()`, das Anbieter mit zwei Salons
 * ausgesperrt hat.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const centsField = z.coerce.number().int().min(0).max(10_000_000)

const patchSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    priceCents: centsField.optional(),
    categoryId: z.string().uuid().nullable().optional(),
    brand: z.string().trim().max(120).nullable().optional(),
    images: z.array(z.string().trim().min(1).max(2000)).max(12).optional(),
    target: z.enum(['b2c', 'b2b', 'both']).optional(),
    stockQuantity: z.coerce.number().int().min(0).max(1_000_000).optional(),
    isUnlimitedStock: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

async function ownedSalonId(userId: string): Promise<{ salonId: string } | { response: NextResponse }> {
  try {
    const salon = await getOwnedSalon(getSupabaseAdmin(), userId)
    if (!salon) {
      return { response: NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 }) }
    }
    return { salonId: salon.id }
  } catch (err) {
    const status = err instanceof ListingError ? err.status : 500
    return { response: NextResponse.json({ error: 'Salon konnte nicht geladen werden' }, { status }) }
  }
}

/** Provider: update own product */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
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
    const input = parsed.data

    const owned = await ownedSalonId(session.user.id)
    if ('response' in owned) return owned.response

    const update: Record<string, unknown> = {}
    if (input.name !== undefined) update.name = input.name
    if (input.description !== undefined) update.description = input.description
    if (input.priceCents !== undefined) update.price_cents = input.priceCents
    if (input.categoryId !== undefined) update.category_id = input.categoryId
    if (input.brand !== undefined) update.brand = input.brand
    if (input.images !== undefined) update.images = input.images
    if (input.target !== undefined) update.target = input.target
    if (input.stockQuantity !== undefined) update.stock_quantity = input.stockQuantity
    if (input.isUnlimitedStock !== undefined) update.is_unlimited_stock = input.isUnlimitedStock
    if (input.isActive !== undefined) update.is_active = input.isActive

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Keine Änderungen übermittelt' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .eq('salon_id', owned.salonId)
      .select()

    if (error) {
      console.error('provider/products PATCH failed:', error)
      return NextResponse.json({ error: 'Produkt konnte nicht gespeichert werden' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json(data[0])
  } catch (err) {
    console.error('provider/products PATCH error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Provider: delete own product (soft delete) */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }

    const owned = await ownedSalonId(session.user.id)
    if ('response' in owned) return owned.response

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('salon_id', owned.salonId)
      .select('id')

    if (error) {
      console.error('provider/products DELETE failed:', error)
      return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
    }
    // Vorher meldete die Route auch dann `success: true`, wenn die ID zu einem
    // fremden Salon gehoerte und nichts getroffen wurde.
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('provider/products DELETE error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
