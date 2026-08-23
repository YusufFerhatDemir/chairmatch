-- ──────────────────────────────────────────────────────────────────────
-- ROLLBACK zu 20260823_rental_request_dedupe.sql
-- ──────────────────────────────────────────────────────────────────────
-- Nimmt den serverseitigen Doppel-Submit-Riegel fuer Mietanfragen zurueck.
--
-- Folge: Mietanfragen sind danach nur noch clientseitig gegen Doppelklicks
-- geschuetzt. Die Route ueberlebt das (fehlende Tabelle => sie speichert
-- weiter und loggt eine Warnung), aber Doppel-Submits kommen wieder durch.
--
-- Kein Datenverlust an fachlichen Daten: `rental_request_dedupe` enthaelt
-- ausschliesslich Ablaufmarken, keine Anfrageinhalte. Die Anfragen selbst
-- liegen unveraendert in `rental_requests`.
--
-- Anwenden im Supabase-SQL-Editor.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

DROP FUNCTION IF EXISTS public.purge_expired_rental_request_claims(interval);
DROP TABLE IF EXISTS public.rental_request_dedupe;

COMMIT;
