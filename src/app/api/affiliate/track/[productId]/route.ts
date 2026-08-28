import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { hashIp, requestIp } from '@/lib/ip-hash'
import { isUuid } from '@/lib/uuid'
import { isSafeHttpUrl } from '@/lib/safe-url'

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
    if (!isUuid(productId)) {
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

    // `affiliate_clicks` ist Klick-Statistik. Bis Track 19 stand hier die
    // rohe IP jedes — auch nicht angemeldeten — Besuchers, zusammen mit
    // User-Agent und Ziel: ein Bewegungsprofil ueber Personen, die von der
    // Anmeldung nichts wissen. Track 17 hat die Wait-List umgestellt, Track 18
    // analytics/visit; das hier war die letzte offene Stelle mit Klartext-IP
    // im Request-Pfad. Ob zwei Klicks von derselben Quelle kommen, sagt der
    // Kennwert genauso.
    const ip = hashIp(requestIp(request))

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

    // Das Ziel kommt aus der Datenbank. `POST /api/admin/affiliate/products`
    // prueft `http(s)://` beim Schreiben — aber diese Route ist die einzige
    // offene Weiterleitung der Plattform, und sie soll nicht davon abhaengen,
    // dass jede Zeile ueber genau diesen Weg entstanden ist (Altbestand,
    // direkter DB-Zugriff). Ohne gueltiges Ziel wird nicht weitergeleitet.
    if (!isSafeHttpUrl(product.product_url)) {
      console.error('[affiliate] Ungueltiges Weiterleitungsziel:', productId)
      return NextResponse.json({ error: 'Produkt nicht gefunden' }, { status: 404 })
    }

    return NextResponse.redirect(product.product_url, 302)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
