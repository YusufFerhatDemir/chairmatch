import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getServerSession, invalidateAccountState } from '@/modules/auth/session'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'
import { dbError } from '@/lib/api-wrapper'

/**
 * Setup endpoint to promote a user to super_admin.
 * Secured by ADMIN_SETUP_KEY environment variable.
 *
 * Modi:
 *  (1) Self-Promote: Body { "setupKey": "..." } — befördert den eingeloggten User
 *  (2) Header-Promote: Header "x-setup-key" + Body { "email": "..." } — befördert beliebigen User
 *
 * Set ADMIN_SETUP_KEY in .env.local. Nach Nutzung wieder entfernen.
 *
 * Dieser Endpunkt vergibt die hoechste Rolle der Anwendung. Drei Riegel, die
 * bis 2026-08-24 fehlten:
 *
 *   1. Rate-Limit. Der Schluesselvergleich war der einzige Schutz, und es gab
 *      beliebig viele Versuche pro Sekunde.
 *   2. Zeitkonstanter Vergleich. `!==` bricht beim ersten abweichenden Byte
 *      ab; ueber genug Versuche laesst sich daraus die Laufzeit auslesen.
 *   3. Mindestlaenge. Ein versehentlich kurzes ADMIN_SETUP_KEY (etwa "test")
 *      machte den Endpunkt praktisch offen — jetzt bleibt er deaktiviert.
 */

const RATE = { scope: 'promote-admin', max: 5, windowMs: 60 * 60_000 }

/** Kuerzere Schluessel sind kein Schutz — der Endpunkt bleibt dann zu. */
const MIN_KEY_LENGTH = 24

/**
 * Die hoechste Rolle der Anwendung zu vergeben, hinterlaesst eine Spur.
 *
 * Bis Track E tat sie das NICHT: die Route schrieb `role = 'super_admin'` und
 * antwortete 200, ohne eine einzige Zeile in `audit_logs`. `/admin/audit-logs`
 * zeigt Erstattungen, Passwortwechsel und gemeldete Bewertungen — nur die
 * Vergabe der Vollmacht ueber alles davon war unsichtbar. Wer den Schluessel
 * hat, war danach Super-Admin, und niemand konnte hinterher sagen, wann und
 * von welcher Adresse aus.
 *
 * Der Schreibfehler wird bewusst NICHT zum Abbruch: die Befoerderung hat zu
 * diesem Zeitpunkt schon stattgefunden, ein 500 danach wuerde nur eine
 * falsche Auskunft geben.
 */
async function protokolliereBefoerderung(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  args: { profileId: string; email: string | null; vorher: string | null; modus: 'self' | 'email'; ip: string },
) {
  const { error } = await supabase.from('audit_logs').insert({
    user_id: args.profileId,
    action: 'role.promoted_super_admin',
    entity: 'profile',
    entity_id: args.profileId,
    details: {
      email: args.email,
      previous_role: args.vorher,
      modus: args.modus,
      ip: args.ip,
      endpunkt: '/api/setup/promote-admin',
    },
  })
  if (error) console.error('promote-admin audit_logs insert failed:', error.message)
}

/** Vergleich ohne Laufzeit-Leck; Laengenunterschied ist ohnehin oeffentlich. */
function keyMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export async function POST(req: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY
  if (!setupKey) {
    return NextResponse.json(
      { error: 'Setup endpoint deaktiviert. Setze ADMIN_SETUP_KEY in .env.local' },
      { status: 403 }
    )
  }
  if (setupKey.length < MIN_KEY_LENGTH) {
    console.error(
      `[promote-admin] ADMIN_SETUP_KEY ist zu kurz (${setupKey.length} < ${MIN_KEY_LENGTH}) — Endpunkt bleibt deaktiviert.`
    )
    return NextResponse.json({ error: 'Setup endpoint deaktiviert.' }, { status: 403 })
  }

  const limit = checkRateLimit(clientIp(req), RATE)
  if (limit.limited) {
    return rateLimitResponse(limit, 'Zu viele Versuche.')
  }

  const supabase = getSupabaseAdmin()

  // Body parsen (robust)
  let body: { setupKey?: string; email?: string } = {}
  try {
    body = await req.json()
  } catch {
    // Body evtl. leer
  }

  const providedKey = req.headers.get('x-setup-key') ?? body.setupKey ?? null

  if (!keyMatches(providedKey, setupKey)) {
    console.warn('[promote-admin] Fehlgeschlagener Setup-Key von', clientIp(req))
    return NextResponse.json({ error: 'Ungültiger Setup-Key' }, { status: 403 })
  }

  // --- Modus 1: Self-Promote über Session ---
  if (!body.email) {
    const session = await getServerSession()
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
      return dbError('promote-admin-update', updateError)
    }
    invalidateAccountState(profile.id)
    await protokolliereBefoerderung(supabase, {
      profileId: profile.id,
      email: profile.email ?? null,
      vorher: profile.role ?? null,
      modus: 'self',
      ip: clientIp(req),
    })

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
    return dbError('promote-admin-flag', updateError)
  }
  invalidateAccountState(profile.id)
  await protokolliereBefoerderung(supabase, {
    profileId: profile.id,
    email: profile.email ?? null,
    vorher: profile.role ?? null,
    modus: 'email',
    ip: clientIp(req),
  })

  return NextResponse.json({
    success: true,
    message: `${email} wurde zu super_admin befördert.`,
    previous_role: profile.role,
    note: 'Bitte ADMIN_SETUP_KEY aus .env.local entfernen!',
  })
}
