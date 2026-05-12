import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'

/**
 * Setup endpoint to promote a user to super_admin.
 * Secured by ADMIN_SETUP_KEY environment variable.
 *
 * Modi:
 *  (1) Self-Promote: Body { "setupKey": "..." } — befördert den eingeloggten User
 *  (2) Header-Promote: Header "x-setup-key" + Body { "email": "..." } — befördert beliebigen User
 *
 * Set ADMIN_SETUP_KEY in .env.local. Nach Nutzung wieder entfernen.
 */
export async function POST(req: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY
  if (!setupKey) {
    return NextResponse.json(
      { error: 'Setup endpoint deaktiviert. Setze ADMIN_SETUP_KEY in .env.local' },
      { status: 403 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Body parsen (robust)
  let body: { setupKey?: string; email?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body evtl. leer
  }

  const headerKey = req.headers.get('x-setup-key')
  const bodyKey = body.setupKey
  const providedKey = headerKey || bodyKey

  if (providedKey !== setupKey) {
    return NextResponse.json({ error: 'Ungültiger Setup-Key' }, { status: 403 })
  }

  // --- Modus 1: Self-Promote über Session ---
  if (!body.email) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Bitte einloggen, um dich selbst zu befördern.' },
        { status: 401 }
      )
    }
    const userId = (session.user as { id?: string }).id
    if (!userId) {
      return NextResponse.json({ error: 'Session ohne User-ID' }, { status: 400 })
    }

    const { data: profile, error: findError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single()

    if (findError || !profile) {
      return NextResponse.json(
        { error: 'Profil nicht gefunden. Bitte zuerst registrieren.' },
        { status: 404 }
      )
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', profile.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${profile.email || userId} wurde zu super_admin befördert.`,
      previous_role: profile.role,
      note: 'Bitte ADMIN_SETUP_KEY aus .env.local entfernen!',
    })
  }

  // --- Modus 2: Email-Promote ---
  const email = body.email
  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'Email muss ein String sein' }, { status: 400 })
  }

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, email, role')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (findError || !profile) {
    return NextResponse.json(
      { error: `Kein Benutzer mit E-Mail "${email}" gefunden. Bitte erst registrieren.` },
      { status: 404 }
    )
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', profile.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `${email} wurde zu super_admin befördert.`,
    previous_role: profile.role,
    note: 'Bitte ADMIN_SETUP_KEY aus .env.local entfernen!',
  })
}
