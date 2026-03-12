import { NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** DSGVO Art. 20: Daten-Export (JSON) — innerhalb 72h */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  const [profile, bookings, consents] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('bookings').select('*').eq('customer_id', userId),
    supabase.from('consent_logs').select('*').eq('user_id', userId),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId,
    profile: profile.data ?? null,
    bookings: bookings.data ?? [],
    consentLogs: consents.data ?? [],
  }

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="chairmatch-export-${userId.slice(0, 8)}.json"`,
    },
  })
}
