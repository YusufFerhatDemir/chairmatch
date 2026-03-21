import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Public: get single product by slug */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('products')
      .select('*, product_categories(slug, name), sellers(company_name, seller_type, salon_id), product_variants(*)')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
