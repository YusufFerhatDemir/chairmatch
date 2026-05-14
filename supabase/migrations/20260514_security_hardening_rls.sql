-- ──────────────────────────────────────────────────────────────────────
-- SECURITY HARDENING: RLS-Lücken vor Production-Launch schließen
-- ──────────────────────────────────────────────────────────────────────
-- Hintergrund: Audit fand `USING (true)` Policies auf sensitiven Tabellen.
-- Bei aktivem Anon-Key kann jeder authentifizierte User (oder via Browser
-- mit NEXT_PUBLIC_SUPABASE_ANON_KEY) ALLE Datensätze lesen.
--
-- Betroffene Tabellen mit PII / Compliance-Daten:
--   - documents (Gewerbeanmeldungen, Versicherungs-Nachweise, PII)
--   - insurance_policies (Versicherungsdaten + IBAN-Verweise)
--   - authorities_packs (Compliance-Pakete für Behörden)
--   - submission_tickets (Compliance-Submission-Tracking)
--   - consents (DSGVO-Consent-Logs)
--   - availability_blocks (Salon-Verfügbarkeiten — weniger sensitiv)
--   - audit_logs (alle User-Aktionen — DSGVO-Risiko bei Leak)
--   - visit_logs (Tracking-Daten — DSGVO-Risiko)
--   - login_attempts (Brute-Force-Tracking — User-IDs leakable)
--   - newsletter (E-Mail-Adressen)
--
-- Strategie: USING (true) ersetzen durch:
--   - SELECT: owner_id = auth.uid() ODER role IN ('admin','super_admin')
--   - INSERT/UPDATE/DELETE: nur eigene Daten oder Admin
-- ──────────────────────────────────────────────────────────────────────

-- Helper: prüft ob aktueller User Admin ist (super_admin oder admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

-- ──────────────────────────────────────────────────────────────────────
-- documents — Gewerbeanmeldungen, Versicherungs-PDFs
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_all" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_all" ON public.documents;
DROP POLICY IF EXISTS "documents_update_all" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_all" ON public.documents;

CREATE POLICY "documents_owner_select" ON public.documents
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "documents_owner_insert" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "documents_owner_update" ON public.documents
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "documents_admin_delete" ON public.documents
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- insurance_policies
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.insurance_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insurance_policies_select_all" ON public.insurance_policies;
DROP POLICY IF EXISTS "insurance_policies_insert_all" ON public.insurance_policies;
DROP POLICY IF EXISTS "insurance_policies_update_all" ON public.insurance_policies;

CREATE POLICY "insurance_owner_select" ON public.insurance_policies
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "insurance_owner_insert" ON public.insurance_policies
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "insurance_owner_update" ON public.insurance_policies
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin())
  WITH CHECK (owner_id = auth.uid() OR public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- authorities_packs (Compliance-Pakete)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.authorities_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authorities_packs_select_all" ON public.authorities_packs;
DROP POLICY IF EXISTS "authorities_packs_insert_all" ON public.authorities_packs;

CREATE POLICY "authorities_owner_select" ON public.authorities_packs
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "authorities_owner_insert" ON public.authorities_packs
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- submission_tickets
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.submission_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "submission_tickets_select_all" ON public.submission_tickets;
DROP POLICY IF EXISTS "submission_tickets_insert_all" ON public.submission_tickets;
DROP POLICY IF EXISTS "submission_tickets_update_all" ON public.submission_tickets;

CREATE POLICY "submissions_owner_select" ON public.submission_tickets
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR public.is_admin());

CREATE POLICY "submissions_owner_insert" ON public.submission_tickets
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "submissions_admin_update" ON public.submission_tickets
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- consents (DSGVO-Consent-Logs)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "consents_select_all" ON public.consents;
DROP POLICY IF EXISTS "consents_insert_all" ON public.consents;

CREATE POLICY "consents_user_select" ON public.consents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "consents_user_insert" ON public.consents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL); -- anon consent allowed

-- ──────────────────────────────────────────────────────────────────────
-- audit_logs — KRITISCH: User-Aktionen
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_all" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_all" ON public.audit_logs;

-- Audit-Logs sind nur für Admins lesbar (User sehen sie nur über DSGVO-Export)
CREATE POLICY "audit_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Inserts kommen über Service-Role (Backend) — kein User-Policy für Insert
-- nötig. Authenticated User können NICHT direkt audit_logs schreiben.

-- ──────────────────────────────────────────────────────────────────────
-- visit_logs (Analytics)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.visit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_logs_select_all" ON public.visit_logs;
DROP POLICY IF EXISTS "visit_logs_insert_all" ON public.visit_logs;

CREATE POLICY "visits_admin_select" ON public.visit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Inserts NUR via Service-Role (Backend-Analytics-API).

-- ──────────────────────────────────────────────────────────────────────
-- login_attempts (Brute-Force-Tracking)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "login_attempts_select_all" ON public.login_attempts;
DROP POLICY IF EXISTS "login_attempts_insert_all" ON public.login_attempts;

CREATE POLICY "login_attempts_admin_select" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────
-- availability_blocks (weniger sensitiv, aber sauberer separieren)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.availability_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "availability_blocks_select_all" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_blocks_insert_all" ON public.availability_blocks;
DROP POLICY IF EXISTS "availability_blocks_update_all" ON public.availability_blocks;

-- Public-Read für Verfügbarkeiten (für Such-Filter / Salon-Detail)
CREATE POLICY "availability_public_select" ON public.availability_blocks
  FOR SELECT TO anon, authenticated
  USING (true);

-- Insert/Update nur durch Salon-Besitzer
CREATE POLICY "availability_owner_insert" ON public.availability_blocks
  FOR INSERT TO authenticated
  WITH CHECK (
    salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY "availability_owner_update" ON public.availability_blocks
  FOR UPDATE TO authenticated
  USING (
    salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
    OR public.is_admin()
  );

-- ──────────────────────────────────────────────────────────────────────
-- newsletter (E-Mail-Adressen Schutz)
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.newsletter ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "newsletter_select_all" ON public.newsletter;
DROP POLICY IF EXISTS "newsletter_insert_all" ON public.newsletter;

-- Newsletter-Subs sind nur für Admins lesbar (Listen-Schutz vor Scraping)
CREATE POLICY "newsletter_admin_select" ON public.newsletter
  FOR SELECT TO authenticated
  USING (public.is_admin());

-- Insert/Unsubscribe via Public-API (mit Token-Check im Backend)
-- → kein USER-Policy nötig, Backend nutzt Service-Role

-- ──────────────────────────────────────────────────────────────────────
-- Verification: Liste aller Tabellen mit RLS-Status
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  total INT := 0;
  protected_count INT := 0;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, rowsecurity
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
  LOOP
    total := total + 1;
    IF r.rowsecurity THEN
      protected_count := protected_count + 1;
    ELSE
      RAISE NOTICE 'WARNING: Tabelle %.% hat KEIN RLS aktiv', r.schemaname, r.tablename;
    END IF;
  END LOOP;
  RAISE NOTICE 'RLS-Status: %/% public-Tabellen geschützt', protected_count, total;
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- FERTIG
-- Vor Deploy in Supabase Dashboard ausführen:
--   supabase db push   (oder manuell via SQL-Editor)
-- ──────────────────────────────────────────────────────────────────────
