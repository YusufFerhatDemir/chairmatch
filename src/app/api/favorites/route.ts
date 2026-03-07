import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const { salonId, action } = await req.json()
  if (!salonId || !['add', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  if (action === 'add') {
    const { error } = await supabase
      .from('favorites')
      .upsert({ customer_id: session.user.id, salon_id: salonId }, { onConflict: 'customer_id,salon_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('customer_id', session.user.id)
      .eq('salon_id', salonId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ favorites: [] })
  }

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('favorites')
    .select('salon_id')
    .eq('customer_id', session.user.id)

  return NextResponse.json({ favorites: (data ?? []).map(f => f.salon_id) })
}
