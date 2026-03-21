import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

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
    const { status, trackingNumber, trackingUrl } = await req.json()
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
