/**
 * Cron: Tägliches Auto-Publish überfälliger Reviews.
 *
 * Wenn 14 Tage nach Booking-Ende KEINE Gegen-Bewertung kam,
 * wird die alleinstehende Bewertung freigeschaltet.
 *
 * Schedule: 1x/Tag um 03:30 (siehe vercel.json).
 *
 * ──────────────────────────────────────────────────────────────────────
 * TRACK 22: warum hier nicht mehr `publish_review_pair()` steht
 * ──────────────────────────────────────────────────────────────────────
 * Der Cron hat die faelligen Bewertungen korrekt gefunden und dann pro
 * Buchung die Stored Procedure `publish_review_pair(p_booking_id)` gerufen.
 * Die Funktion loest das Buchungsende so auf:
 *
 *     SELECT COALESCE(end_at, updated_at, created_at) INTO v_booking_ended_at
 *     FROM public.bookings WHERE id = p_booking_id;
 *
 * Nur ist `reviews.booking_id` seit Migration 20260702_reviews_rental_bookings
 * ABSICHTLICH polymorph: Miet-Bewertungen (tenant_to_provider /
 * provider_to_tenant) tragen dort eine `rental_bookings.id`, und der
 * Fremdschluessel auf `bookings` wurde genau deshalb entfernt. Die Funktion
 * wurde nicht mitgezogen. Fuer jede Miet-Bewertung findet sie also KEINE
 * Zeile, `v_booking_ended_at` bleibt NULL, `v_days_since_booking` wird NULL,
 * und `IF NULL >= 14` ist nicht wahr — die 14-Tage-Freischaltung ist nie
 * gelaufen.
 *
 * Sichtbar war das nirgends: die Funktion gibt VOID zurueck und meldet
 * keinen Fehler, wenn sie nichts findet. `supabase.rpc()` lieferte also
 * `error: null`, der Cron zaehlte `published++` und antwortete `ok: true`.
 * Track 20 hat an dieser Stelle das Fehler-Handling repariert; die Meldung
 * blieb trotzdem falsch, weil der Aufruf wirklich gelingt — er tut nur
 * nichts. Genau diese Antwort ist die einzige Stelle, an der auffallen kann,
 * dass seit Monaten keine einseitige Miet-Bewertung mehr sichtbar wird.
 *
 * Folge im Produkt: `/api/reviews/rental` verspricht dem Bewertenden
 * woertlich „spaetestens nach 14 Tagen". Eingeloest wurde das nur, wenn auch
 * die Gegenseite bewertet hat (Fall 1 der Funktion, der ohne `bookings`
 * auskommt). Alles Einseitige — der Normalfall — lag unbegrenzt als Entwurf
 * in der Tabelle, und `profiles.avg_rating_as_tenant` /
 * `avg_rating_as_provider` blieben leer.
 *
 * Der Cron schaltet die faelligen Bewertungen jetzt selbst frei, statt sich
 * auf eine Funktion zu verlassen, die in der falschen Tabelle sucht. Die
 * Funktion wird in supabase/migrations/20260828_miet_marktplatz_haertung.sql
 * ebenfalls repariert (polymorphe Aufloesung) — das ist die zweite Schicht
 * fuer den Pfad, der direkt nach dem Absenden laeuft, und sie braucht einen
 * Migrationslauf. Dieser Code hier braucht keinen.
 *
 * Warum `created_at` als Faelligkeitsmass genuegt: eine Miet-Bewertung kann
 * erst NACH dem Ende der Buchung abgegeben werden (`bookingEnded()` in
 * /api/reviews/rental). `created_at >= Buchungsende` gilt also immer, und
 * „created_at aelter als 14 Tage" ist damit eine konservative Naeherung an
 * „Buchungsende aelter als 14 Tage": sie schaltet nie zu frueh frei,
 * hoechstens spaeter.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isAuthorizedCron } from '@/lib/cron-auth'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/** Bewertungstypen mit Double-Blind-Regel. */
const RENTAL_REVIEW_TYPES = ['tenant_to_provider', 'provider_to_tenant']

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdmin()
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  // Finde alle unpublished Reviews älter als 14 Tage
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: stale, error: staleError } = await (supabase as any)
    .from('reviews')
    .select('id, booking_id')
    .eq('published', false)
    .lt('created_at', cutoff)
    .in('review_type', RENTAL_REVIEW_TYPES)
    .limit(500)

  // Faellt die Abfrage aus, ist `stale` ebenfalls leer — bis Track 20 war
  // ein Ausfall der Datenbank von „nichts zu tun" nicht zu unterscheiden.
  if (staleError) {
    logger.warn('cron.publish_reviews_query_failed', { err: staleError.message })
    return NextResponse.json(
      { ok: false, published: 0, error: 'Faellige Bewertungen konnten nicht geladen werden' },
      { status: 503 },
    )
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ ok: true, published: 0, failed: 0, processed_bookings: 0 })
  }

  const ids: string[] = (stale as Array<{ id: string }>).map((r) => r.id)
  const processedBookings = new Set(
    (stale as Array<{ booking_id: string | null }>)
      .map((r) => r.booking_id)
      .filter((b): b is string => typeof b === 'string' && b.length > 0),
  ).size

  // `.eq('published', false)` ist der Claim: ein parallel laufender
  // Freischalte-Pfad (publish_review_pair beim Absenden der Gegenbewertung)
  // darf dieselbe Zeile nicht doppelt zaehlen. `.select('id')` ist der
  // Grund, warum die Zahl unten die WIRKLICH geschriebenen Zeilen meldet und
  // nicht die versuchten — der Unterschied war der ganze Befund.
  const { data: updated, error: updateError } = await supabase
    .from('reviews')
    .update({ published: true, visible_at: new Date().toISOString() })
    .in('id', ids)
    .eq('published', false)
    .select('id')

  if (updateError) {
    logger.warn('cron.publish_reviews_update_failed', { err: updateError.message })
    return NextResponse.json(
      {
        ok: false,
        published: 0,
        failed: ids.length,
        processed_bookings: processedBookings,
        error: 'Faellige Bewertungen konnten nicht freigeschaltet werden',
      },
      { status: 503 },
    )
  }

  const published = updated?.length ?? 0
  // Nicht geschriebene Zeilen sind kein Fehler, sondern der Normalfall des
  // Rennens (jemand anderes war schneller) — sie werden getrennt gemeldet,
  // statt in `published` mitzuzaehlen.
  const alreadyPublished = ids.length - published

  return NextResponse.json({
    ok: true,
    published,
    failed: 0,
    already_published: alreadyPublished,
    processed_bookings: processedBookings,
  })
}
