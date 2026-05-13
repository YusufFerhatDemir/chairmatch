import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAnon } from '@/lib/supabase-server'

/** Passwort-Reset anfordern — Supabase sendet E-Mail mit Link (1h Ablauf) */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
    }

    // Fail-fast — kein Fallback auf altes Supabase-Projekt
    const supabase = getSupabaseAnon()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chairmatch.de'}/auth/reset-password`,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, message: 'Falls ein Konto existiert, wurde ein Link zum Zurücksetzen gesendet.' })
  } catch {
    return NextResponse.json({ error: 'Anfrage fehlgeschlagen' }, { status: 500 })
  }
}
