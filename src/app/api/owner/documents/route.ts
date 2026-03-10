import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const doc_type = body.doc_type
  const file_url = body.file_url || null
  const owner_type = body.owner_type || 'location'
  const owner_id = body.owner_id

  if (!doc_type || typeof doc_type !== 'string' || doc_type.length > 100) {
    return NextResponse.json({ error: 'doc_type erforderlich' }, { status: 400 })
  }
  if (!owner_id) return NextResponse.json({ error: 'owner_id erforderlich' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  if (owner_type === 'location') {
    const { data: salon } = await supabase.from('salons').select('owner_id').eq('id', owner_id).single()
    if (!salon || salon.owner_id !== session.user.id) {
      return NextResponse.json({ error: 'Kein Zugriff auf diesen Standort' }, { status: 403 })
    }
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({ owner_type, owner_id, doc_type, file_url: file_url || null, verified_status: 'pending' })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id })
}
