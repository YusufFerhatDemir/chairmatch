import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

async function getOwnedSalonId(userId: string) {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('salons')
    .select('id')
    .eq('owner_id', userId)
    .single()
  return data?.id
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const salonId = await getOwnedSalonId(session.user.id)
  if (!salonId) return NextResponse.json({ error: 'Kein Salon' }, { status: 404 })

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const { error, data } = await supabase
    .from('services')
    .insert({
      salon_id: salonId,
      name: body.name,
      description: body.description || null,
      duration_min: body.duration_min || 30,
      price_cents: body.price_cents || 0,
      is_active: true,
      sort_order: body.sort_order || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const salonId = await getOwnedSalonId(session.user.id)
  if (!salonId) return NextResponse.json({ error: 'Kein Salon' }, { status: 404 })

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  const allowed = ['name', 'description', 'duration_min', 'price_cents', 'is_active', 'sort_order']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await supabase
    .from('services')
    .update(updates)
    .eq('id', body.id)
    .eq('salon_id', salonId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const salonId = await getOwnedSalonId(session.user.id)
  if (!salonId) return NextResponse.json({ error: 'Kein Salon' }, { status: 404 })

  const { id } = await req.json()
  const supabase = getSupabaseAdmin()

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', id)
    .eq('salon_id', salonId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
