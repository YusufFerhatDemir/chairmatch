import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getProductsBySalon, getOrCreateSalonSeller, slugify } from '@/modules/marketplace/marketplace.service'

/** Provider: list own salon products */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    const { data: salon } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', session.user.id)
      .single()

    if (!salon) return NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 })

    const products = await getProductsBySalon(salon.id)
    return NextResponse.json(products)
  } catch {
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

    const supabase = getSupabaseAdmin()
    const { data: salon } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', session.user.id)
      .single()

    if (!salon) return NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 })

    const body = await req.json()
    const { name, description, priceCents, categoryId, brand, images, target, stockQuantity } = body

    if (!name || !priceCents) {
      return NextResponse.json({ error: 'Name und Preis erforderlich' }, { status: 400 })
    }

    const seller = await getOrCreateSalonSeller(session.user.id, salon.id)

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        seller_id: seller.id,
        salon_id: salon.id,
        category_id: categoryId || null,
        name,
        slug: slugify(name) + '-' + Date.now().toString(36),
        description: description || null,
        price_cents: priceCents,
        brand: brand || null,
        images: images || [],
        target: target || 'b2c',
        stock_quantity: stockQuantity ?? 0,
        is_unlimited_stock: !stockQuantity,
      })
      .select('*, product_categories(slug, name)')
      .single()

    if (error) return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 })
    return NextResponse.json(product, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
