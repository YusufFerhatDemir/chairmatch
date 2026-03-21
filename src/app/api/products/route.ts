import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/modules/marketplace/marketplace.service'

/** Public: list products with filters */
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const { data, error } = await getProducts({
      category: sp.get('category') || undefined,
      target: (sp.get('target') as 'b2c' | 'b2b' | 'both') || undefined,
      search: sp.get('q') || undefined,
      salonId: sp.get('salonId') || undefined,
      sellerId: sp.get('sellerId') || undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 20,
      offset: sp.get('offset') ? Number(sp.get('offset')) : 0,
    })
    if (error) return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
