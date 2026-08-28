import { NextRequest, NextResponse } from 'next/server'
import { signOut } from '@/modules/auth/auth.config'
import { getServerSession } from '@/modules/auth/session'
import { invalidateAccountState } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { dbError } from '@/lib/api-wrapper'
import { deleteSubscriptionsForUser } from '@/lib/push'

/**
 * DSGVO Art. 17: Konto-Löschung.
 *
 * Ablauf: die Kontaktdaten werden sofort entfernt und das Konto deaktiviert
 * (`is_active = false` sperrt den Login, siehe auth.config). Der endgültige
 * Hard-Delete inklusive `auth.users` läuft 30 Tage später über
 * /api/cron/hard-delete.
 *
 * Zwei Riegel, die bis 2026-08-27 fehlten:
 *
 *  1. BESTÄTIGUNG. Ein einzelnes POST mit vorhandenem Session-Cookie hat
 *     genügt, um das Konto unwiderruflich zu anonymisieren — ohne Rückfrage,
 *     ohne Eingabe, ohne Weg zurück (der Login ist danach gesperrt, die
 *     E-Mail gelöscht). Jetzt muss die eigene E-Mail-Adresse mitgeschickt
 *     werden: das setzt Kenntnis des Kontos voraus und macht ein blind
 *     abgesetztes Fremd-POST wirkungslos.
 *  2. WIEDERHOLUNG. Ein zweites POST hat `delete_requested_at` neu gestempelt
 *     und damit die 30-Tage-Frist jedes Mal von vorn beginnen lassen — das
 *     Konto wäre nie hart gelöscht worden.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const userId = session.user.id

  let body: { confirmEmail?: unknown } = {}
  try {
    body = await req.json()
  } catch {
    // Body optional lesbar — die Prüfung unten schlägt dann ohnehin fehl.
  }

  const { data: profile, error: loadError } = await supabase
    .from('profiles')
    .select('id, email, delete_requested_at')
    .eq('id', userId)
    .maybeSingle()

  if (loadError) {
    return dbError('account-delete', loadError)
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profil nicht gefunden' }, { status: 404 })
  }

  if (profile.delete_requested_at) {
    return NextResponse.json(
      {
        error: 'Für dieses Konto läuft bereits eine Löschung.',
        deleteRequestedAt: profile.delete_requested_at,
      },
      { status: 409 },
    )
  }

  const confirmEmail = typeof body.confirmEmail === 'string' ? body.confirmEmail.trim() : ''
  const kontoEmail = typeof profile.email === 'string' ? profile.email.trim() : ''
  if (!confirmEmail || !kontoEmail || confirmEmail.toLowerCase() !== kontoEmail.toLowerCase()) {
    return NextResponse.json(
      {
        error:
          'Zur Bestätigung bitte die E-Mail-Adresse des Kontos als "confirmEmail" mitschicken.',
      },
      { status: 400 },
    )
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      delete_requested_at: new Date().toISOString(),
      is_active: false,
      email: null,
      full_name: 'Gelöscht',
      phone: null,
    })
    .eq('id', userId)
    // Race-Schutz: zwei gleichzeitige Anfragen dürfen den Zeitstempel nicht
    // zweimal setzen. Nur die erste findet delete_requested_at noch leer.
    .is('delete_requested_at', null)

  if (error) {
    return dbError('account-delete', error)
  }

  // Zustellwege sofort schliessen.
  //
  // `push_subscriptions.user_id` und `notification_log.user_id` haengen per
  // ON DELETE CASCADE an `profiles` — nur wird `profiles` hier gar nicht
  // geloescht, sondern anonymisiert. Die Kaskade feuert also nie, und ohne
  // diesen Schritt bleiben Geraete-Endpunkt und Postfach eines geloeschten
  // Kontos stehen. Der Endpunkt ist ein Zustellziel: er gehoert zum Zeitpunkt
  // des Antrags weg, nicht 30 Tage spaeter.
  const { error: pushFehler } = await deleteSubscriptionsForUser(userId)
  if (pushFehler) console.error('[account-delete] push_subscriptions:', pushFehler)

  // Die Warteliste kennt kein Konto — sie ist ueber die E-Mail-Adresse
  // gefuehrt. Nach diesem Update ist `profiles.email` leer; wer die Adresse
  // hier nicht austraegt, kann sie danach nicht mehr zuordnen. Es ist die
  // einzige Stelle, an der ein Wartelisten-Eintrag ueberhaupt endet: eine
  // Abmeldung gibt es dort nicht.
  if (kontoEmail) {
    const { error: warteFehler } = await supabase
      .from('wait_list')
      .delete()
      .eq('email', kontoEmail.toLowerCase())
    if (warteFehler) console.error('[account-delete] wait_list:', warteFehler.message)
  }

  await supabase.from('audit_logs').insert({
    user_id: userId,
    action: 'ACCOUNT_DELETE_REQUESTED',
    entity: 'profile',
    entity_id: userId,
    details: { hard_delete_after_days: 30, push_abos_geloescht: !pushFehler },
  })

  // Der Kontostand-Cache haelt `is_active` sonst noch kurz auf true —
  // relevant fuer parallele Anfragen mit demselben Cookie.
  invalidateAccountState(userId)

  await signOut({ redirect: false })
  return NextResponse.json({
    success: true,
    // Die alte Meldung ("Konto zur Löschung markiert") las sich, als bliebe
    // alles 30 Tage erhalten und umkehrbar. Tatsächlich sind Kontaktdaten und
    // Login sofort weg — das gehört so gesagt.
    message:
      'Konto deaktiviert, Kontaktdaten gelöscht. Die endgültige Löschung erfolgt nach 30 Tagen.',
  })
}
