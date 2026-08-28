import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Generate a human-readable order number: CM-YYYYMMDD-XXX */
export function generateOrderNumber(): string {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const rand = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')
  return `CM-${date}-${rand}`
}

/** Slugify a product name */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äö]/g, m => m === 'ä' ? 'ae' : 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

interface ProductFilters {
  category?: string
  target?: 'b2c' | 'b2b' | 'both'
  search?: string
  salonId?: string
  sellerId?: string
  limit?: number
  offset?: number
}

/** Get products with filters */
export async function getProducts(filters: ProductFilters) {
  const supabase = getSupabaseAdmin()
  let query = supabase
    .from('products')
    .select('*, product_categories(slug, name), sellers(company_name, seller_type, salon_id)')
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters.category) {
    const { data: cat } = await supabase.from('product_categories').select('id').eq('slug', filters.category).single()
    if (cat) query = query.eq('category_id', cat.id)
  }
  if (filters.target) query = query.eq('target', filters.target)
  if (filters.salonId) query = query.eq('salon_id', filters.salonId)
  if (filters.sellerId) query = query.eq('seller_id', filters.sellerId)
  if (filters.search) {
    const q = filters.search.replace(/[%_]/g, '')
    query = query.or(`name.ilike.%${q}%,brand.ilike.%${q}%,description.ilike.%${q}%`)
  }
  if (filters.limit) query = query.limit(filters.limit)
  if (filters.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1)

  const { data, error } = await query
  return { data: data || [], error }
}

/** Get products for a specific salon */
export async function getProductsBySalon(salonId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('products')
    .select('*, product_categories(slug, name)')
    .eq('salon_id', salonId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
  return data || []
}

/**
 * Verkaeufer-Datensatz eines Saloninhabers — genau EINER pro Konto.
 *
 * `sellers` hat `UNIQUE(user_id, seller_type)`: ein Konto kann also nie zwei
 * Salon-Verkaeufer haben, auch wenn ihm mehrere Salons gehoeren. Die
 * Zuordnung zum einzelnen Salon traegt `products.salon_id`, nicht der
 * Verkaeufer — `sellers.salon_id` haelt nur fest, mit welchem Salon das Konto
 * angefangen hat. Fremdes ist darueber nicht erreichbar: gelesen und
 * geschrieben wird ausschliesslich mit der `userId` der Session.
 *
 * Der Lesefehler wird jetzt vom „kein Datensatz" unterschieden. Vorher stand
 * hier `.single()` mit ignoriertem Fehler: ein Aussetzer der Datenbank sah
 * aus wie „gibt es noch nicht", und der folgende Insert lief in die
 * Unique-Verletzung — der Anbieter las „Produkt konnte nicht angelegt
 * werden" statt „bitte gleich noch einmal".
 */
export async function getOrCreateSalonSeller(userId: string, salonId: string) {
  const supabase = getSupabaseAdmin()
  const { data: existing, error: leseFehler } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .eq('seller_type', 'salon')
    .maybeSingle()
  if (leseFehler) throw leseFehler
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('sellers')
    .insert({ user_id: userId, salon_id: salonId, seller_type: 'salon' })
    .select()
    .single()
  if (error) throw error
  return created
}

/**
 * Warenkorb und Bestellung — die Preisquelle des Shops.
 *
 * Bis Track 14 war der Stueckpreis einer Bestellposition frei waehlbar. Die
 * Kette dahinter:
 *
 *   1. `POST /api/cart` nahm `variantId` roh aus dem Request entgegen.
 *   2. `addToCart` schrieb ihn ungeprueft nach `cart_items.variant_id`.
 *   3. `getCartItems` bettet `product_variants` ueber genau diesen
 *      Fremdschluessel ein — die Einbettung folgt der Spalte, nicht dem
 *      Produkt. Sie liefert also auch eine Variante, die zu einem voellig
 *      anderen Produkt gehoert.
 *   4. `createOrder` nahm `variant.price_cents` als Stueckpreis und schrieb
 *      ihn nach `order_items.unit_price_cents`.
 *   5. `/api/stripe/checkout` baut daraus `unit_amount` der Line-Items.
 *
 * Ergebnis: jedes Produkt zu jedem Preis, fuer den es irgendwo im Katalog
 * eine Variante gibt — Stripe zog exakt diesen Betrag ein, die Bestellung
 * galt danach als vollstaendig bezahlt, und der Verkaeufer sah eine
 * regulaere Bestellung. Der Riegel dagegen steht jetzt an zwei Stellen:
 * beim Hinzufuegen (`variant.product_id === product.id`) und noch einmal
 * beim Bestellen, damit auch bereits vergiftete `cart_items`-Zeilen nicht
 * durchkommen.
 *
 * Zweiter Befund derselben Kette: `stock_quantity` war reine Zierde. Der
 * Bestand wurde nirgends geprueft und nirgends abgezogen — ein Produkt mit
 * 0 Stueck war unbegrenzt bestellbar. Gebucht wird der Bestand jetzt dort,
 * wo das Geld ankommt (Stripe-Webhook), atomar per Compare-and-Swap.
 */

/** Hoechstmenge je Warenkorbposition. */
export const MAX_QUANTITY_PER_ITEM = 99
/** Hoechstzahl verschiedener Positionen je Warenkorb. */
export const MAX_CART_ITEMS = 50
/** Wie oft ein Bestands-CAS wiederholt wird, bevor er aufgibt. */
const STOCK_CLAIM_ATTEMPTS = 5

/** Fehler mit HTTP-Status — die Routen geben ihn unveraendert weiter. */
export class CartError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message)
    this.name = 'CartError'
  }
}

/**
 * Menge aus einem Request-Body.
 *
 * Vorher stand hier `quantity || 1`. Damit kam alles durch: `-5` (negativer
 * Positionsbetrag), `0.5` (Stripe lehnt die Session ab, die Bestellung steht
 * aber schon), `1e9` und der String `"1"` — der landete in
 * `existing.quantity + quantity` als Zeichenkette und machte aus 1 + "1"
 * die Menge 11.
 */
export function normalizeQuantity(value: unknown): number {
  const raw =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim() !== ''
        ? Number(value)
        : NaN
  if (!Number.isInteger(raw)) {
    throw new CartError('Menge muss eine ganze Zahl sein', 400)
  }
  if (raw < 1) {
    throw new CartError('Menge muss mindestens 1 sein', 400)
  }
  if (raw > MAX_QUANTITY_PER_ITEM) {
    throw new CartError(`Maximal ${MAX_QUANTITY_PER_ITEM} Stück je Position`, 400)
  }
  return raw
}

interface ProductStock {
  id: string
  name?: string | null
  price_cents: number | null
  is_active?: boolean | null
  stock_quantity: number | null
  is_unlimited_stock: boolean | null
}

interface VariantStock {
  id: string
  product_id: string
  price_cents: number | null
  is_active?: boolean | null
  stock_quantity: number | null
}

/**
 * Verfuegbare Stueckzahl, oder `null` fuer „unbegrenzt".
 *
 * `product_variants` hat live KEINE Spalte `is_unlimited_stock` (Sonde
 * 2026-08-28) — fuehrt eine Variante einen Bestand, ist er massgeblich;
 * fuehrt sie keinen, gilt die Regel des Produkts.
 */
export function availableStock(
  product: Pick<ProductStock, 'stock_quantity' | 'is_unlimited_stock'>,
  variant: Pick<VariantStock, 'stock_quantity'> | null,
): number | null {
  if (variant && variant.stock_quantity !== null && variant.stock_quantity !== undefined) {
    return Math.max(0, Math.trunc(variant.stock_quantity))
  }
  if (product.is_unlimited_stock) return null
  const stock = product.stock_quantity
  if (stock === null || stock === undefined) return null
  return Math.max(0, Math.trunc(stock))
}

/** Stueckpreis einer Position — Variante schlaegt Produkt, aber nur wenn sie einen fuehrt. */
export function unitPriceFor(
  product: Pick<ProductStock, 'price_cents'>,
  variant: Pick<VariantStock, 'price_cents'> | null,
): number {
  // `??` statt `||`: eine Gratis-Variante (0 Cent) ist ein Preis, kein
  // fehlender Wert. Vorher fiel sie auf den vollen Produktpreis zurueck und
  // der Kunde zahlte fuer etwas, das gratis sein sollte.
  const raw = variant ? (variant.price_cents ?? product.price_cents) : product.price_cents
  if (raw === null || raw === undefined || !Number.isFinite(raw) || !Number.isInteger(raw) || raw < 0) {
    throw new CartError('Für dieses Produkt ist kein gültiger Preis hinterlegt', 409)
  }
  return raw
}

/** Get cart items with product data */
export async function getCartItems(customerId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('cart_items')
    .select(
      '*, products(id, name, slug, price_cents, images, seller_id, salon_id, is_active, stock_quantity, is_unlimited_stock), ' +
        'product_variants(id, product_id, name, price_cents, is_active, stock_quantity)',
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return data || []
}

/** Add item to cart (upsert) */
export async function addToCart(
  customerId: string,
  productId: string,
  variantId: string | null,
  quantityRaw: unknown,
) {
  const quantity = normalizeQuantity(quantityRaw)
  const supabase = getSupabaseAdmin()

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, price_cents, is_active, stock_quantity, is_unlimited_stock')
    .eq('id', productId)
    .maybeSingle()

  if (productError) throw new CartError('Produkt konnte nicht geprüft werden', 500)
  if (!product) throw new CartError('Produkt nicht gefunden', 404)
  if (product.is_active === false) {
    throw new CartError('Produkt ist nicht mehr verfügbar', 409)
  }

  let variant: VariantStock | null = null
  if (variantId) {
    const { data: row, error: variantError } = await supabase
      .from('product_variants')
      .select('id, product_id, price_cents, is_active, stock_quantity')
      .eq('id', variantId)
      .maybeSingle()

    if (variantError) throw new CartError('Variante konnte nicht geprüft werden', 500)
    // Der eigentliche Riegel: eine Variante gehoert zu genau einem Produkt.
    if (!row || row.product_id !== product.id) {
      throw new CartError('Variante gehört nicht zu diesem Produkt', 400)
    }
    if (row.is_active === false) {
      throw new CartError('Variante ist nicht mehr verfügbar', 409)
    }
    variant = row as VariantStock
  }

  // Preis muss lesbar sein, bevor etwas in den Warenkorb wandert — sonst
  // scheitert erst die Bestellung, und zwar ohne verstaendlichen Grund.
  unitPriceFor(product as ProductStock, variant)

  // Bestehende Position. Vorher stand hier `.is('variant_id', variantId || null)`
  // — PostgREST kennt bei `is` nur null/true/false, mit einer UUID lief die
  // Abfrage in einen Fehler, der ignoriert wurde. Jede Variante landete
  // deshalb bei jedem Klick als NEUE Zeile im Warenkorb.
  let existingQuery = supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
  existingQuery = variantId
    ? existingQuery.eq('variant_id', variantId)
    : existingQuery.is('variant_id', null)

  const { data: existingRows, error: existingError } = await existingQuery.limit(1)
  if (existingError) throw new CartError('Warenkorb konnte nicht gelesen werden', 500)
  const existing = existingRows?.[0] ?? null

  const vorhanden = existing ? Math.max(0, Math.trunc(Number(existing.quantity) || 0)) : 0
  const gewuenscht = vorhanden + quantity
  if (gewuenscht > MAX_QUANTITY_PER_ITEM) {
    throw new CartError(`Maximal ${MAX_QUANTITY_PER_ITEM} Stück je Position`, 409)
  }

  const stock = availableStock(product as ProductStock, variant)
  if (stock !== null && gewuenscht > stock) {
    throw new CartError(
      stock <= 0 ? 'Artikel ist ausverkauft' : `Nur noch ${stock} Stück verfügbar`,
      409,
    )
  }

  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: gewuenscht })
      .eq('id', existing.id)
      .eq('customer_id', customerId)
      .select()
      .single()
    if (error) throw new CartError('Warenkorb konnte nicht gespeichert werden', 500)
    return data
  }

  const { data: bestand, error: countError } = await supabase
    .from('cart_items')
    .select('id')
    .eq('customer_id', customerId)
    .limit(MAX_CART_ITEMS + 1)
  if (countError) throw new CartError('Warenkorb konnte nicht gelesen werden', 500)
  if ((bestand?.length ?? 0) >= MAX_CART_ITEMS) {
    throw new CartError(`Maximal ${MAX_CART_ITEMS} verschiedene Positionen im Warenkorb`, 409)
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({ customer_id: customerId, product_id: productId, variant_id: variantId, quantity })
    .select()
    .single()
  if (error) throw new CartError('Artikel konnte nicht hinzugefügt werden', 500)
  return data
}

/** Remove item from cart */
export async function removeFromCart(customerId: string, itemId: string) {
  const supabase = getSupabaseAdmin()
  return supabase.from('cart_items').delete().eq('id', itemId).eq('customer_id', customerId)
}

/** Update cart item quantity */
export async function updateCartQuantity(customerId: string, itemId: string, quantityRaw: unknown) {
  const roh =
    typeof quantityRaw === 'number'
      ? quantityRaw
      : typeof quantityRaw === 'string' && quantityRaw.trim() !== ''
        ? Number(quantityRaw)
        : NaN
  if (Number.isInteger(roh) && roh <= 0) return removeFromCart(customerId, itemId)

  const quantity = normalizeQuantity(quantityRaw)
  const supabase = getSupabaseAdmin()

  const { data: item, error: itemError } = await supabase
    .from('cart_items')
    .select('id, product_id, variant_id')
    .eq('id', itemId)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (itemError) throw new CartError('Warenkorb konnte nicht gelesen werden', 500)
  if (!item) throw new CartError('Position nicht gefunden', 404)

  const { data: product } = await supabase
    .from('products')
    .select('id, price_cents, is_active, stock_quantity, is_unlimited_stock')
    .eq('id', item.product_id)
    .maybeSingle()
  if (!product) throw new CartError('Produkt nicht gefunden', 404)
  if (product.is_active === false) throw new CartError('Produkt ist nicht mehr verfügbar', 409)

  let variant: VariantStock | null = null
  if (item.variant_id) {
    const { data: row } = await supabase
      .from('product_variants')
      .select('id, product_id, price_cents, is_active, stock_quantity')
      .eq('id', item.variant_id)
      .maybeSingle()
    if (!row || row.product_id !== product.id) {
      throw new CartError('Variante gehört nicht zu diesem Produkt', 400)
    }
    variant = row as VariantStock
  }

  const stock = availableStock(product as ProductStock, variant)
  if (stock !== null && quantity > stock) {
    throw new CartError(
      stock <= 0 ? 'Artikel ist ausverkauft' : `Nur noch ${stock} Stück verfügbar`,
      409,
    )
  }

  return supabase
    .from('cart_items')
    .update({ quantity })
    .eq('id', itemId)
    .eq('customer_id', customerId)
}

interface ShippingInfo {
  name: string
  street: string
  city: string
  postalCode: string
}

/** Ab diesem Warenwert entfaellt der Versand. */
const FREE_SHIPPING_FROM_CENTS = 5000
/** Versandkosten unterhalb der Schwelle. */
const SHIPPING_CENTS = 499

/** Create order from cart items */
export async function createOrder(customerId: string, shipping: ShippingInfo) {
  const supabase = getSupabaseAdmin()

  const cartItems = await getCartItems(customerId)
  if (cartItems.length === 0) throw new CartError('Warenkorb ist leer', 400)

  let subtotal = 0
  const orderItems: {
    product_id: string
    variant_id: string | null
    seller_id: string
    quantity: number
    unit_price_cents: number
    total_cents: number
  }[] = []

  for (const item of cartItems) {
    const raw = item as unknown as Record<string, unknown>
    const product = raw.products as (ProductStock & { seller_id: string }) | null
    const variant = (raw.product_variants as VariantStock | null) ?? null

    // Vorher: `if (!product) continue` — eine geloeschte Zeile verschwand
    // still aus der Bestellung, der Warenkorb wurde trotzdem geleert.
    if (!product) {
      throw new CartError(
        'Ein Artikel im Warenkorb existiert nicht mehr. Bitte Warenkorb prüfen.',
        409,
      )
    }
    if (product.is_active === false) {
      throw new CartError(
        `„${product.name ?? 'Artikel'}" ist nicht mehr verfügbar. Bitte aus dem Warenkorb entfernen.`,
        409,
      )
    }
    // Zweite Stelle desselben Riegels: auch eine bereits gespeicherte
    // cart_items-Zeile mit fremder Variante wird hier noch abgefangen.
    if (variant && variant.product_id !== product.id) {
      throw new CartError('Warenkorb enthält eine ungültige Variante', 400)
    }
    if (variant && variant.is_active === false) {
      throw new CartError(
        `Eine Variante von „${product.name ?? 'Artikel'}" ist nicht mehr verfügbar.`,
        409,
      )
    }

    const quantity = normalizeQuantity(raw.quantity)
    const stock = availableStock(product, variant)
    if (stock !== null && quantity > stock) {
      throw new CartError(
        stock <= 0
          ? `„${product.name ?? 'Artikel'}" ist ausverkauft.`
          : `Von „${product.name ?? 'Artikel'}" sind nur noch ${stock} Stück verfügbar.`,
        409,
      )
    }

    const unitPrice = unitPriceFor(product, variant)
    const total = unitPrice * quantity
    subtotal += total
    orderItems.push({
      product_id: product.id,
      variant_id: variant ? variant.id : null,
      seller_id: product.seller_id,
      quantity,
      unit_price_cents: unitPrice,
      total_cents: total,
    })
  }

  if (subtotal <= 0) {
    throw new CartError('Bestellwert ist 0 — bitte Warenkorb prüfen.', 409)
  }

  const shippingCents = subtotal >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS
  const totalCents = subtotal + shippingCents

  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      order_number: generateOrderNumber(),
      customer_id: customerId,
      subtotal_cents: subtotal,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      shipping_name: shipping.name,
      shipping_street: shipping.street,
      shipping_city: shipping.city,
      shipping_postal_code: shipping.postalCode,
    })
    .select()
    .single()

  if (orderErr || !order) throw new CartError('Bestellung konnte nicht angelegt werden', 500)

  // Vorher ohne Fehlerpruefung. Schlug der Insert fehl, blieb eine Bestellung
  // MIT Gesamtbetrag und OHNE Positionen stehen; der Checkout baute daraus
  // eine Stripe-Session, die nur den Versand enthielt — und der Warenkorb des
  // Kunden war trotzdem weg.
  const { error: itemsErr } = await supabase
    .from('order_items')
    .insert(orderItems.map(oi => ({ ...oi, order_id: order.id })))

  if (itemsErr) {
    await supabase.from('orders').delete().eq('id', order.id)
    console.error('order_items insert failed:', itemsErr.message)
    throw new CartError('Bestellung konnte nicht angelegt werden', 500)
  }

  // Warenkorb erst leeren, wenn die Bestellung vollstaendig steht.
  await supabase.from('cart_items').delete().eq('customer_id', customerId)

  return order
}

/**
 * Bestand einer bezahlten Bestellung buchen.
 *
 * Aufgerufen wird das im Stripe-Webhook, also dort, wo das Geld tatsaechlich
 * angekommen ist. Jede Position wird einzeln per Compare-and-Swap abgezogen
 * (`.eq('stock_quantity', gelesen)`), damit zwei gleichzeitige Zahlungen auf
 * das letzte Stueck nicht beide gewinnen. Reicht der Bestand fuer eine
 * Position nicht, werden die bereits gebuchten Positionen zurueckgegeben und
 * der Aufrufer erstattet die Zahlung — dieselbe Linie wie die
 * Overlap-Defense der Miete.
 *
 * Unbegrenzter Bestand (`is_unlimited_stock`) und Positionen ohne gefuehrten
 * Bestand werden uebersprungen; erfunden wird hier nichts.
 */
export async function claimStockForOrder(
  orderId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = getSupabaseAdmin()

  const { data: items, error } = await supabase
    .from('order_items')
    .select('id, product_id, variant_id, quantity')
    .eq('order_id', orderId)

  if (error) return { ok: false, reason: `Positionen nicht lesbar: ${error.message}` }
  if (!items || items.length === 0) return { ok: true }

  const gebucht: { table: 'products' | 'product_variants'; id: string; menge: number }[] = []

  const zurueckgeben = async () => {
    for (const g of gebucht) {
      for (let versuch = 0; versuch < STOCK_CLAIM_ATTEMPTS; versuch++) {
        const { data: row } = await supabase
          .from(g.table)
          .select('stock_quantity')
          .eq('id', g.id)
          .maybeSingle()
        if (!row || row.stock_quantity === null || row.stock_quantity === undefined) break
        const gelesen = Number(row.stock_quantity)
        const { data: ok } = await supabase
          .from(g.table)
          .update({ stock_quantity: gelesen + g.menge })
          .eq('id', g.id)
          .eq('stock_quantity', gelesen)
          .select('id')
        if (ok && ok.length > 0) break
      }
    }
  }

  for (const item of items) {
    const menge = Math.max(0, Math.trunc(Number(item.quantity) || 0))
    if (menge === 0) continue

    const table: 'products' | 'product_variants' = item.variant_id ? 'product_variants' : 'products'
    const id = (item.variant_id as string | null) ?? (item.product_id as string)
    if (!id) continue

    let erfolg = false
    let grund = 'Bestand nicht buchbar'

    for (let versuch = 0; versuch < STOCK_CLAIM_ATTEMPTS; versuch++) {
      const { data: row, error: readError } = await supabase
        .from(table)
        .select(table === 'products' ? 'stock_quantity, is_unlimited_stock' : 'stock_quantity')
        .eq('id', id)
        .maybeSingle()

      if (readError) {
        grund = `Bestand nicht lesbar: ${readError.message}`
        break
      }
      if (!row) {
        grund = 'Artikel existiert nicht mehr'
        break
      }
      const unbegrenzt = (row as { is_unlimited_stock?: boolean | null }).is_unlimited_stock === true
      const stand = (row as { stock_quantity?: number | null }).stock_quantity
      if (unbegrenzt || stand === null || stand === undefined) {
        erfolg = true
        break
      }

      const gelesen = Math.trunc(Number(stand))
      if (gelesen < menge) {
        grund = 'Artikel inzwischen ausverkauft'
        break
      }

      const { data: gewonnen } = await supabase
        .from(table)
        .update({ stock_quantity: gelesen - menge })
        .eq('id', id)
        .eq('stock_quantity', gelesen)
        .select('id')

      if (gewonnen && gewonnen.length > 0) {
        gebucht.push({ table, id, menge })
        erfolg = true
        break
      }
      // Jemand anderes war schneller — neu lesen und erneut versuchen.
    }

    if (!erfolg) {
      await zurueckgeben()
      return { ok: false, reason: grund }
    }
  }

  return { ok: true }
}

/** Gebuchten Bestand einer Bestellung wieder freigeben (Storno/verlorener CAS). */
export async function releaseStockForOrder(orderId: string): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { data: items } = await supabase
    .from('order_items')
    .select('product_id, variant_id, quantity')
    .eq('order_id', orderId)

  for (const item of items ?? []) {
    const menge = Math.max(0, Math.trunc(Number(item.quantity) || 0))
    if (menge === 0) continue
    const table: 'products' | 'product_variants' = item.variant_id ? 'product_variants' : 'products'
    const id = (item.variant_id as string | null) ?? (item.product_id as string)
    if (!id) continue

    for (let versuch = 0; versuch < STOCK_CLAIM_ATTEMPTS; versuch++) {
      const { data: row } = await supabase
        .from(table)
        .select('stock_quantity')
        .eq('id', id)
        .maybeSingle()
      if (!row || row.stock_quantity === null || row.stock_quantity === undefined) break
      const gelesen = Math.trunc(Number(row.stock_quantity))
      const { data: ok } = await supabase
        .from(table)
        .update({ stock_quantity: gelesen + menge })
        .eq('id', id)
        .eq('stock_quantity', gelesen)
        .select('id')
      if (ok && ok.length > 0) break
    }
  }
}

/** Get orders for a customer */
export async function getOrdersByCustomer(customerId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('orders')
    .select('*, order_items(*, products(name, images))')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return data || []
}
