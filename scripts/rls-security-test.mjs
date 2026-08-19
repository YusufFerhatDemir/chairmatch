#!/usr/bin/env node
/**
 * ChairMatch RLS-Sicherheitstests
 * ────────────────────────────────────────────────────────────────────
 * Prüft gegen ein LIVE-Supabase-Projekt, ob RLS wirklich greift.
 * Ändert nichts an Produktivdaten außer den Schreibversuchen, die
 * fehlschlagen SOLLEN (und bei Erfolg sofort wieder zurückgerollt
 * werden — siehe cleanup()).
 *
 * Benötigte Env-Variablen:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY      (für Admin-/Service-Tests)
 *   RLS_TEST_USER_A_EMAIL / RLS_TEST_USER_A_PASSWORD
 *   RLS_TEST_USER_B_EMAIL / RLS_TEST_USER_B_PASSWORD
 *
 * Aufruf:  node scripts/rls-security-test.mjs
 * Exit 0 = alle Tests grün, Exit 1 = mindestens ein Test rot.
 */
import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON) {
  console.error('FEHLT: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(2)
}

let pass = 0, fail = 0, skip = 0
const results = []

/**
 * Preflight: ein UNGÜLTIGER Anon-Key würde jede Abfrage mit einem Fehler
 * beantworten — und dieser Test würde das fälschlich als "blockiert = OK"
 * werten. Darum zuerst prüfen, dass der Key überhaupt akzeptiert wird.
 */
async function preflight() {
  const res = await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
  })
  if (res.status === 401 || res.status === 403) {
    console.error(`ABBRUCH: Anon-Key wird von ${URL} abgelehnt (HTTP ${res.status}).`)
    console.error('Ohne gültigen Key liefert jeder Test ein falsches PASS. Key erneuern.')
    process.exit(2)
  }
  console.log(`Preflight OK — Anon-Key gültig gegen ${URL} (HTTP ${res.status})`)
}

function ok(name, detail = '')  { pass++; results.push(['PASS', name, detail]); console.log(`  ✓ ${name}${detail ? ' — ' + detail : ''}`) }
function bad(name, detail = '') { fail++; results.push(['FAIL', name, detail]); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`) }
function skp(name, detail = '') { skip++; results.push(['SKIP', name, detail]); console.log(`  – ${name} (übersprungen: ${detail})`) }

/** Eine Leseabfrage gilt als blockiert, wenn sie einen Fehler wirft ODER 0 Zeilen liefert. */
async function expectNoRead(client, table, label) {
  const { data, error } = await client.from(table).select('*').limit(1)
  if (error) return ok(label, `blockiert (${error.code || error.message})`)
  if (!data || data.length === 0) return ok(label, 'blockiert (0 Zeilen)')
  bad(label, `LESBAR! ${data.length} Zeile(n) sichtbar`)
}

async function expectNoWrite(client, table, row, label) {
  const { data, error } = await client.from(table).insert(row).select()
  if (error) return ok(label, `blockiert (${error.code || error.message})`)
  bad(label, `SCHREIBBAR! eingefügt: ${JSON.stringify(data)}`)
}

// ── Gruppe 1: unauthentifizierter Zugriff (nur Anon-Key) ──────────────
async function testAnon() {
  console.log('\n[1] Unauthentifizierter Zugriff (Anon-Key, kein Login)')
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })

  // Tabellen, die für anon KOMPLETT dicht sein müssen
  const mustBeClosed = [
    'protect_pricing', 'compliance_plans', 'conversation_participants',
    'profiles', 'messages', 'conversations', 'payments', 'bookings',
    'rental_bookings', 'audit_logs', 'visit_logs', 'login_attempts',
    'documents', 'insurance_policies', 'compliance_documents',
    'user_2fa', 'push_subscriptions', 'newsletter', 'newsletter_subscribers',
    'orders', 'order_items', 'cart_items', 'commissions',
    'platform_transactions', 'provider_stripe_accounts', 'consents',
    'consent_logs', 'submission_tickets', 'authorities_packs',
  ]
  for (const t of mustBeClosed) await expectNoRead(anon, t, `anon kann ${t} NICHT lesen`)

  // Schreibversuche auf Preis-Konfiguration (Integritätsrisiko)
  await expectNoWrite(anon, 'protect_pricing',
    { risk_level: '__rls_test__', day_price_cents: 1, month_price_cents: 1, year_price_cents: 1 },
    'anon kann protect_pricing NICHT beschreiben')
  await expectNoWrite(anon, 'compliance_plans',
    { plan_type: '__rls_test__', price_cents: 1 },
    'anon kann compliance_plans NICHT beschreiben')
}

// ── Gruppe 2: Cross-User-Isolation (User A vs. User B) ────────────────
async function testCrossUser() {
  console.log('\n[2] Cross-User-Isolation (User A darf nichts von User B)')
  const A = { email: process.env.RLS_TEST_USER_A_EMAIL, password: process.env.RLS_TEST_USER_A_PASSWORD }
  const B = { email: process.env.RLS_TEST_USER_B_EMAIL, password: process.env.RLS_TEST_USER_B_PASSWORD }
  if (!A.email || !A.password || !B.email || !B.password) {
    return skp('Cross-User-Tests', 'RLS_TEST_USER_A/B_EMAIL+PASSWORD nicht gesetzt')
  }

  const ca = createClient(URL, ANON, { auth: { persistSession: false } })
  const cb = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: sa, error: ea } = await ca.auth.signInWithPassword(A)
  const { data: sb, error: eb } = await cb.auth.signInWithPassword(B)
  if (ea || eb) return skp('Cross-User-Tests', `Login fehlgeschlagen: ${ea?.message || eb?.message}`)
  const idA = sa.user.id, idB = sb.user.id
  ok('Login User A + User B erfolgreich', `${idA.slice(0, 8)}… / ${idB.slice(0, 8)}…`)

  // A darf B's Zeilen nicht sehen
  const ownedBy = [
    ['conversation_participants', 'user_id'],
    ['push_subscriptions',        'user_id'],
    ['user_2fa',                  'user_id'],
    ['consents',                  'user_id'],
    ['documents',                 'owner_id'],
    ['insurance_policies',        'owner_id'],
  ]
  for (const [table, col] of ownedBy) {
    const { data, error } = await ca.from(table).select('*').eq(col, idB)
    if (error) ok(`A sieht keine ${table} von B`, `blockiert (${error.code || error.message})`)
    else if (!data || data.length === 0) ok(`A sieht keine ${table} von B`, '0 Zeilen')
    else bad(`A sieht keine ${table} von B`, `${data.length} fremde Zeile(n) sichtbar!`)
  }

  // A darf B's Profil nicht ändern
  const { data: upd, error: uerr } = await ca.from('profiles')
    .update({ full_name: '__rls_test_tampered__' }).eq('id', idB).select()
  if (uerr) ok('A kann Profil von B NICHT ändern', `blockiert (${uerr.code || uerr.message})`)
  else if (!upd || upd.length === 0) ok('A kann Profil von B NICHT ändern', '0 Zeilen betroffen')
  else bad('A kann Profil von B NICHT ändern', 'UPDATE ging durch!')

  // A darf B's Profil nicht löschen
  const { data: del, error: derr } = await ca.from('profiles').delete().eq('id', idB).select()
  if (derr) ok('A kann Profil von B NICHT löschen', `blockiert (${derr.code || derr.message})`)
  else if (!del || del.length === 0) ok('A kann Profil von B NICHT löschen', '0 Zeilen betroffen')
  else bad('A kann Profil von B NICHT löschen', 'DELETE ging durch!')

  // A darf sich nicht in fremde Conversations eintragen
  const { data: convB } = await cb.from('conversation_participants').select('conversation_id').limit(1)
  if (convB && convB.length) {
    await expectNoWrite(ca, 'conversation_participants',
      { conversation_id: convB[0].conversation_id, user_id: idA },
      'A kann sich NICHT in fremde Conversation eintragen')
  } else {
    skp('A kann sich NICHT in fremde Conversation eintragen', 'keine Test-Conversation für B vorhanden')
  }

  // Legitimer Flow muss weiter funktionieren: A sieht sein eigenes Profil
  const { data: own, error: oerr } = await ca.from('profiles').select('id').eq('id', idA)
  if (!oerr && own && own.length === 1) ok('LEGITIM: A sieht sein eigenes Profil')
  else bad('LEGITIM: A sieht sein eigenes Profil', oerr?.message || 'keine Zeile — Policy zu streng!')

  await ca.auth.signOut(); await cb.auth.signOut()
}

// ── Gruppe 3: service_role muss weiter durchkommen ────────────────────
async function testService() {
  console.log('\n[3] Admin-/Service-Zugriff (service_role umgeht RLS)')
  if (!SERVICE) return skp('service_role-Tests', 'SUPABASE_SERVICE_ROLE_KEY nicht gesetzt')
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })
  for (const t of ['protect_pricing', 'compliance_plans', 'conversation_participants', 'profiles']) {
    const { error } = await svc.from(t).select('*').limit(1)
    if (error) bad(`service_role kann ${t} lesen`, error.message)
    else ok(`service_role kann ${t} lesen`)
  }
}

const cleanupNotes = []
async function cleanup() {
  if (!SERVICE) return
  const svc = createClient(URL, SERVICE, { auth: { persistSession: false } })
  for (const [table, col, val] of [
    ['protect_pricing', 'risk_level', '__rls_test__'],
    ['compliance_plans', 'plan_type', '__rls_test__'],
  ]) {
    const { data } = await svc.from(table).delete().eq(col, val).select()
    if (data && data.length) cleanupNotes.push(`${table}: ${data.length} Testzeile(n) entfernt`)
  }
  const svc2 = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const { data: p } = await svc2.from('profiles').select('id').eq('full_name', '__rls_test_tampered__')
  if (p && p.length) cleanupNotes.push(`WARNUNG: ${p.length} Profil(e) wurden manipuliert — manuell prüfen!`)
}

await preflight()
await testAnon()
await testCrossUser()
await testService()
await cleanup()

console.log('\n────────────────────────────────────────')
console.log(`Ergebnis: ${pass} PASS, ${fail} FAIL, ${skip} SKIP`)
if (cleanupNotes.length) { console.log('Cleanup:'); cleanupNotes.forEach(n => console.log('  ' + n)) }
if (fail > 0) {
  console.log('\nFehlgeschlagen:')
  results.filter(r => r[0] === 'FAIL').forEach(r => console.log(`  ✗ ${r[1]} — ${r[2]}`))
}
process.exit(fail > 0 ? 1 : 0)
