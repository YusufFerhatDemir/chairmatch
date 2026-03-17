import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** DSA: Review melden — POST /api/reviews/[id]/report */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Review-ID fehlt' }, { status: 400 })

  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('reviews')
    .update({
      reported_flag: true,
      reported_at: new Date().toISOString(),
      reported_by: session?.user?.id ?? null,
    })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Bewertung wurde gemeldet.' })
}
