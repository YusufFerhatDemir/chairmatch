import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getCartItems, addToCart, removeFromCart, updateCartQuantity } from '@/modules/marketplace/marketplace.service'

/** Get cart items */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const items = await getCartItems(session.user.id)
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Add to cart */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const { productId, variantId, quantity } = await req.json()
    if (!productId) return NextResponse.json({ error: 'productId erforderlich' }, { status: 400 })

    const { data, error } = await addToCart(session.user.id, productId, variantId || null, quantity || 1)
    if (error) return NextResponse.json({ error: 'Fehler beim Hinzufügen' }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Update cart item quantity */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const { itemId, quantity } = await req.json()
    if (!itemId) return NextResponse.json({ error: 'itemId erforderlich' }, { status: 400 })

    await updateCartQuantity(session.user.id, itemId, quantity)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Remove from cart */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const { itemId } = await req.json()
    if (!itemId) return NextResponse.json({ error: 'itemId erforderlich' }, { status: 400 })

    await removeFromCart(session.user.id, itemId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
