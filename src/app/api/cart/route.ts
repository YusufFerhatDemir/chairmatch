import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from '@/modules/auth/session'
import {
  CartError,
  MAX_QUANTITY_PER_ITEM,
  getCartItems,
  addToCart,
  removeFromCart,
  updateCartQuantity,
} from '@/modules/marketplace/marketplace.service'

/**
 * Warenkorb des eingeloggten Kunden.
 *
 * Bis Track 14 nahm POST `productId`, `variantId` und `quantity` roh aus dem
 * Body — `quantity || 1` liess auch `-5`, `0.5` und den String `"1"` durch,
 * und `variantId` wurde ueberhaupt nicht gegen das Produkt gehalten. Warum
 * das die Preisquelle des Shops war, steht in marketplace.service.ts.
 */

const UUID = z.string().uuid()

const addSchema = z
  .object({
    productId: UUID,
    variantId: UUID.nullable().optional(),
    quantity: z.coerce.number().int().min(1).max(MAX_QUANTITY_PER_ITEM).default(1),
  })
  .strict()

const patchSchema = z
  .object({
    itemId: UUID,
    quantity: z.coerce.number().int().min(0).max(MAX_QUANTITY_PER_ITEM),
  })
  .strict()

const deleteSchema = z.object({ itemId: UUID }).strict()

/** CartError traegt seinen HTTP-Status selbst; alles andere ist 500. */
function fehlerAntwort(err: unknown): NextResponse {
  if (err instanceof CartError) {
    return NextResponse.json({ error: err.message }, { status: err.status })
  }
  console.error('cart route error:', err)
  return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
}

async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    throw new CartError('Ungültiger JSON-Body', 400)
  }
}

/** Get cart items */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }
    const items = await getCartItems(session.user.id)
    return NextResponse.json(items)
  } catch (err) {
    return fehlerAntwort(err)
  }
}

/** Add to cart */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const parsed = addSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const data = await addToCart(
      session.user.id,
      parsed.data.productId,
      parsed.data.variantId ?? null,
      parsed.data.quantity,
    )
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return fehlerAntwort(err)
  }
}

/** Update cart item quantity */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const parsed = patchSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Ungültige Eingabe', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    await updateCartQuantity(session.user.id, parsed.data.itemId, parsed.data.quantity)
    return NextResponse.json({ success: true })
  } catch (err) {
    return fehlerAntwort(err)
  }
}

/** Remove from cart */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const parsed = deleteSchema.safeParse(await readJson(req))
    if (!parsed.success) {
      return NextResponse.json({ error: 'itemId erforderlich' }, { status: 400 })
    }

    await removeFromCart(session.user.id, parsed.data.itemId)
    return NextResponse.json({ success: true })
  } catch (err) {
    return fehlerAntwort(err)
  }
}
