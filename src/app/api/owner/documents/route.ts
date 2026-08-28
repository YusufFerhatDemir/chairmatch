import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { dbError } from '@/lib/api-wrapper'
import { isUuid } from '@/lib/uuid'
import { isSafeHttpUrl } from '@/lib/safe-url'

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
  if (!isUuid(owner_id)) {
    return NextResponse.json({ error: 'owner_id erforderlich' }, { status: 400 })
  }
  // Der Link zur Datei kommt aus einem Freitextfeld und wird gespeichert,
  // damit ihn spaeter jemand oeffnet — nur http(s), siehe @/lib/safe-url.
  if (file_url !== null && !isSafeHttpUrl(file_url)) {
    return NextResponse.json(
      { error: 'file_url muss eine http(s)-Adresse sein' },
      { status: 400 },
    )
  }

  if (owner_type !== 'location') {
    return NextResponse.json({ error: 'Ungültiger owner_type' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: salon } = await supabase.from('salons').select('owner_id').eq('id', owner_id).single()
  if (!salon || salon.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Kein Zugriff auf diesen Standort' }, { status: 403 })
  }

  // Live heisst die Tabelle anders, als der Code sie bis 2026-08-24
  // angesprochen hat:
  //   owner_type / owner_id  → salon_id   (diese Route laesst ohnehin nur
  //                                        owner_type === 'location' zu)
  //   doc_type               → type
  //   verified_status        → status
  //   file_url               → url
  // Mit den alten Namen lief der Insert in 42703 — das Hochladen eines
  // Standort-Dokuments war vollstaendig blockiert.
  const { data, error } = await supabase
    .from('documents')
    .insert({
      salon_id: owner_id,
      user_id: session.user.id,
      type: doc_type,
      url: file_url || null,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) return dbError('owner-documents', error)
  return NextResponse.json({ ok: true, id: data.id })
}
