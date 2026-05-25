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
