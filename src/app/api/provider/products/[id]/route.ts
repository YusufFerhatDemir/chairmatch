import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Provider: update own product */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const supabase = getSupabaseAdmin()

    // Verify ownership
    const { data: salon } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', session.user.id)
      .single()

    if (!salon) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = body.name
    if (body.description !== undefined) update.description = body.description
    if (body.priceCents !== undefined) update.price_cents = body.priceCents
    if (body.categoryId !== undefined) update.category_id = body.categoryId
    if (body.brand !== undefined) update.brand = body.brand
    if (body.images !== undefined) update.images = body.images
    if (body.target !== undefined) update.target = body.target
    if (body.stockQuantity !== undefined) update.stock_quantity = body.stockQuantity
    if (body.isActive !== undefined) update.is_active = body.isActive

    const { data, error } = await supabase
      .from('products')
      .update(update)
      .eq('id', id)
      .eq('salon_id', salon.id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Provider: delete own product (soft delete) */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: salon } = await supabase
      .from('salons')
      .select('id')
      .eq('owner_id', session.user.id)
      .single()

    if (!salon) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const { error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .eq('salon_id', salon.id)

    if (error) return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
