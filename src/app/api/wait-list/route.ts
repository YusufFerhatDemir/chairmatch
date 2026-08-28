/**
 * POST /api/wait-list — Eintrag fuer eine Stadt-Benachrichtigung.
 *
 * WAS HIER BIS TRACK 23 PASSIERT IST: NICHTS. UND ZWAR MIT `{ ok: true }`.
 *
 * Die Route schrieb
 *
 *     .upsert({ … }, { onConflict: 'email,city' })
 *
 * `ON CONFLICT (email, city)` verlangt einen UNIQUE-Index auf genau diesen
 * beiden SPALTEN. Der Index der Tabelle ist aber ein Ausdrucks-Index:
 *
 *     CREATE UNIQUE INDEX wait_list_email_city_uidx
 *       ON public.wait_list (email, COALESCE(city, ''));
 *
 * (supabase/migrations/20260515_wait_list.sql — die Tabelle steht live mit
 * genau diesen Spalten, die Migration ist also gelaufen.) Ein Ausdrucks-Index
 * ist kein Kandidat fuer `ON CONFLICT (email, city)`; Postgres antwortet mit
 * 42P10 „there is no unique or exclusion constraint matching the ON CONFLICT
 * specification". JEDER Eintrag lief in diesen Fehler.
 *
 * Der Rueckfall darunter half nicht, sondern verdeckte es:
 *
 *   - Er schrieb nach `newsletter`. Das ist live eine VIEW („permission denied
 *     for view newsletter"), kein Tisch — ein ON CONFLICT ist darauf gar nicht
 *     moeglich.
 *   - Er stand in einem `try/catch`. supabase-js WIRFT bei einem DB-Fehler
 *     aber nicht, es gibt `{ error }` zurueck. Der Rueckgabewert wurde nicht
 *     angesehen, das `catch` also nie betreten.
 *
 * Danach lief die Funktion weiter bis `return { ok: true }`. Wer sich seit dem
 * 15.05.2026 eingetragen hat, hat eine Bestaetigung gesehen und steht
 * nirgends.
 *
 * Jetzt: nachsehen, dann schreiben — ohne ON CONFLICT, damit es gegen das
 * Schema laeuft, das heute da ist. Ein 23505 aus dem Rennen zweier
 * gleichzeitiger Anmeldungen ist der gewuenschte Endzustand und zaehlt als
 * Erfolg. Jeder andere Fehler wird gemeldet, nicht geschluckt.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'
import { hashIp } from '@/lib/ip-hash'
import { z } from 'zod'

const waitListSchema = z.object({
  email: z.string().email().max(255),
  city: z.string().max(100).optional(),
  source: z.string().max(50).optional(),
})

/** Max. Eintraege pro Stunde und IP. */
const MAX_PRO_IP_UND_STUNDE = 5

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const parsed = waitListSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 })
    }

    const { email: rohEmail, city: rohCity, source } = parsed.data
    const email = rohEmail.toLowerCase().trim()
    // Der Index dedupliziert ueber COALESCE(city, ''). Damit dieselbe Stadt
    // nicht einmal als '' und einmal als NULL in der Tabelle steht, wird hier
    // genau eine Schreibweise erzeugt: leer -> NULL.
    const city = rohCity && rohCity.trim() ? rohCity.trim().slice(0, 100) : null

    const supabase = getSupabaseAdmin()
    const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const ipHash = rawIp ? hashIp(rawIp) : null

    if (ipHash) {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      const { count, error: zaehlFehler } = await supabase
        .from('wait_list')
        .select('id', { count: 'exact', head: true })
        .eq('ip', ipHash)
        .gte('created_at', hourAgo)

      // Der Zaehler entscheidet ueber eine Ablehnung. Faellt er aus, wird
      // nicht durchgewunken: sonst ist der Deckel bei jedem DB-Aussetzer weg.
      if (zaehlFehler) {
        logger.error('wait_list.rate_check_failed', { code: zaehlFehler.code, msg: zaehlFehler.message })
        return NextResponse.json({ error: 'Speichern derzeit nicht möglich.' }, { status: 503 })
      }
      if ((count ?? 0) >= MAX_PRO_IP_UND_STUNDE) {
        return NextResponse.json({ error: 'Zu viele Anfragen, bitte später erneut.' }, { status: 429 })
      }
    }

    // Schon eingetragen? Dann ist der Wunsch bereits vermerkt — der Eintrag
    // wird aufgefrischt, nicht verdoppelt.
    let vorhandenQuery = supabase.from('wait_list').select('id').eq('email', email)
    vorhandenQuery = city === null
      ? vorhandenQuery.is('city', null)
      : vorhandenQuery.eq('city', city)

    const { data: vorhanden, error: leseFehler } = await vorhandenQuery.maybeSingle()

    if (leseFehler) {
      logger.error('wait_list.lookup_failed', { code: leseFehler.code, msg: leseFehler.message })
      return NextResponse.json({ error: 'Speichern derzeit nicht möglich.' }, { status: 503 })
    }

    if (vorhanden) {
      const { error } = await supabase
        .from('wait_list')
        .update({ source: source || 'search', ip: ipHash })
        .eq('id', vorhanden.id)
      if (error) {
        logger.error('wait_list.update_failed', { code: error.code, msg: error.message })
        return NextResponse.json({ error: 'Speichern derzeit nicht möglich.' }, { status: 503 })
      }
      return NextResponse.json({ ok: true, created: false })
    }

    const { error } = await supabase.from('wait_list').insert({
      email,
      city,
      source: source || 'search',
      ip: ipHash,
    })

    if (error) {
      // 23505: zwei gleichzeitige Anmeldungen derselben Adresse. Der
      // Endzustand ist der gewuenschte.
      if (error.code === '23505') {
        return NextResponse.json({ ok: true, created: false })
      }
      logger.error('wait_list.insert_failed', { code: error.code, msg: error.message })
      return NextResponse.json({ error: 'Speichern derzeit nicht möglich.' }, { status: 503 })
    }

    return NextResponse.json({ ok: true, created: true })
  } catch (e) {
    logger.error('wait_list.unhandled', e)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
