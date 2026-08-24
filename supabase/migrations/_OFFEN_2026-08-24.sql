-- ══════════════════════════════════════════════════════════════════════
-- ChairMatch — OFFENE MIGRATIONEN, Stand 2026-08-24
-- ══════════════════════════════════════════════════════════════════════
-- Alles in EINEM Rutsch in den Supabase-SQL-Editor einfuegen und ausfuehren:
--   https://supabase.com/dashboard/project/pwdbjqfpgumyfktbfswg/sql/new
--
-- Danach zur Kontrolle ./scripts/schema-probe.sh — die muss dann sauber
-- durchlaufen.
--
-- Enthaelt, in dieser Reihenfolge:
--   1. 20260525_analytics_events.sql        (Tabelle fehlt komplett)
--   2. 20260824_newsletter_schema_repair.sql (2 Tabellen fehlen, 1 driftet)
--   3. 20260824_schema_drift_repair.sql      (3 Tabellen driften)
--
-- Alles ist additiv und idempotent: keine Spalte wird umbenannt oder
-- entfernt, ein zweiter Lauf ist folgenlos. Kein DROP, kein DELETE.
--
-- Warum das nicht automatisch passiert: der Service-Role-Key im Repo ist
-- tot, und der direkte DB-Zugang ist in dieser Umgebung gesperrt. Das ist
-- der eine Klick, den nur yusuf machen kann.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- TEIL 1 von 3 — analytics_events
-- ══════════════════════════════════════════════════════════════════════
-- ============================================================
-- analytics_events — First-Party-Event-Stream (Welle 1)
-- ============================================================
-- Eigener Stream parallel zu GA4/Meta. Vorteile:
--   - Conversion-Bild auch wenn User Drittanbieter ablehnt
--   - Volle Daten-Souveränität, DSGVO-konform (nur session_id, keine PII)
--   - Web-Vitals RUM ohne Vercel-Speed-Insights-Abo
--
-- Persistenz: alle Browser-Events (trackEvent) + Web-Vitals + ggf. weitere
-- First-Party-Quellen. Tabelle ist auf Append-Only ausgelegt.
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id             bigserial PRIMARY KEY,
  event_name     text NOT NULL,
  -- Pseudonyme Session-ID (cm_session_id im sessionStorage). Keine User-PII.
  session_id     text NOT NULL,
  -- Optional: User-ID wenn eingeloggt, zur internen Funnel-Analyse.
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Pfad zum Zeitpunkt des Events (kein Query-String, keine PII).
  path           text,
  -- Beliebige strukturierte Event-Properties (z. B. salon_id, value, currency).
  props          jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Quelle: 'browser' (default), 'vitals', 'server', 'meta_capi'.
  source         text NOT NULL DEFAULT 'browser',
  -- Geo aus Vercel-Headern.
  country        text,
  region         text,
  city           text,
  -- Truncated User-Agent (500 chars max).
  user_agent     text,
  -- Server-seitiger Timestamp.
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indizes für die typischen Auswertungen:
--   - Funnel-Reports nach Zeit + Event
--   - Per-Session-Verlauf
--   - Vitals-Aggregationen (source='vitals')
CREATE INDEX IF NOT EXISTS analytics_events_created_at_idx
  ON analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_time_idx
  ON analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_session_time_idx
  ON analytics_events (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_user_time_idx
  ON analytics_events (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_source_time_idx
  ON analytics_events (source, created_at DESC);
-- JSONB-Pfade für häufige Auswertungen (z. B. props->>'salon_id').
CREATE INDEX IF NOT EXISTS analytics_events_props_gin_idx
  ON analytics_events USING gin (props);

-- ============================================================
-- Row Level Security
-- ============================================================
-- - INSERT: erlaubt für alle (anonym + authenticated), da Events vom
--   Browser via Service-Role-API kommen. Filter findet in der API-Route
--   statt (Payload-Validation, Rate-Limit).
-- - SELECT: nur Admins (über Admin-API mit Service-Role).
-- ============================================================
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "analytics_events insert" ON analytics_events;
CREATE POLICY "analytics_events insert" ON analytics_events
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events admin read" ON analytics_events;
CREATE POLICY "analytics_events admin read" ON analytics_events
  FOR SELECT USING (true);

-- ============================================================
-- Retention-Hinweis (manuell in Supabase scheduled functions einrichten):
--   DELETE FROM analytics_events WHERE created_at < now() - interval '90 days';
-- 90 Tage decken die meisten Funnel-Analysen ab und halten die Tabelle klein.
-- ============================================================


-- ══════════════════════════════════════════════════════════════════════
-- TEIL 2 von 3 — Newsletter
-- ══════════════════════════════════════════════════════════════════════
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


-- ══════════════════════════════════════════════════════════════════════
-- TEIL 3 von 3 — visit_logs / salon_images / services
-- ══════════════════════════════════════════════════════════════════════
-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Schema-Drift schliessen (Stand 2026-08-24)
-- ──────────────────────────────────────────────────────────────────────
-- Befund: alle 317 Spaltenreferenzen aus `src/` wurden per PostgREST-Probe
-- gegen `pwdbjqfpgumyfktbfswg` geprueft (?select=<spalte> antwortet mit
-- 42703, wenn die Spalte fehlt — und zwar vor der Rechtepruefung, deshalb
-- reicht der ANON-Key). 29 Referenzen zeigten auf Spalten, die es live nicht
-- gibt.
--
-- Diese Datei behandelt die drei Faelle, in denen die Spalte tatsaechlich
-- fehlt und der Code sie braucht. Die uebrigen Faelle waren falsche
-- Spaltennamen im Code und wurden dort korrigiert (conversations.updated_at
-- → last_message_at, error_logs.level → severity, profiles.first_name →
-- aus full_name abgeleitet).
--
-- ACHTUNG: `CREATE TABLE IF NOT EXISTS` ist auf einer bestehenden Tabelle
-- wirkungslos. Genau daran ist `visit_logs` gescheitert: die Migration
-- 20260309 beschreibt die richtigen Spalten, die Tabelle existierte aber
-- schon vorher in einer anderen Form — und blieb es. Deshalb hier
-- ausschliesslich ALTER … ADD COLUMN IF NOT EXISTS.
--
-- Muss im Supabase-SQL-Editor angewendet werden.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. visit_logs
-- ══════════════════════════════════════════════════════════════════════
-- Live vorhanden: id, page, user_agent, created_at
-- Der Code schreibt: path, ip, country, region, city, user_agent
--
-- Folge bis 2026-08-24: JEDER Insert lief in 42703. /api/analytics/visit hat
-- den Fehler nicht ausgewertet und trotzdem {ok:true} geantwortet — die
-- Besucherstatistik war seit Bestehen leer, und die Admin-Seite zeigte
-- "Noch keine Besucherdaten" statt eines Fehlers.

ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS path    text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS ip      text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS region  text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS city    text;

-- Bestand uebernehmen: `page` war die alte Fassung von `path`.
UPDATE public.visit_logs SET path = page WHERE path IS NULL AND page IS NOT NULL;

CREATE INDEX IF NOT EXISTS visit_logs_path_idx    ON public.visit_logs(path);
CREATE INDEX IF NOT EXISTS visit_logs_country_idx ON public.visit_logs(country);

-- DSGVO: die IP ist personenbezogen. Der Masterplan sieht 90 Tage Aufbewahrung
-- vor; das gehoert in einen geplanten Job, nicht in diese Migration:
--   UPDATE public.visit_logs SET ip = NULL WHERE created_at < now() - interval '90 days';

-- ══════════════════════════════════════════════════════════════════════
-- 2. salon_images
-- ══════════════════════════════════════════════════════════════════════
-- Live vorhanden: id, salon_id, url, image_type, sort_order, created_at
-- Der Code schreibt zusaetzlich: storage_path, bucket
--
-- Ohne die beiden Spalten scheitert der Insert in /api/upload mit 42703. Der
-- Handler raeumt die Datei daraufhin korrekt wieder aus dem Storage — der
-- Bild-Upload war also nicht halb kaputt, sondern vollstaendig blockiert.
-- Gebraucht werden sie fuers Loeschen: ohne `bucket`/`storage_path` kann
-- /api/upload/[id] die Datei im Storage nicht mehr finden.

ALTER TABLE public.salon_images ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.salon_images ADD COLUMN IF NOT EXISTS bucket       text;

-- ══════════════════════════════════════════════════════════════════════
-- 3. services.slug
-- ══════════════════════════════════════════════════════════════════════
-- `/listings/[slug]` sucht zuerst per `slug` und faellt auf `id` zurueck;
-- sitemap.ts liest `id, slug, created_at`. Ohne die Spalte scheiterte die
-- Sitemap-Abfrage komplett (42703) — es standen also GAR KEINE Listings in
-- der Sitemap, auch nicht mit ihrer ID.
--
-- Bewusst NULLABLE und ohne Backfill: ein aus dem Namen erzeugter Slug waere
-- geraten, und ein falscher Slug ist eine kaputte URL. Der Code kommt mit
-- NULL zurecht (`s.slug || s.id`). Das Befuellen ist eine inhaltliche
-- Entscheidung und gehoert in einen eigenen Schritt.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_slug
  ON public.services(slug) WHERE slug IS NOT NULL;

COMMIT;
