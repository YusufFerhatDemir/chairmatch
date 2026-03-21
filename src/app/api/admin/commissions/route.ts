import { NextResponse } from 'next/server'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Admin: get commission overview */
export async function GET() {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
    }

    const role = (session.user as { role?: string }).role
    if (!role || !['admin', 'super_admin'].includes(role)) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })
    }

    const supabase = getSupabaseAdmin()
    const { data: commissions } = await supabase
      .from('commissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    // Summary stats
    const { data: stats } = await supabase
      .from('commissions')
      .select('type, commission_cents')

    const summary = {
      total: 0,
      byType: {} as Record<string, { count: number; totalCents: number }>,
    }

    if (stats) {
      for (const s of stats) {
        summary.total += s.commission_cents
        if (!summary.byType[s.type]) summary.byType[s.type] = { count: 0, totalCents: 0 }
        summary.byType[s.type].count++
        summary.byType[s.type].totalCents += s.commission_cents
      }
    }

    return NextResponse.json({ commissions: commissions || [], summary })
  } catch {
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
