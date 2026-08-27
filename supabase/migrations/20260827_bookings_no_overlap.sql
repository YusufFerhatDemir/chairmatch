-- ──────────────────────────────────────────────────────────────────────
-- Termin-Buchungen: Ueberschneidungen auf DB-Ebene ausschliessen
-- ──────────────────────────────────────────────────────────────────────
-- `createBooking` prueft den Slot mit einem SELECT und legt danach die
-- Buchung an. Zwischen beiden Schritten passt eine zweite Buchung: zwei
-- gleichzeitige Anfragen sehen denselben freien Slot und schreiben beide.
--
-- Fuer `rental_bookings` faengt das seit Migration
-- 20260705_rental_booking_constraints der EXCLUDE-Constraint
-- `rental_bookings_no_overlap` ab. Fuer `bookings` gab es kein Gegenstueck.
--
-- Die Anwendung hat seit 2026-08-27 eine Nachpruefung (losesSlotRace in
-- booking.actions.ts): beide Seiten sehen einander nach dem Insert, die
-- juengere Buchung tritt zurueck. Das schliesst das Fenster praktisch, aber
-- nicht formal — nur die DB kann das. Diese Migration liefert den harten
-- Riegel nach; die Nachpruefung darf danach bleiben (sie greift dann nur
-- noch, wenn der Constraint aus irgendeinem Grund fehlt).
--
-- Abgrenzung: es zaehlen nur aktive Buchungen. Stornierte, abgeschlossene
-- und No-Show-Termine duerfen sich ueberschneiden — sie belegen nichts mehr.
-- ──────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Vorhandene Ueberschneidungen wuerden das ADD CONSTRAINT scheitern lassen.
-- Erst zeigen, was da ist — dann entscheiden, nicht blind loeschen.
DO $$
DECLARE kollisionen INTEGER;
BEGIN
  SELECT COUNT(*) INTO kollisionen
  FROM public.bookings a
  JOIN public.bookings b
    ON a.id < b.id
   AND a.salon_id = b.salon_id
   AND a.booking_date = b.booking_date
   AND a.status IN ('pending', 'confirmed')
   AND b.status IN ('pending', 'confirmed')
   AND a.start_time < b.end_time
   AND b.start_time < a.end_time;

  IF kollisionen > 0 THEN
    RAISE EXCEPTION
      'bookings: % bestehende Ueberschneidung(en) — der Constraint kann nicht gesetzt werden. Bitte die Doppelbuchungen zuerst klaeren (eine Seite stornieren oder umlegen).',
      kollisionen;
  END IF;
END $$;

ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    salon_id WITH =,
    booking_date WITH =,
    tsrange(
      ('2000-01-01'::date + start_time)::timestamp,
      ('2000-01-01'::date + end_time)::timestamp,
      '[)'
    ) WITH &&
  )
  WHERE (status IN ('pending', 'confirmed'));
