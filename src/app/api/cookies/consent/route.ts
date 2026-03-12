import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  try {
    const body = await req.json()
    const { sessionId, choices } = body as { sessionId: string; choices: Record<string, boolean> }
    if (!sessionId || !choices || typeof choices !== 'object') {
      return NextResponse.json({ error: 'sessionId and choices required' }, { status: 400 })
    }
    const { error } = await supabase.from('cookie_consents').insert({
      session_id: sessionId,
      choices: {
        necessary: true,
        statistics: choices.statistics ?? false,
        marketing: choices.marketing ?? false,
      },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
