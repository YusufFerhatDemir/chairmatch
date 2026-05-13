import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin, getSupabaseAnon } from '@/lib/supabase-server'
import { registerSchema } from '@/modules/auth/auth.schemas'

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

    // Fail-fast: kein Fallback auf altes Supabase-Projekt
    const supabase = getSupabaseAnon()
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
