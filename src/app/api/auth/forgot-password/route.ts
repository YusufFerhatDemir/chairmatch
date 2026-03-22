import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_URL = 'https://vlrviyrgggzhayepfmop.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZscnZpeXJnZ2d6aGF5ZXBmbW9wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1ODIyNzYsImV4cCI6MjA4ODE1ODI3Nn0.pvcZqzAm-ARWVsSv6hKUnTwZeggVJcwYN---4jUfyA0'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

/** Passwort-Reset anfordern — Supabase sendet E-Mail mit Link (1h Ablauf) */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'E-Mail erforderlich' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
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
