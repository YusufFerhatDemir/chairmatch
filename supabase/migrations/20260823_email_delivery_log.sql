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
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

CREATE TABLE IF NOT EXISTS public.email_delivery_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Logischer Mail-Typ, z. B. 'rental_request_created'
  email_type          text NOT NULL,
  -- Fachliche Referenz, z. B. rental_requests.id
  reference_id        text NOT NULL,
  recipient_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email     text,
  status              text NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Idempotenz-Anker: eine Mail pro (Typ, fachlicher Referenz).
CREATE UNIQUE INDEX IF NOT EXISTS uq_email_delivery_log_ref
  ON public.email_delivery_log(email_type, reference_id);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_status
  ON public.email_delivery_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_delivery_log_recipient
  ON public.email_delivery_log(recipient_user_id, created_at DESC);

ALTER TABLE public.email_delivery_log ENABLE ROW LEVEL SECURITY;
-- Keine Policy => nur service_role kommt an die Zeilen.

COMMIT;
