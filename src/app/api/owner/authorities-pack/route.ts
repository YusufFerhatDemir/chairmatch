import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const location_id = body.location_id
  if (!location_id) return NextResponse.json({ error: 'location_id erforderlich' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { data: salon } = await supabase.from('salons').select('id, name, owner_id').eq('id', location_id).single()
  if (!salon || salon.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Kein Zugriff auf diesen Standort' }, { status: 403 })
  }

  const { data: pack, error } = await supabase
    .from('authorities_packs')
    .insert({ location_id, created_by: session.user.id })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = request.nextUrl.origin
  const downloadUrl = `${baseUrl}/api/owner/authorities-pack/${pack.id}/download`
  return NextResponse.json({ ok: true, id: pack.id, download_url: downloadUrl })
}
