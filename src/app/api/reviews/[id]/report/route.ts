import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/modules/auth/auth.config'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

/**
 * DSA: Bewertung melden — POST /api/reviews/[id]/report
 *
 * Drei Dinge fehlten hier bis Track 10, und zusammen machten sie aus der
 * Meldung eine Geste ohne Wirkung.
 *
 * 1. NIEMAND LAS DAS ERGEBNIS. Die Route setzte `reported_flag`, und das war
 *    die einzige Stelle in der gesamten Anwendung, die diese Spalte
 *    ueberhaupt erwaehnt — kein Admin-Bildschirm, keine Abfrage, kein Cron
 *    hat sie je gelesen. Der Nutzer bekam "Bewertung wurde gemeldet.", und
 *    danach passierte nichts, jemals. Die Admin-Seite /admin/audit-logs
 *    fuehrt dagegen seit jeher ein Label `REVIEW_FLAGGED` ("Bewertung
 *    gemeldet") — die Meldung war dort vorgesehen und kam nie an. Genau das
 *    tut `flagReview` in review.actions.ts, eine Funktion, die von nirgends
 *    aufgerufen wird. Jetzt schreibt die Route den Audit-Eintrag selbst.
 *
 * 2. KEINE PRUEFUNG, OB ES DIE BEWERTUNG GIBT. Ein `update ... .eq('id', …)`
 *    auf eine unbekannte ID trifft keine Zeile und meldet keinen Fehler; die
 *    Route antwortete "Bewertung wurde gemeldet." fuer eine ID, zu der es
 *    nichts gab.
 *
 * 3. KEIN RATE-LIMIT. Jeder angemeldete Nutzer konnte in einer Schleife jede
 *    Bewertung der Plattform melden. `reported_by` ist eine einzelne Spalte:
 *    die letzte Meldung ueberschreibt die vorige, eine Meldewelle haette also
 *    nicht einmal Spuren hinterlassen. Der Audit-Eintrag aus (1) haelt jede
 *    Meldung einzeln fest, das Limit deckelt die Menge.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Pro Konto: 10 Meldungen je Stunde. Missbrauch faellt damit auf. */
const RATE = { scope: 'review-report', max: 10, windowMs: 60 * 60_000 }

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 })
  }
  const userId = session.user.id

  const { id } = await params
  if (!id || !UUID_RE.test(id)) {
    return NextResponse.json({ error: 'Ungültige Review-ID' }, { status: 400 })
  }

  // Gedeckelt wird pro Konto, nicht pro IP: die Route verlangt ohnehin eine
  // Anmeldung, und das Konto ist die Einheit, die in `reported_by` landet.
  const limit = checkRateLimit(userId, RATE)
  if (limit.limited) {
    return rateLimitResponse(limit, "Zu viele Meldungen. Bitte später erneut.")
  }

  const supabase = getSupabaseAdmin()

  const { data: review, error: leseFehler } = await supabase
    .from('reviews')
    .select('id, salon_id')
    .eq('id', id)
    .limit(1)

  if (leseFehler) {
    console.error('review report lookup failed:', leseFehler)
    return NextResponse.json({ error: 'Meldung fehlgeschlagen' }, { status: 500 })
  }
  if (!review || review.length === 0) {
    return NextResponse.json({ error: 'Bewertung nicht gefunden' }, { status: 404 })
  }

  const { error } = await supabase
    .from('reviews')
    .update({
      reported_flag: true,
      reported_at: new Date().toISOString(),
      reported_by: userId,
    })
    .eq('id', id)

  if (error) {
    console.error('review report update failed:', error)
    return NextResponse.json({ error: 'Meldung fehlgeschlagen' }, { status: 500 })
  }

  // Der Eintrag, den /admin/audit-logs anzeigt. Er ist die eigentliche
  // Meldung: `reported_by` haelt nur die zuletzt meldende Person fest, das
  // Log haelt jede einzelne Meldung.
  const { error: logFehler } = await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'REVIEW_FLAGGED',
    entity: 'review',
    entity_id: id,
    details: { salon_id: review[0].salon_id },
  })
  if (logFehler) {
    // Die Markierung steht; nur die Sichtbarkeit fuer Admins fehlt. Das ist
    // ein Fall fuers Log, kein Grund, dem Melder einen Fehlschlag zu melden.
    console.error('review report audit log failed:', logFehler)
  }

  return NextResponse.json({ ok: true, message: 'Bewertung wurde gemeldet.' })
}
