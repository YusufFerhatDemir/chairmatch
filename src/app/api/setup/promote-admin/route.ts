import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { auth } from '@/modules/auth/auth.config'
import { logger } from '@/lib/logger'

/**
 * Promote-Admin-Endpoint — MULTI-LAYER-DEFENSE.
 *
 * Sicherheits-Stack (alle Schichten müssen passieren):
 *   1. ENV-Var `ADMIN_SETUP_KEY` muss gesetzt sein (sonst 403)
 *   2. Provided Key muss exakt matchen (Timing-Safe)
 *   3. Endpoint funktioniert NUR wenn KEIN super_admin existiert (Bootstrap-Only)
 *      → Nach erstem Setup wird er automatisch nutzlos
 *   4. Bei Erfolg wird Audit-Log mit IP geschrieben
 *
 * Diese Schicht-3-Logik verhindert den schlimmsten Audit-Fund:
 * Wenn ADMIN_SETUP_KEY leaked, kann TROTZDEM kein weiterer User
 * zu super_admin promotet werden, sobald einer existiert.
 *
 * VOR PRODUCTION-LAUNCH: ADMIN_SETUP_KEY in Vercel setzen, ersten Admin
 * promoten, dann ENV-Var WIEDER ENTFERNEN.
 */

import { timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, 'utf-8')
    const bBuf = Buffer.from(b, 'utf-8')
    if (aBuf.length !== bBuf.length) return false
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY
  if (!setupKey || setupKey.length < 32) {
    return NextResponse.json(
      { error: 'Setup-Endpoint deaktiviert (ADMIN_SETUP_KEY nicht oder zu kurz konfiguriert; min. 32 Zeichen).' },
      { status: 403 }
    )
  }

  const supabase = getSupabaseAdmin()

  // ── LAYER 3: BOOTSTRAP-ONLY ─────────────────────────────────────────
  // Wenn bereits ein super_admin existiert → Endpoint hard-disable.
  try {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin')

    if ((count ?? 0) > 0) {
      logger.warn('promote_admin.attempted_after_bootstrap', {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        existing_super_admin_count: count,
      })
      return NextResponse.json(
        {
          error: 'Setup-Endpoint ist bereits genutzt. Weitere Admin-Promotion nur durch existierenden super_admin im Admin-Panel.',
        },
        { status: 403 }
      )
    }
  } catch (e) {
    logger.error('promote_admin.bootstrap_check_failed', e)
    return NextResponse.json({ error: 'Bootstrap-Check fehlgeschlagen' }, { status: 500 })
  }

  // ── LAYER 1+2: KEY-CHECK ────────────────────────────────────────────
  let body: { setupKey?: string; email?: string } = {}
  try { body = await req.json() } catch { /* empty */ }

  const headerKey = req.headers.get('x-setup-key')
  const providedKey = headerKey || body.setupKey || ''

  if (!providedKey || !safeEqual(providedKey, setupKey)) {
    logger.warn('promote_admin.invalid_key', {
      ip: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent')?.slice(0, 200),
    })
    return NextResponse.json({ error: 'Ungültiger Setup-Key' }, { status: 403 })
  }

  // ── Promotion ───────────────────────────────────────────────────────
  let targetUserId: string | null = null
  let targetEmail: string | null = null

  if (body.email && typeof body.email === 'string') {
    // Modus: Email-Promote
    const cleanEmail = body.email.toLowerCase().trim()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', cleanEmail)
      .single()

    if (error || !profile) {
      return NextResponse.json(
        { error: `Kein Benutzer mit E-Mail "${cleanEmail}" gefunden. Bitte erst registrieren.` },
        { status: 404 }
      )
    }
    targetUserId = profile.id
    targetEmail = profile.email
  } else {
    // Modus: Self-Promote über Session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Bitte einloggen, um dich selbst zu befördern.' },
        { status: 401 }
      )
    }
    const userId = (session.user as { id?: string; email?: string }).id
    const userEmail = (session.user as { id?: string; email?: string }).email
    if (!userId) {
      return NextResponse.json({ error: 'Session ohne User-ID' }, { status: 400 })
    }
    targetUserId = userId
    targetEmail = userEmail || null
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'super_admin' })
    .eq('id', targetUserId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Audit-Log
  try {
    await supabase.from('audit_logs').insert({
      user_id: targetUserId,
      action: 'role.promote_to_super_admin_via_bootstrap',
      entity_type: 'profile',
      entity_id: targetUserId,
      metadata: {
        ip: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent')?.slice(0, 200),
        email: targetEmail,
      },
    })
  } catch (e) {
    logger.warn('promote_admin.audit_log_failed', { err: String(e) })
  }

  return NextResponse.json({
    success: true,
    message: `${targetEmail || targetUserId} wurde zu super_admin befördert.`,
    note: 'WICHTIG: ADMIN_SETUP_KEY aus Vercel-ENV entfernen! Endpoint ist nach erstem Setup automatisch deaktiviert.',
  })
}
