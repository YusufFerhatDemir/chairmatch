import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { registerSchema } from '@/modules/auth/auth.schemas'

const FALLBACK_URL = 'https://pwdbjqfpgumyfktbfswg.supabase.co'
const FALLBACK_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3ZGJqcWZwZ3VteWZrdGJmc3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5OTc0MjAsImV4cCI6MjA4NzU3MzQyMH0.rLUoTNev2CVDswBAVoS2PT0xGvXbNDv7FKbDJ8i29Ws'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_ANON

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { email, password, fullName, agbAccepted, datenschutzAccepted, marketingAccepted } = parsed.data

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      const msg = error.message || ''
      const friendly = msg.toLowerCase().includes('database') || msg.toLowerCase().includes('saving')
        ? 'Registrierung fehlgeschlagen. Bitte Supabase-Migration prüfen (profiles.full_name, Trigger handle_new_user).'
        : msg
      return NextResponse.json({ error: friendly }, { status: 400 })
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Registrierung fehlgeschlagen' },
        { status: 500 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // Auto-confirm email (mailer_autoconfirm is off in Supabase)
    try {
      await supabaseAdmin.auth.admin.updateUserById(data.user.id, {
        email_confirm: true,
      })
    } catch {
      /* if service_role_key is missing, user must confirm via email */
    }

    // Update profile
    try {
      await supabaseAdmin
        .from('profiles')
        .update({ full_name: fullName, email })
        .eq('id', data.user.id)
    } catch {
      /* trigger may not have created profile yet */
    }

    // consent_logs (DSGVO)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || ''
    const ipHash = ip ? Buffer.from(ip).toString('base64').slice(0, 32) : null
    const version = '1.0'

    try {
      if (agbAccepted) {
        await supabaseAdmin.from('consent_logs').insert({
          user_id: data.user.id,
          type: 'agb',
          version,
          ip_hash: ipHash,
          metadata: { source: 'signup' },
        })
      }
      if (datenschutzAccepted) {
        await supabaseAdmin.from('consent_logs').insert({
          user_id: data.user.id,
          type: 'datenschutz',
          version,
          ip_hash: ipHash,
          metadata: { source: 'signup' },
        })
      }
      if (marketingAccepted) {
        await supabaseAdmin.from('consent_logs').insert({
          user_id: data.user.id,
          type: 'marketing',
          version,
          ip_hash: ipHash,
          metadata: { source: 'signup' },
        })
      }
    } catch {
      /* consent_logs optional, Registrierung trotzdem erfolgreich */
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
