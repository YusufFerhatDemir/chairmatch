import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cron-auth'

/**
 * Cron: Hard-Delete nach 30 Tagen (DSGVO)
 * Vercel Cron: vercel.json "crons": [{ "path": "/api/cron/hard-delete", "schedule": "0 2 * * *" }]
 * Oder: Vercel Dashboard → Cron Jobs
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  const cutoffIso = cutoff.toISOString()

  // `.is('deleted_at', null)` fehlte: bereits hart geloeschte Profile wurden
  // in JEDEM naechtlichen Lauf erneut aufgegriffen. Zwei Folgen — der Aufruf
  // `auth.admin.deleteUser` lief dauerhaft gegen nicht mehr existierende
  // Nutzer und produzierte Fehlerrauschen, und `deleted_at` wurde jede Nacht
  // neu gestempelt: der Zeitpunkt der tatsaechlichen Loeschung, den man fuer
  // eine Auskunft nach Art. 15 braucht, ging damit verloren.
  const { data: toDelete } = await supabase
    .from('profiles')
    .select('id')
    .not('delete_requested_at', 'is', null)
    .is('deleted_at', null)
    .lte('delete_requested_at', cutoffIso)

  let deleted = 0
  const errors: string[] = []
  for (const row of toDelete ?? []) {
    // 1. Profil als geloescht markieren und die Kontaktdaten sicher entfernen.
    //
    // Regulaer hat /api/account/delete das schon beim Antrag getan. Dieser
    // Schritt ist der Rueckfall fuer Profile, die auf anderem Weg zur
    // Loeschung markiert wurden (Admin, Migration, Altbestand) — bisher hat
    // der Cron nur `deleted_at` gesetzt und die PII stehen lassen.
    const { error } = await supabase
      .from('profiles')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
        email: null,
        full_name: 'Gelöscht',
        phone: null,
      })
      .eq('id', row.id)
      .is('deleted_at', null)
    if (error) {
      errors.push(`profile ${row.id}: ${error.message}`)
      continue
    }
    // 2. Zustellwege raeumen.
    //
    // `notification_log` und `push_subscriptions` haengen per ON DELETE
    // CASCADE an `profiles` — und `profiles` wird hier nicht geloescht,
    // sondern anonymisiert. Die Kaskade feuert also nie. Ohne diesen Schritt
    // steht nach der endgueltigen Loeschung weiter das ganze Postfach da:
    // „Dein Termin am 03.09. 10:00", „Deine Bestellung CM-1042 ist bezahlt
    // (89,00 EUR)" — Datum, Betrag, Bestellnummer, an einer user_id, die es
    // in `auth.users` nicht mehr gibt.
    for (const tabelle of ['notification_log', 'push_subscriptions'] as const) {
      const { error: raeumFehler } = await supabase.from(tabelle).delete().eq('user_id', row.id)
      if (raeumFehler) errors.push(`${tabelle} ${row.id}: ${raeumFehler.message}`)
    }

    // 3. Delete auth.users via Admin API
    try {
      const { error: authErr } = await supabase.auth.admin.deleteUser(row.id)
      if (authErr) errors.push(`auth ${row.id}: ${authErr.message}`)
    } catch {
      errors.push(`auth ${row.id}: Admin API nicht verfügbar`)
    }
    deleted++
  }

  if (errors.length > 0) {
    console.error('Hard-delete errors:', errors)
  }

  return NextResponse.json({ ok: true, deleted, total: toDelete?.length ?? 0, errors: errors.length })
}
