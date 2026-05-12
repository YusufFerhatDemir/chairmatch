import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

/**
 * Admin-API für Affiliate-Produkte.
 * - GET   /api/admin/affiliate/products          → Liste inkl. Klick-/Conversion-Stats
 * - POST  /api/admin/affiliate/products          → neues Produkt anlegen
 * - PUT   /api/admin/affiliate/products?id=...   → Produkt aktualisieren
 * - DELETE /api/admin/affiliate/products?id=...  → Produkt löschen
 *
 * Nur Rollen admin / super_admin.
 */

const VALID_PARTNERS = ['amazon', 'douglas', 'notino', 'flaconi', 'direct'] as const
type Partner = (typeof VALID_PARTNERS)[number]

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!role || !['admin', 'super_admin'].includes(role)) return null
  return session
}

interface ProductPayload {
  partner?: string
  product_name?: string
  product_url?: string
  category?: string | null
  commission_rate?: number | string | null
  image_url?: string | null
  price_cents?: number | string | null
  is_active?: boolean
}

function sanitize(input: ProductPayload, partial = false) {
  const out: Record<string, unknown> = {}
  const errors: string[] = []

  if (input.partner !== undefined) {
    if (!VALID_PARTNERS.includes(input.partner as Partner)) {
      errors.push('Ungültiger Partner')
    } else {
      out.partner = input.partner
    }
  } else if (!partial) {
    errors.push('partner ist erforderlich')
  }

  if (input.product_name !== undefined) {
    const name = String(input.product_name).trim()
    if (!name) errors.push('product_name darf nicht leer sein')
    else out.product_name = name
  } else if (!partial) {
    errors.push('product_name ist erforderlich')
  }

  if (input.product_url !== undefined) {
    const url = String(input.product_url).trim()
    if (!/^https?:\/\//i.test(url)) errors.push('product_url muss mit http(s):// beginnen')
    else out.product_url = url
  } else if (!partial) {
    errors.push('product_url ist erforderlich')
  }

  if (input.category !== undefined) {
    out.category = input.category ? String(input.category).trim() : null
  }

  if (input.commission_rate !== undefined && input.commission_rate !== null && input.commission_rate !== '') {
    const r = Number(input.commission_rate)
    if (Number.isNaN(r) || r < 0 || r > 100) errors.push('commission_rate muss zwischen 0 und 100 liegen')
    else out.commission_rate = r
  }

  if (input.image_url !== undefined) {
    out.image_url = input.image_url ? String(input.image_url).trim() : null
  }

  if (input.price_cents !== undefined && input.price_cents !== null && input.price_cents !== '') {
    const p = Number(input.price_cents)
    if (!Number.isFinite(p) || p < 0) errors.push('price_cents muss eine positive Zahl sein')
    else out.price_cents = Math.round(p)
  }

  if (input.is_active !== undefined) {
    out.is_active = Boolean(input.is_active)
  }

  return { data: out, errors }
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = getSupabaseAdmin()

  const { data: products, error } = await supabase
    .from('affiliate_products')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const productList = products ?? []
  const ids = productList.map(p => p.id as string)

  // Klick- und Conversion-Stats per Produkt aggregieren
  const stats: Record<string, { clicks: number; conversions: number; revenue_cents: number; commission_cents: number }> = {}
  for (const id of ids) {
    stats[id] = { clicks: 0, conversions: 0, revenue_cents: 0, commission_cents: 0 }
  }

  if (ids.length > 0) {
    const { data: clicks } = await supabase
      .from('affiliate_clicks')
      .select('product_id')
      .in('product_id', ids)
    for (const c of clicks ?? []) {
      const pid = c.product_id as string | null
      if (pid && stats[pid]) stats[pid].clicks++
    }

    const { data: conversions } = await supabase
      .from('affiliate_conversions')
      .select('product_id, order_value_cents, commission_cents, status')
      .in('product_id', ids)
    for (const cv of conversions ?? []) {
      const pid = cv.product_id as string | null
      if (!pid || !stats[pid]) continue
      stats[pid].conversions++
      stats[pid].revenue_cents += Number(cv.order_value_cents) || 0
      stats[pid].commission_cents += Number(cv.commission_cents) || 0
    }
  }

  const enriched = productList.map(p => ({
    ...p,
    stats: stats[p.id as string] ?? { clicks: 0, conversions: 0, revenue_cents: 0, commission_cents: 0 },
  }))

  return NextResponse.json({ products: enriched })
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = (await req.json().catch(() => null)) as ProductPayload | null
  if (!payload) return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })

  const { data, errors } = sanitize(payload, false)
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: inserted, error } = await supabase
    .from('affiliate_products')
    .insert(data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: inserted }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id ist erforderlich' }, { status: 400 })

  const payload = (await req.json().catch(() => null)) as ProductPayload | null
  if (!payload) return NextResponse.json({ error: 'Ungültiger Body' }, { status: 400 })

  const { data, errors } = sanitize(payload, true)
  if (errors.length) return NextResponse.json({ error: errors.join(', ') }, { status: 400 })
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: updated, error } = await supabase
    .from('affiliate_products')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ product: updated })
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id ist erforderlich' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('affiliate_products')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
