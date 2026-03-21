import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { createOrder, getOrdersByCustomer } from '@/modules/marketplace/marketplace.service'

/** List customer orders */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const orders = await getOrdersByCustomer(session.user.id)
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Create order from cart */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const { name, street, city, postalCode } = await req.json()
    if (!name || !street || !city || !postalCode) {
      return NextResponse.json({ error: 'Lieferadresse unvollständig' }, { status: 400 })
    }

    const order = await createOrder(session.user.id, { name, street, city, postalCode })
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Interner Fehler'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
