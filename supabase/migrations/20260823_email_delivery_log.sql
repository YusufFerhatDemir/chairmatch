-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — E-Mail-Zustelllog (Stand 2026-08-23)
-- ──────────────────────────────────────────────────────────────────────
-- Warum eine eigene Tabelle und nicht `notification_log`:
--   `notification_log` (20260317) ist die IN-APP-Benachrichtigungsliste —
--   sie taucht im Postfach des Nutzers auf. Ein Zustellstatus fuer E-Mails
--   gehoert dort nicht hinein, sonst sieht der Vermieter jede Mail doppelt.
--   Der Live-Code schreibt In-App-Benachrichtigungen ohnehin nach
--   `notifications` (siehe src/lib/notifications.ts).
--
-- Zwei Aufgaben:
--   1. Zustellstatus protokollieren (sent / failed / skipped)
--   2. Idempotenz: der UNIQUE-Index auf (email_type, reference_id) sorgt
--      dafuer, dass ein Retry derselben Operation KEINE zweite Mail
--      ausloest — der zweite INSERT laeuft in einen Konflikt.
--
-- Zugriff: ausschliesslich service_role. RLS ist an, es gibt bewusst KEINE
-- Policy fuer anon/authenticated — Empfaengeradressen sind PII.
--
-- ACHTUNG: muss im Supabase-SQL-Editor angewendet werden. Fehlt die Tabelle,
-- verschickt der Code die Mail trotzdem (best effort), verliert aber den
-- Doppelversand-Schutz und loggt eine Warnung.
--
-- KORREKTUR 2026-08-23: Diese Datei beschrieb Spalten, die es in der
-- Produktionstabelle nicht gibt — `recipient_user_id`, und der Fehlertext
-- hiess hier `error`, live aber `error_message`. Weil `CREATE TABLE IF NOT
-- EXISTS` auf eine bereits bestehende Tabelle wirkungslos ist, blieb der
-- Unterschied unbemerkt: der Code schrieb nach dieser Datei, PostgREST
-- antwortete mit 42703, und `claimDelivery` wertete das als „Tabelle nicht
-- verfuegbar" — Zustelllog und Doppelversand-Schutz fielen still aus.
--
-- Die Definition unten entspricht jetzt dem, was live steht (per
-- Spaltenprobe verifiziert, siehe ./scripts/schema-probe.sh). Fuer eine
-- Datenbank, in der die Tabelle schon existiert, ist sie ein No-op — genau
-- deshalb steht die Wahrheit zusaetzlich in src/test/live-schema.ts, wo die
-- Tests sie durchsetzen.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logischer Mail-Typ, z. B. 'rental_request_created'
  email_type          text NOT NULL,
  -- Fachliche Referenz, z. B. rental_requests.id
  reference_id        text NOT NULL,
  recipient_email     text,
  -- Betreff der Mail — damit eine 'failed'-Zeile erkennen laesst, worum es ging.
  subject             text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  -- Heisst `error_message`, nicht `error`: `error` ist in Postgres zwar
  -- erlaubt, aber als Spaltenname unnoetig nah an reservierten Bezeichnern.
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Fuer Bestandsdatenbanken, die nach der urspruenglichen Fassung angelegt
-- wurden: fehlende Spalten nachziehen, damit alle Umgebungen gleich sind.
ALTER TABLE public.email_delivery_log ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.email_delivery_log ADD COLUMN IF NOT EXISTS error_message text;

-- Idempotenz-Anker: eine Mail pro (Typ, fachlicher Referenz).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_delivery_log_ref
  ON public.email_delivery_log(email_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status
  ON public.email_delivery_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient
  ON public.email_delivery_log(recipient_email, created_at DESC);

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;
-- Keine Policy => nur service_role kommt an die Zeilen.

COMMIT;
