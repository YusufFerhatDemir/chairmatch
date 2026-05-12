import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Affiliate-Klick-Tracking + Redirect.
 *
 * GET /api/affiliate/track/:productId?source=feed
 *   1. Lädt Produkt aus affiliate_products
 *   2. Loggt Klick in affiliate_clicks
 *   3. 302-Redirect zur product_url
 *
 * Fällt nichts kaputt, wenn der User nicht eingeloggt ist —
 * dann wird nur session_id (Cookie) erfasst.
 */

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const { productId } = await context.params
    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    // Produkt holen
    const { data: product, error: productError } = await supabase
      .from('affiliate_products')
      .select('id, product_url, is_active')
      .eq('id', productId)
      .maybeSingle()

    if (productError || !product || !product.is_active) {
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }

    // Tracking-Daten zusammensammeln
    const session = await getServerSession().catch(() => null)
    const userId = session?.user?.id ?? null

    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')

    const sessionId =
      request.cookies.get('cm_session_id')?.value ??
      request.cookies.get('sessionId')?.value ??
      null

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      null

    const userAgent = request.headers.get('user-agent') ?? null

    // Klick loggen — Fehler schluckt das Redirect nicht
    await supabase.from('affiliate_clicks').insert({
      product_id: productId,
      user_id: userId,
      session_id: sessionId,
      source,
      ip,
      user_agent: userAgent,
    })

    return NextResponse.redirect(product.product_url, 302)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
