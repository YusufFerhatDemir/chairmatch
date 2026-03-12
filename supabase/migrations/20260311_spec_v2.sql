-- ChairMatch Spec V2 — RBAC, Consent, Cookies, Availability
-- Rollen: CUSTOMER, PROVIDER, BUSINESS_OWNER, ADMIN, SUPER_ADMIN
-- Mapping: kunde→CUSTOMER, anbieter/provider→PROVIDER, b2b→BUSINESS_OWNER, admin→ADMIN, super_admin→SUPER_ADMIN

-- ═══════════════════════════════════════════════════════════════
-- 1. consent_logs — DSGVO Einwilligungen (AGB, Datenschutz, Marketing)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS consent_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('agb','datenschutz','marketing','agb_provider')),
  version text NOT NULL DEFAULT '1.0',
  ip_hash text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS consent_logs_user_idx ON consent_logs(user_id);
CREATE INDEX IF NOT EXISTS consent_logs_type_idx ON consent_logs(type);
ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consent_logs_insert_auth" ON consent_logs;
CREATE POLICY "consent_logs_insert_auth" ON consent_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "consent_logs_select_own" ON consent_logs;
CREATE POLICY "consent_logs_select_own" ON consent_logs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "consent_logs_admin" ON consent_logs;
CREATE POLICY "consent_logs_admin" ON consent_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
);

-- ═══════════════════════════════════════════════════════════════
-- 2. cookie_consents — TTDSG granulare Cookie-Einwilligung
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS cookie_consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  choices jsonb NOT NULL DEFAULT '{"necessary":true,"statistics":false,"marketing":false}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS cookie_consents_session_idx ON cookie_consents(session_id);
CREATE INDEX IF NOT EXISTS cookie_consents_timestamp_idx ON cookie_consents(timestamp);
ALTER TABLE cookie_consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cookie_consents_insert_anon" ON cookie_consents;
CREATE POLICY "cookie_consents_insert_anon" ON cookie_consents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "cookie_consents_admin" ON cookie_consents;
CREATE POLICY "cookie_consents_admin" ON cookie_consents FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
);

-- ═══════════════════════════════════════════════════════════════
-- 3. availability_blocks — Provider/Location Sperrzeiten (Urlaub etc.)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS availability_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type text NOT NULL CHECK (owner_type IN ('provider','location','resource')),
  owner_id uuid NOT NULL,
  start_dt timestamptz NOT NULL,
  end_dt timestamptz NOT NULL,
  recurring_rule text,
  is_blocked boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS availability_blocks_owner_idx ON availability_blocks(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS availability_blocks_dates_idx ON availability_blocks(start_dt, end_dt);
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "availability_blocks_all" ON availability_blocks;
CREATE POLICY "availability_blocks_all" ON availability_blocks FOR ALL USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 4. profiles.role — Erweitern für super_admin (falls nicht vorhanden)
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (
    role IN ('customer','kunde','provider','anbieter','b2b','admin','super_admin')
  );
EXCEPTION WHEN duplicate_object THEN NULL;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. bookings — booking_type (APPOINTMENT | RENTAL), resource_id
-- ═══════════════════════════════════════════════════════════════
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type text DEFAULT 'APPOINTMENT';
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS resource_id uuid;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS provider_id uuid;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. login_attempts — Brute-Force-Schutz (Rate-Limit)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ip text NOT NULL,
  email text,
  success boolean NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts(ip);
CREATE INDEX IF NOT EXISTS login_attempts_created_idx ON login_attempts(created_at);
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_service" ON login_attempts;
CREATE POLICY "login_attempts_service" ON login_attempts FOR ALL USING (true);
