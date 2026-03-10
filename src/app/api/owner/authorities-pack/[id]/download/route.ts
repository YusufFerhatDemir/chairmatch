import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession } from '@/modules/auth/session'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  if (!session?.user?.id) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const supabase = getSupabaseAdmin()
  const { data: pack } = await supabase
    .from('authorities_packs')
    .select('id, location_id, created_at')
    .eq('id', id)
    .single()
  if (!pack) return new NextResponse('Paket nicht gefunden', { status: 404 })

  const { data: salon } = await supabase.from('salons').select('name').eq('id', pack.location_id).single()
  const salonName = salon?.name || pack.location_id
  const date = new Date(pack.created_at).toLocaleDateString('de-DE')

  const content = `Behördenpaket ChairMatch
Standort: ${salonName}
Paket-ID: ${pack.id}
Erstellt am: ${date}

Dieses Paket wurde über ChairMatch erstellt. Füge hier ggf. deine Dokumente (Hygiene-Plan, Reinigungskonzept, etc.) hinzu und sende die E-Mail an die zuständige Behörde.

— ChairMatch Deutschland
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="Behoerdenpaket-ChairMatch-${pack.id.slice(0, 8)}.txt"`,
    },
  })
}
