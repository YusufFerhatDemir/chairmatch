-- ──────────────────────────────────────────────────────────────────────
-- SECURITY FIX — analytics_events ist fuer den oeffentlichen Anon-Key offen
-- ──────────────────────────────────────────────────────────────────────
-- STATUS: VORBEREITET, NOCH NICHT ANGEWENDET.
-- Anwenden im Supabase-SQL-Editor (Projekt pwdbjqfpgumyfktbfswg).
-- Aus dem Repo heraus nicht moeglich: der service_role-Key ist tot,
-- es gibt keinen DB-Zugang ausserhalb des Dashboards.
--
-- BEFUND (live verifiziert am 27.08.2026 mit dem oeffentlichen
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, read-only):
--
--   GET /rest/v1/analytics_events?select=*  → HTTP 200, 39 Zeilen
--
-- Ausgeliefert werden dabei: user_id (echte auth.users-UUID), session_id,
-- path, user_agent, country/region/city und props. Das ist die Verknuepfung
-- "welcher eingeloggte Mensch war auf welcher Seite, von wo, mit welchem
-- Geraet" — personenbezogene Daten im Sinne der DSGVO, lesbar fuer jeden,
-- der den Anon-Key aus dem Client-Bundle nimmt (wo er per Design steht).
--
-- URSACHE: 20260525_analytics_events.sql. Der Kommentar dort sagt
-- "SELECT: nur Admins (ueber Admin-API mit Service-Role)", die Policy
-- darunter sagt etwas anderes:
--
--   CREATE POLICY "analytics_events admin read" ON analytics_events
--     FOR SELECT USING (true);       -- ← gilt auch fuer anon
--   CREATE POLICY "analytics_events insert" ON analytics_events
--     FOR INSERT WITH CHECK (true);  -- ← anon darf Events faelschen
--
-- `USING (true)` schraenkt niemanden ein. Die Absicht im Kommentar war
-- richtig, die Policy hat sie nie umgesetzt.
--
-- Zusaetzlich haelt anon auf dieser Tabelle noch die Table-Grants fuer
-- UPDATE und DELETE (nachgewiesen: PostgREST antwortet mit 22P02
-- Typfehler statt mit 42501 permission denied). Ob damit auch Zeilen
-- getroffen werden, haengt an Policies, die es im Repo nicht gibt — jede
-- andere geschuetzte Tabelle antwortet dagegen mit 42501, weil dort schon
-- der Grant fehlt. Dieser Unterschied wird hier mitbereinigt.
--
-- WARUM DAS NICHTS KAPUTT MACHT (geprueft, nicht vermutet):
--   * Geschrieben wird ausschliesslich serverseitig:
--       src/app/api/analytics/events/route.ts  → getSupabaseAdmin()
--       src/app/api/analytics/vitals/route.ts  → getSupabaseAdmin()
--     service_role umgeht RLS und ist von Grants nicht betroffen.
--   * Gelesen wird die Tabelle im gesamten Anwendungscode NICHT
--     (`grep -rn analytics_events src/` — nur die beiden Insert-Routen).
--   * Der Browser-Client mit Anon-Key (src/lib/supabase.ts) fasst sie nie an.
--
-- Prinzip: deny by default. anon und authenticated bekommen nichts.
-- ──────────────────────────────────────────────────────────────────────

-- 1) Die beiden zu weiten Policies entfernen.
DROP POLICY IF EXISTS "analytics_events admin read" ON analytics_events;
DROP POLICY IF EXISTS "analytics_events insert" ON analytics_events;

-- 2) RLS bleibt an und hat danach KEINE Policy mehr — damit ist die
--    Tabelle fuer jede Rolle ausser service_role leer und unbeschreibbar.
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events FORCE ROW LEVEL SECURITY;

-- 3) Grants zurueckziehen, damit PostgREST schon vor RLS mit
--    "permission denied" antwortet — so verhaelt sich jede andere
--    geschuetzte Tabelle in diesem Projekt auch.
REVOKE ALL ON TABLE analytics_events FROM anon;
REVOKE ALL ON TABLE analytics_events FROM authenticated;
REVOKE ALL ON SEQUENCE analytics_events_id_seq FROM anon;
REVOKE ALL ON SEQUENCE analytics_events_id_seq FROM authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- Gegenprobe nach dem Anwenden (im Terminal, read-only):
--
--   ./scripts/rls-anon-probe.sh .env.local
--
-- analytics_events muss danach in der Spalte BEFUND
-- "blockiert: permission denied for table analytics_events" zeigen.
-- Danach darf die Zeile "Tabellen mit anon-lesbaren Daten" nur noch die
-- gewollt oeffentlichen Kataloge enthalten (categories, product_categories,
-- onboarding_slides, rental_equipment, services, app_settings).
-- ──────────────────────────────────────────────────────────────────────
