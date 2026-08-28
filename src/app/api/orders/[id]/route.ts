import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'] as const

/** Get order detail */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(name, images, slug))')
      .eq('id', id)
      .eq('customer_id', session.user.id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}

/** Update order status (admin) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const { id } = await params
    if (!UUID.test(id)) return NextResponse.json({ error: 'Ungueltige ID' }, { status: 400 })

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Ungueltiger Request-Body' }, { status: 400 })
    }
    const { status, trackingNumber, trackingUrl } = body as {
      status?: string
      trackingNumber?: string
      trackingUrl?: string
    }

    if (status && !VALID_ORDER_STATUSES.includes(status as typeof VALID_ORDER_STATUSES[number])) {
      return NextResponse.json({ error: 'Ungueltiger Status' }, { status: 400 })
    }
    if (trackingNumber && (typeof trackingNumber !== 'string' || trackingNumber.length > 100)) {
      return NextResponse.json({ error: 'Trackingnummer zu lang (max. 100 Zeichen)' }, { status: 400 })
    }
    if (trackingUrl && (typeof trackingUrl !== 'string' || trackingUrl.length > 500)) {
      return NextResponse.json({ error: 'Tracking-URL zu lang (max. 500 Zeichen)' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (trackingNumber) update.tracking_number = trackingNumber
    if (trackingUrl) update.tracking_url = trackingUrl

    const { data, error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) return NextResponse.json({ error: 'Bestellung nicht gefunden' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
