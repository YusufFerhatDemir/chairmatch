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

/** Get or create seller for a salon owner */
export async function getOrCreateSalonSeller(userId: string, salonId: string) {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('sellers')
    .select('*')
    .eq('user_id', userId)
    .eq('seller_type', 'salon')
    .single()
  if (existing) return existing

  const { data: created, error } = await supabase
    .from('sellers')
    .insert({ user_id: userId, salon_id: salonId, seller_type: 'salon' })
    .select()
    .single()
  if (error) throw error
  return created
}

/** Get cart items with product data */
export async function getCartItems(customerId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('cart_items')
    .select('*, products(id, name, slug, price_cents, images, seller_id, salon_id), product_variants(id, name, price_cents)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  return data || []
}

/** Add item to cart (upsert) */
export async function addToCart(customerId: string, productId: string, variantId: string | null, quantity: number) {
  const supabase = getSupabaseAdmin()
  const { data: existing } = await supabase
    .from('cart_items')
    .select('id, quantity')
    .eq('customer_id', customerId)
    .eq('product_id', productId)
    .is('variant_id', variantId || null)
    .single()

  if (existing) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id)
      .select()
      .single()
    return { data, error }
  }

  const { data, error } = await supabase
    .from('cart_items')
    .insert({ customer_id: customerId, product_id: productId, variant_id: variantId, quantity })
    .select()
    .single()
  return { data, error }
}

/** Remove item from cart */
export async function removeFromCart(customerId: string, itemId: string) {
  const supabase = getSupabaseAdmin()
  return supabase.from('cart_items').delete().eq('id', itemId).eq('customer_id', customerId)
}

/** Update cart item quantity */
export async function updateCartQuantity(customerId: string, itemId: string, quantity: number) {
  const supabase = getSupabaseAdmin()
  if (quantity <= 0) return removeFromCart(customerId, itemId)
  return supabase.from('cart_items').update({ quantity }).eq('id', itemId).eq('customer_id', customerId)
}

interface ShippingInfo {
  name: string
  street: string
  city: string
  postalCode: string
}

/** Create order from cart items */
export async function createOrder(customerId: string, shipping: ShippingInfo) {
  const supabase = getSupabaseAdmin()

  // Get cart with product data
  const cartItems = await getCartItems(customerId)
  if (cartItems.length === 0) throw new Error('Cart is empty')

  // Calculate totals
  let subtotal = 0
  const orderItems: { product_id: string; variant_id: string | null; seller_id: string; quantity: number; unit_price_cents: number; total_cents: number }[] = []

  for (const item of cartItems) {
    const product = (item as Record<string, unknown>).products as { id: string; price_cents: number; seller_id: string } | null
    const variant = (item as Record<string, unknown>).product_variants as { price_cents: number } | null
    if (!product) continue
    const unitPrice = variant?.price_cents || product.price_cents
    const total = unitPrice * item.quantity
    subtotal += total
    orderItems.push({
      product_id: item.product_id,
      variant_id: item.variant_id,
      seller_id: product.seller_id,
      quantity: item.quantity,
      unit_price_cents: unitPrice,
      total_cents: total,
    })
  }

  const shippingCents = subtotal >= 5000 ? 0 : 499 // Free shipping over 50€
  const totalCents = subtotal + shippingCents

  // Create order
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

  if (orderErr || !order) throw orderErr || new Error('Failed to create order')

  // Create order items
  const items = orderItems.map(oi => ({ ...oi, order_id: order.id }))
  await supabase.from('order_items').insert(items)

  // Clear cart
  await supabase.from('cart_items').delete().eq('customer_id', customerId)

  return order
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
