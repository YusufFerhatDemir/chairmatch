-- ──────────────────────────────────────────────────────────────────────
-- RLS SECURITY FIX — Lücken schließen (Stand 2026-08-19)
-- ──────────────────────────────────────────────────────────────────────
-- STATUS: VORBEREITET, NOCH NICHT ANGEWENDET.
-- Diese Migration wurde aus einer rein statischen Analyse des Repos
-- abgeleitet (supabase/migrations/*.sql + src/**). Der Live-Stand der
-- Datenbank pwdbjqfpgumyfktbfswg konnte NICHT geprüft werden, weil alle
-- im Repo hinterlegten Credentials abgelaufen sind (siehe
-- CHAIRMATCH_SECURITY_FIX_REPORT.md).
--
-- VOR DEM ANWENDEN: Abschnitt "Preflight" unten ausführen und Ergebnis
-- gegen die Annahmen prüfen.
--
-- Betroffene Tabellen (im Repo definiert, aber OHNE `ENABLE ROW LEVEL
-- SECURITY` und OHNE jede Policy):
--   1. protect_pricing            — Preis-Konfiguration ChairMatch Protect
--   2. compliance_plans           — Preis-Konfiguration Einreich-Service
--   3. conversation_participants  — Chat-Teilnehmer (Social Graph, PII)
--
-- Risiko im Ist-Zustand: ohne RLS erlaubt PostgREST mit dem öffentlichen
-- NEXT_PUBLIC_SUPABASE_ANON_KEY vollen SELECT/INSERT/UPDATE/DELETE auf
-- diese Tabellen. Bei den Preistabellen ist das ein Integritätsrisiko
-- (Preise manipulierbar), bei conversation_participants ein
-- DSGVO-Risiko (wer chattet mit wem) plus Schreibzugriff.
--
-- Warum das nichts kaputt macht (verifiziert, keine Vermutung):
--   * protect_pricing + compliance_plans werden ausschließlich in
--     src/app/(admin)/admin/pricing/page.tsx gelesen — über
--     getSupabaseAdmin() (service_role). service_role umgeht RLS.
--   * conversation_participants wird ausschließlich in
--     src/app/api/messages/route.ts und
--     src/app/api/messages/[conversationId]/route.ts genutzt — ebenfalls
--     durchgängig über getSupabaseAdmin() (service_role).
--   * Der Browser-Client mit Anon-Key (src/lib/supabase.ts) greift nur
--     auf salons, rental_equipment und rental_bookings zu — keine der
--     drei Tabellen hier.
--
-- Prinzip: Least Privilege / deny by default. Für anon + authenticated
-- wird nichts erlaubt, was die App nicht nachweislich braucht.
--
-- Bewusst NICHT verwendet: FORCE ROW LEVEL SECURITY. Das würde RLS auch
-- auf den Tabellen-Owner anwenden. Wer die Tabellen besitzt (postgres vs.
-- prisma_app aus DATABASE_URL) ist ohne DB-Zugriff nicht verifizierbar —
-- ein FORCE könnte den direkten SQL-Pfad brechen. Plain ENABLE reicht für
-- die Supabase-Warnung und ist die konservative Variante.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. protect_pricing — reine Preis-Konfiguration
--    Kein Lesezugriff für anon/authenticated nötig (nur Admin-Seite via
--    service_role). RLS an, KEINE Policy => deny by default.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.protect_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "protect_pricing_public_read" ON public.protect_pricing;
DROP POLICY IF EXISTS "protect_pricing_all" ON public.protect_pricing;

-- ──────────────────────────────────────────────────────────────────────
-- 2. compliance_plans — reine Preis-Konfiguration, identisch behandelt
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.compliance_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_plans_public_read" ON public.compliance_plans;
DROP POLICY IF EXISTS "compliance_plans_all" ON public.compliance_plans;

-- ──────────────────────────────────────────────────────────────────────
-- 3. conversation_participants — Chat-Mitgliedschaft
--    SELECT: nur die eigenen Zeilen (ein User darf sehen, in welchen
--            Conversations er selbst steckt).
--    INSERT/UPDATE/DELETE: keine Policy => nur service_role (Backend).
--            Verhindert, dass sich ein User selbst in fremde
--            Conversations einträgt oder andere entfernt.
--    Kein Self-Join in der Policy => keine RLS-Rekursion.
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.conversation_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conv_participants_all" ON public.conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_all" ON public.conversation_participants;
DROP POLICY IF EXISTS "conv_participants_own_select" ON public.conversation_participants;

CREATE POLICY "conv_participants_own_select" ON public.conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

COMMIT;

-- ──────────────────────────────────────────────────────────────────────
-- Preflight / Verifikation — als eigenständige Query ausführen.
-- Listet ALLE public-Tabellen ohne RLS und alle mit RLS aber ohne Policy.
-- Das ist die Liste, die gegen die Supabase-Dashboard-Warnung abgeglichen
-- werden muss. Erwartung nach dieser Migration: die drei oben genannten
-- Tabellen tauchen NICHT mehr in "rls_disabled" auf.
-- ──────────────────────────────────────────────────────────────────────
-- SELECT t.tablename,
--        t.rowsecurity                                   AS rls_enabled,
--        COALESCE(p.cnt, 0)                              AS policy_count,
--        CASE
--          WHEN NOT t.rowsecurity           THEN 'RLS_DISABLED'
--          WHEN COALESCE(p.cnt, 0) = 0      THEN 'RLS_ON_NO_POLICY (deny-all)'
--          ELSE 'OK'
--        END                                             AS status
-- FROM pg_tables t
-- LEFT JOIN (
--   SELECT tablename, COUNT(*) AS cnt
--   FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
-- ) p ON p.tablename = t.tablename
-- WHERE t.schemaname = 'public'
-- ORDER BY t.rowsecurity, t.tablename;
