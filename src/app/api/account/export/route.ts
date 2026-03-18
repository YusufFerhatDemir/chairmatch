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

  try {
    const [profile, bookings, consents] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('bookings').select('*').eq('customer_id', userId),
      supabase.from('consent_logs').select('*').eq('user_id', userId),
    ])

    if (profile.error || bookings.error || consents.error) {
      console.error('Export query error:', profile.error || bookings.error || consents.error)
      return NextResponse.json({ error: 'Daten konnten nicht geladen werden' }, { status: 500 })
    }

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
  } catch (err) {
    console.error('Export failed:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}
