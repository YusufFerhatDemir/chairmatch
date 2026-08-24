-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Newsletter-Schema reparieren (Stand 2026-08-24)
-- ──────────────────────────────────────────────────────────────────────
-- Befund der Spaltenprobe vom 2026-08-24 gegen `pwdbjqfpgumyfktbfswg`
-- (reproduzierbar mit ./scripts/schema-probe.sh):
--
--   newsletter_subscribers  existiert, ist aber die ALTE Fassung:
--                           id, email, source, user_id, subscribed_at,
--                           unsubscribed_at, is_active
--   newsletter_campaigns    existiert NICHT
--   newsletter_sends        existiert NICHT
--
-- Der Code ist gegen eine neuere Fassung geschrieben: er filtert auf
-- `status` (Text) statt `is_active` (Boolean) und liest/schreibt `name`,
-- `tags`, `unsubscribe_token`, `last_sent_at`, `is_confirmed`. Live gibt es
-- keine dieser Spalten. Folge in Produktion:
--
--   * POST /api/newsletter (oeffentliche Anmeldung) lief in 42703 und
--     antwortete dem Besucher mit 500 — kein Abonnent kam je in die DB.
--   * /unsubscribe fand ueber `unsubscribe_token` nie eine Zeile, jede
--     Abmeldung endete auf "Link ungueltig". Das ist ein DSGVO-Problem,
--     nicht nur ein Bug.
--   * Der komplette Admin-Newsletter (Liste, Import, Kampagnen, Versand,
--     Resend-Webhook) lief in 42703 bzw. PGRST205.
--   * /api/admin/kpi zaehlte Newsletter-Abos wegen `is_confirmed` still
--     als 0.
--
-- Diese Migration ist rein additiv und idempotent: keine Spalte wird
-- umbenannt oder entfernt, `is_active` bleibt als Quelle fuer das Backfill
-- erhalten. Auf einer Datenbank, die schon die neue Fassung hat, ist sie
-- ein No-op.
--
-- ACHTUNG: muss im Supabase-SQL-Editor angewendet werden (der
-- Service-Role-Key des Repos ist tot, siehe CLAUDE.md).
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. newsletter_subscribers — fehlende Spalten nachziehen
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS name              text;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS status            text;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS tags              text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS unsubscribe_token text;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS last_sent_at      timestamptz;
-- Doppel-Opt-In ist noch nicht gebaut (Single-Opt-In, Hinweis in der
-- Datenschutzerklaerung). Die Spalte existiert, damit /api/admin/kpi nicht
-- still 0 zaehlt; Default true entspricht dem heutigen Verhalten.
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS is_confirmed      boolean NOT NULL DEFAULT true;

-- Backfill `status` aus `is_active` — nur dort, wo noch nichts steht.
UPDATE public.newsletter_subscribers
   SET status = CASE WHEN COALESCE(is_active, true) THEN 'active' ELSE 'unsubscribed' END
 WHERE status IS NULL;

ALTER TABLE public.newsletter_subscribers ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE public.newsletter_subscribers ALTER COLUMN status SET NOT NULL;

-- `status` ist der Wertebereich, den der Code kennt (siehe patchSchema in
-- src/app/api/admin/newsletter/subscribers/route.ts). Ein Wert ausserhalb
-- soll am INSERT scheitern, nicht still durchlaufen.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'newsletter_subscribers_status_check'
       AND conrelid = 'public.newsletter_subscribers'::regclass
  ) THEN
    ALTER TABLE public.newsletter_subscribers
      ADD CONSTRAINT newsletter_subscribers_status_check
      CHECK (status IN ('active', 'unsubscribed', 'bounced'));
  END IF;
END $$;

-- Backfill der Abmelde-Token. Ohne Token ist der List-Unsubscribe-Header
-- wertlos und die Abmeldeseite kann die Zeile nicht finden.
UPDATE public.newsletter_subscribers
   SET unsubscribe_token = replace(gen_random_uuid()::text, '-', '')
 WHERE unsubscribe_token IS NULL;

ALTER TABLE public.newsletter_subscribers
  ALTER COLUMN unsubscribe_token SET DEFAULT replace(gen_random_uuid()::text, '-', '');
ALTER TABLE public.newsletter_subscribers ALTER COLUMN unsubscribe_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_token
  ON public.newsletter_subscribers(unsubscribe_token);

-- Die oeffentliche Anmeldung verlaesst sich auf einen Konflikt statt auf
-- ein vorheriges SELECT (Race zwischen zwei Anmeldungen derselben Adresse).
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_subscribers_email
  ON public.newsletter_subscribers(lower(email));

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
  ON public.newsletter_subscribers(status, subscribed_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_tags
  ON public.newsletter_subscribers USING gin(tags);

-- ══════════════════════════════════════════════════════════════════════
-- 2. newsletter_campaigns
-- ══════════════════════════════════════════════════════════════════════
-- Spalten exakt nach den Zugriffen in src/lib/newsletter-sender.ts,
-- src/app/api/admin/newsletter/campaigns/route.ts und
-- src/app/api/newsletter/webhook/route.ts.

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject          text NOT NULL,
  preview_text     text,
  html_content     text NOT NULL,
  -- { tags?: string[], source?: string, exclude_tags?: string[] }
  audience_filter  jsonb NOT NULL DEFAULT '{}'::jsonb,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  total_recipients integer NOT NULL DEFAULT 0,
  total_sent       integer NOT NULL DEFAULT 0,
  total_opened     integer NOT NULL DEFAULT 0,
  total_clicked    integer NOT NULL DEFAULT 0,
  total_bounced    integer NOT NULL DEFAULT 0,
  sent_at          timestamptz,
  created_by       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_created
  ON public.newsletter_campaigns(created_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- 3. newsletter_sends
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.newsletter_sends (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES public.newsletter_campaigns(id) ON DELETE CASCADE,
  subscriber_id   uuid NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'sent', 'delivered', 'opened',
                                      'clicked', 'bounced', 'complained')),
  -- Schluessel, ueber den der Resend-Webhook die Zeile wiederfindet.
  resend_email_id text,
  error_message   text,
  sent_at         timestamptz,
  opened_at       timestamptz,
  clicked_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Ein Empfaenger bekommt eine Kampagne genau einmal. Schuetzt gegen einen
-- zweiten Klick auf "Senden" waehrend der erste Lauf noch laeuft.
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_sends_campaign_subscriber
  ON public.newsletter_sends(campaign_id, subscriber_id);

-- Der Webhook sucht ausschliesslich hierueber (.eq('resend_email_id', …)).
-- Ohne Index waere jedes Webhook-Event ein Seq-Scan ueber alle Sends.
CREATE UNIQUE INDEX IF NOT EXISTS uq_newsletter_sends_resend_id
  ON public.newsletter_sends(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_newsletter_sends_campaign_status
  ON public.newsletter_sends(campaign_id, status);

-- ══════════════════════════════════════════════════════════════════════
-- 4. Row Level Security
-- ══════════════════════════════════════════════════════════════════════
-- Alle drei Tabellen werden ausschliesslich serverseitig ueber
-- getSupabaseAdmin() (service_role) angefasst — auch die oeffentliche
-- Anmeldung und die Abmeldeseite. Es gibt deshalb bewusst KEINE Policy fuer
-- anon/authenticated: Empfaengeradressen und Abmelde-Token sind PII, und ein
-- lesbares `unsubscribe_token` waere eine fremde Abmeldung per Link.

ALTER TABLE public.newsletter_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

COMMIT;
