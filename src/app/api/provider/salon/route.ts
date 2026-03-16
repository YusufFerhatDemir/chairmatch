import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const body = await req.json()
  const supabase = getSupabaseAdmin()

  // Verify ownership
  const { data: salon } = await supabase
    .from('salons')
    .select('id')
    .eq('owner_id', session.user.id)
    .single()

  if (!salon) {
    return NextResponse.json({ error: 'Kein Salon gefunden' }, { status: 404 })
  }

  const allowed = ['name', 'description', 'city', 'street', 'house_number', 'postal_code', 'phone', 'email', 'website', 'opening_hours', 'category', 'logo_url', 'cover_url']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { error } = await supabase
    .from('salons')
    .update(updates)
    .eq('id', salon.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
