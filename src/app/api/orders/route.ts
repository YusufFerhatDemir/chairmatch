import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import { CartError, createOrder, getOrdersByCustomer } from '@/modules/marketplace/marketplace.service'

/**
 * Bestellungen des eingeloggten Kunden.
 *
 * Die Lieferadresse wurde bis Track 14 nur auf „irgendwie wahr" geprueft
 * (`if (!name || !street …)`) — ein leerer String war damit ausgeschlossen,
 * ein Objekt, eine Zahl oder ein 50-KB-Text nicht. Genau diese vier Felder
 * stehen spaeter auf dem Versandetikett.
 */

const shippingSchema = z
  .object({
    name: z.string().trim().min(2, 'Name zu kurz').max(120),
    street: z.string().trim().min(3, 'Straße zu kurz').max(180),
    city: z.string().trim().min(2, 'Ort zu kurz').max(120),
    postalCode: z.string().trim().min(3, 'PLZ zu kurz').max(12),
  })
  .strict()

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

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungültiger JSON-Body' }, { status: 400 })
    }

    const parsed = shippingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Lieferadresse unvollständig', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const order = await createOrder(session.user.id, parsed.data)
    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    if (err instanceof CartError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('orders POST error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
