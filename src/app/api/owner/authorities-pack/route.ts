import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'
import { dbError } from '@/lib/api-wrapper'
import { isUuid } from '@/lib/uuid'

export async function POST(request: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const location_id = body.location_id
  if (!isUuid(location_id)) {
    return NextResponse.json({ error: 'location_id erforderlich' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { data: salon } = await supabase.from('salons').select('id, name, owner_id').eq('id', location_id).single()
  if (!salon || salon.owner_id !== session.user.id) {
    return NextResponse.json({ error: 'Kein Zugriff auf diesen Standort' }, { status: 403 })
  }

  // Live heisst die Spalte `salon_id`, nicht `location_id` — mit dem alten
  // Namen lief der Insert in 42703 und das Erstellen eines Behoerdenpakets
  // endete fuer jeden Inhaber in 500. `created_by` kommt aus
  // 20260824_schema_drift_repair.sql; ohne diese Migration ist unbekannt,
  // wer das Paket angefordert hat.
  const { data: pack, error } = await supabase
    .from('authorities_packs')
    .insert({ salon_id: location_id, created_by: session.user.id })
    .select('id')
    .single()

  if (error) return dbError('authorities-pack-GET', error)

  const baseUrl = request.nextUrl.origin
  const downloadUrl = `${baseUrl}/api/owner/authorities-pack/${pack.id}/download`
  return NextResponse.json({ ok: true, id: pack.id, download_url: downloadUrl })
}
