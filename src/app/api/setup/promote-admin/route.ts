import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * One-time setup endpoint to promote a user to super_admin.
 * Secured by ADMIN_SETUP_KEY environment variable.
 *
 * Usage:
 *   POST /api/setup/promote-admin
 *   Headers: { "x-setup-key": "<ADMIN_SETUP_KEY>" }
 *   Body: { "email": "your@email.com" }
 *
 * Set ADMIN_SETUP_KEY in .env.local, then call this once.
 * After use, remove ADMIN_SETUP_KEY from env for security.
 */
export async function POST(req: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY
  if (!setupKey) {
    return NextResponse.json(
      { error: 'Setup endpoint deaktiviert. Setze ADMIN_SETUP_KEY in .env.local' },
      { status: 403 }
    )
  }

  const providedKey = req.headers.get('x-setup-key')
  if (providedKey !== setupKey) {
    return NextResponse.json({ error: 'Ungültiger Setup-Key' }, { status: 403 })
  }

  const { email } = await req.json()
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email erforderlich' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Find user by email
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

  // Promote to super_admin
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
