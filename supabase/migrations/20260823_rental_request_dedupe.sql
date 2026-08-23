-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Doppel-Submit-Riegel fuer Mietanfragen (Stand 2026-08-23)
-- ──────────────────────────────────────────────────────────────────────
-- Problem: `rental_requests` war nur clientseitig gegen Doppel-Submits
-- geschuetzt (ein `submitting`-State im Formular). Doppelklick, Browser-
-- Reload der POST-Seite, ein Retry der Serverless-Funktion oder zwei
-- parallel abgeschickte Tabs erzeugten jeweils eine zweite echte Anfrage —
-- inklusive zweiter Mail an den Vermieter.
--
-- Warum eine eigene Claim-Tabelle und kein UNIQUE-Index auf rental_requests:
--
--   a) Ein UNIQUE ueber (requester_id, equipment_id, …) waere ein Riegel
--      FUER IMMER. Eine legitime zweite Anfrage nach zwei Wochen muss aber
--      durchkommen — der Schutz braucht ein Zeitfenster.
--   b) Ein Zeitfenster laesst sich nicht als Index-Praedikat ausdruecken:
--      `WHERE created_at > now() - interval '5 min'` ist nicht IMMUTABLE.
--   c) Die naheliegende Notloesung — Fingerprint + Zeit-Bucket
--      (floor(epoch/300)) in einem UNIQUE — hat ein Randproblem: zwei
--      Requests zwei Sekunden auseinander, aber links und rechts einer
--      Bucket-Grenze, landen in verschiedenen Buckets und kommen BEIDE
--      durch. Genau der Doppelklick, den wir abfangen wollen.
--
-- Diese Tabelle loest das mit einem Claim pro Fingerprint:
--   - `fingerprint` ist PRIMARY KEY  → der INSERT ist das atomare Tor.
--     Zwei parallele Requests: einer gewinnt, der andere bekommt 23505.
--   - `expires_at` traegt das gleitende Fenster. Ein abgelaufener Claim
--     wird per `UPDATE … WHERE expires_at < now()` uebernommen — auch das
--     atomar, weil Postgres die Zeile sperrt und das Praedikat nach dem
--     Warten erneut prueft.
--   - `request_id` verlinkt den Claim mit der tatsaechlich entstandenen
--     Anfrage. Damit kann ein Duplikat-Request die BESTEHENDE Anfrage
--     zurueckgeben, statt dem Nutzer einen Fehler zu zeigen.
--
-- Der Fingerprint wird in src/lib/rental-request-dedupe.ts gebildet
-- (SHA-256 ueber Nutzer + Mietobjekt + Termin + Dauer + Nachricht, oder
-- ueber einen mitgeschickten Idempotency-Key). Bewusst in der App und nicht
-- als GENERATED COLUMN: die Normalisierung der Freitext-Nachricht gehoert
-- zur Anwendungslogik und ist dort testbar.
--
-- Zugriff: ausschliesslich service_role. RLS ist an, es gibt bewusst KEINE
-- Policy fuer anon/authenticated — die Zeilen verraten sonst, wer wann was
-- angefragt hat.
--
-- ACHTUNG: muss im Supabase-SQL-Editor angewendet werden. Fehlt die Tabelle,
-- speichert die Route die Anfrage weiterhin (der Riegel ist ein Zusatz, kein
-- Nadeloehr), loggt aber eine Warnung — dann greift nur der Client-Schutz.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.rental_request_dedupe (
  -- SHA-256-Hex des Anfrage-Fingerprints. PRIMARY KEY = der eigentliche Riegel.
  fingerprint   text PRIMARY KEY,
  requester_id  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  equipment_id  uuid REFERENCES public.rental_equipment(id) ON DELETE CASCADE,
  -- NULL, solange der Erstversuch noch laeuft (oder gescheitert ist).
  request_id    uuid REFERENCES public.rental_requests(id) ON DELETE CASCADE,
  claimed_at    timestamptz NOT NULL DEFAULT now(),
  -- Ende des Schutzfensters. Danach ist derselbe Inhalt wieder erlaubt.
  expires_at    timestamptz NOT NULL
);

-- Fuer die Uebernahme abgelaufener Claims und das Aufraeumen.
CREATE INDEX IF NOT EXISTS idx_rental_request_dedupe_expires
  ON public.rental_request_dedupe(expires_at);

-- Fuer Support-Rueckfragen („warum wurde meine Anfrage abgewiesen?").
CREATE INDEX IF NOT EXISTS idx_rental_request_dedupe_requester
  ON public.rental_request_dedupe(requester_id, claimed_at DESC);

ALTER TABLE public.rental_request_dedupe ENABLE ROW LEVEL SECURITY;
-- Keine Policy => nur service_role kommt an die Zeilen.

-- ──────────────────────────────────────────────────────────────────────
-- Aufraeumen. Die Tabelle waechst mit einer Zeile pro eindeutigem
-- Anfrage-Inhalt; abgelaufene Claims haben keinen Wert mehr. Die Route
-- raeumt gelegentlich selbst auf (nur wenn sie ohnehin auf einen
-- abgelaufenen Claim trifft), fuer den Rest gibt es diese Funktion —
-- z. B. taeglich per pg_cron:
--   SELECT cron.schedule('purge-rental-claims', '17 3 * * *',
--     $$SELECT public.purge_expired_rental_request_claims()$$);
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_rental_request_claims(
  older_than interval DEFAULT interval '1 hour'
)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  WITH gone AS (
    DELETE FROM public.rental_request_dedupe
     WHERE expires_at < now() - older_than
    RETURNING 1
  )
  SELECT count(*)::integer FROM gone;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_rental_request_claims(interval) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_expired_rental_request_claims(interval) FROM anon;
REVOKE ALL ON FUNCTION public.purge_expired_rental_request_claims(interval) FROM authenticated;

COMMIT;
