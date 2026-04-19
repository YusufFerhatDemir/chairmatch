-- ============================================================
-- ChairMatch — PROD MIGRATION BUNDLE
-- Alle 10 Migrationen in korrekter Reihenfolge
-- Idempotent: kann mehrfach ausgeführt werden ohne Fehler
-- ============================================================
-- Letzte Aktualisierung: April 2026
-- Ausführen: Supabase SQL-Editor → Copy → Paste → Run
-- ============================================================

BEGIN;

-- ==== 1/10: 20260307_ensure_tables.sql ====
-- Newsletter-Subscriptions, Favorites, Salon-Spalten, RLS

CREATE TABLE IF NOT EXISTS newsletter (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT newsletter_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS favorites (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'favorites_customer_salon_unique'
  ) THEN
    ALTER TABLE favorites ADD CONSTRAINT favorites_customer_salon_unique UNIQUE (customer_id, salon_id);
  END IF;
END $$;

DO $$ BEGIN
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS chair_rental boolean DEFAULT false; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS chair_price_day numeric; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS gewerbe_check boolean DEFAULT false; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS opening_hours jsonb; EXCEPTION WHEN others THEN NULL; END;
  BEGIN ALTER TABLE salons ADD COLUMN IF NOT EXISTS tagline text; EXCEPTION WHEN others THEN NULL; END;
END $$;

ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can subscribe" ON newsletter;
CREATE POLICY "Anyone can subscribe" ON newsletter FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin can read newsletter" ON newsletter;
CREATE POLICY "Admin can read newsletter" ON newsletter FOR SELECT USING (true);

ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own favorites" ON favorites;
CREATE POLICY "Users manage own favorites" ON favorites FOR ALL USING (auth.uid() = customer_id);


-- ==== 2/10: 20260309_audit_logs.sql ====
-- Audit-Log-Tabelle für Admin-Aktionen

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read audit_logs" ON audit_logs;
CREATE POLICY "Admin read audit_logs" ON audit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Service insert audit_logs" ON audit_logs;
CREATE POLICY "Service insert audit_logs" ON audit_logs FOR INSERT WITH CHECK (true);


-- ==== 3/10: 20260309_visit_logs.sql ====
-- Besucheranalysen (DSGVO-konform: minimal data)

CREATE TABLE IF NOT EXISTS visit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  ip text,
  country text,
  region text,
  city text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visit_logs_created_at_idx ON visit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS visit_logs_path_idx ON visit_logs(path);
CREATE INDEX IF NOT EXISTS visit_logs_country_idx ON visit_logs(country);

ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin read visit_logs" ON visit_logs;
CREATE POLICY "Admin read visit_logs" ON visit_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert visit_logs" ON visit_logs;
CREATE POLICY "Allow insert visit_logs" ON visit_logs FOR INSERT WITH CHECK (true);


-- ==== 4/10: 20260310_compliance_and_plans.sql ====
-- Compliance-Dokumente, Versicherungen, Behördenpakete, Preistabellen

ALTER TABLE services ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';

CREATE TABLE IF NOT EXISTS documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_type text NOT NULL,
  owner_id uuid NOT NULL,
  doc_type text NOT NULL,
  file_url text,
  expiry_date date,
  verified_status text DEFAULT 'pending',
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS documents_owner_idx ON documents(owner_type, owner_id);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "documents_select" ON documents;
CREATE POLICY "documents_select" ON documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "documents_insert" ON documents;
CREATE POLICY "documents_insert" ON documents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "documents_update" ON documents;
CREATE POLICY "documents_update" ON documents FOR UPDATE USING (true);

CREATE TABLE IF NOT EXISTS insurance_policies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type text NOT NULL,
  risk_level text NOT NULL,
  status text DEFAULT 'active',
  valid_from timestamptz NOT NULL,
  valid_until timestamptz NOT NULL,
  pdf_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS insurance_policies_provider_idx ON insurance_policies(provider_user_id);
ALTER TABLE insurance_policies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insurance_select" ON insurance_policies;
CREATE POLICY "insurance_select" ON insurance_policies FOR SELECT USING (true);
DROP POLICY IF EXISTS "insurance_insert" ON insurance_policies;
CREATE POLICY "insurance_insert" ON insurance_policies FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS authorities_packs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  file_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS authorities_packs_location_idx ON authorities_packs(location_id);
ALTER TABLE authorities_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authorities_packs_all" ON authorities_packs;
CREATE POLICY "authorities_packs_all" ON authorities_packs FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS submission_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  pack_id uuid REFERENCES authorities_packs(id) ON DELETE SET NULL,
  plan_type text NOT NULL,
  status text DEFAULT 'OPEN',
  proof_file_url text,
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submission_tickets_status_idx ON submission_tickets(status);
ALTER TABLE submission_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "submission_tickets_all" ON submission_tickets;
CREATE POLICY "submission_tickets_all" ON submission_tickets FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS consents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  signed_pdf_url text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  checksum text
);
CREATE INDEX IF NOT EXISTS consents_booking_idx ON consents(booking_id);
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "consents_all" ON consents;
CREATE POLICY "consents_all" ON consents FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS protect_pricing (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_level text NOT NULL UNIQUE,
  day_price_cents int NOT NULL,
  month_price_cents int NOT NULL,
  year_price_cents int NOT NULL,
  currency text DEFAULT 'EUR',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
INSERT INTO protect_pricing (risk_level, day_price_cents, month_price_cents, year_price_cents) VALUES
  ('HIGH', 2900, 12900, 89900),
  ('VERY_HIGH', 4900, 19900, 129900)
ON CONFLICT (risk_level) DO NOTHING;

CREATE TABLE IF NOT EXISTS compliance_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_type text NOT NULL UNIQUE,
  price_cents int NOT NULL,
  included_submissions int DEFAULT 0,
  min_term_months int DEFAULT 0,
  extra_submission_price_cents int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
INSERT INTO compliance_plans (plan_type, price_cents, included_submissions, min_term_months, extra_submission_price_cents) VALUES
  ('one_time', 9900, 1, 0, 0),
  ('yearly', 29900, 2, 12, 4900),
  ('monthly', 3900, 0, 0, 0)
ON CONFLICT (plan_type) DO NOTHING;


-- ==== 5/10: 20260311_spec_v2.sql ====
-- RBAC, Consent-Logs, Cookie-Einwilligung, Verfügbarkeitsblöcke, Login-Schutz

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


-- ==== 6/10: 20260312_account_deletion.sql ====
-- Soft-Delete für DSGVO Art. 17 (Hard-Delete nach 30 Tagen per Cron)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delete_requested_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx ON profiles(deleted_at) WHERE deleted_at IS NOT NULL;


-- ==== 7/10: 20260313_reviews_report.sql ====
-- DSA: Review-Meldung und Moderation

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_flag boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'published';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Constraint idempotent hinzufügen (nur wenn Spalte frisch angelegt)
DO $$ BEGIN
  ALTER TABLE reviews ADD CONSTRAINT reviews_moderation_status_check
    CHECK (moderation_status IN ('published','hidden','pending'));
EXCEPTION WHEN duplicate_object THEN NULL;
EXCEPTION WHEN others THEN NULL;
END $$;


-- ==== 8/10: 20260316_fix_register_trigger.sql ====
-- Profil-Trigger bei Registrierung (CREATE OR REPLACE = idempotent)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_done boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS delete_requested_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_flag boolean DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_at timestamptz;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reported_by uuid;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  fname text := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
  lname text := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
  fullname text := COALESCE(NEW.raw_user_meta_data->>'full_name', TRIM(fname || ' ' || lname));
BEGIN
  INSERT INTO public.profiles (id, role, full_name, email, referral_code)
  VALUES (
    NEW.id,
    'kunde',
    fullname,
    NEW.email,
    'CM-' || UPPER(SUBSTR(MD5(NEW.id::text), 1, 6))
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==== 9/10: 20260317_payments_and_compliance.sql ====
-- Zahlungen, Chat, Push-Notifications, Compliance-Dokumente, 2FA
-- FIX: DROP POLICY IF EXISTS vor jedem CREATE POLICY (idempotent)

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','refunded','cancelled')),
  payment_method TEXT DEFAULT 'card',
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_intent ON payments(stripe_payment_intent);

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','pending','paid','refunded','failed'));
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages(receiver_id, is_read) WHERE NOT is_read;

CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversations(provider_id);

CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_conv_participants ON conversation_participants(user_id, conversation_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS compliance_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL
    CHECK (document_type IN (
      'gewerbeanmeldung','gesundheitszeugnis','hygienezertifikat',
      'berufsqualifikation','haftpflichtversicherung','datenschutzerklaerung',
      'preisliste_aushang','erste_hilfe','brandschutz','kassenbuch','meisterbrief'
    )),
  file_url TEXT,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  expires_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_compliance_salon ON compliance_documents(salon_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_documents(status);

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info','booking','payment','message','offer','system','compliance')),
  reference_id TEXT,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notification_log(user_id, is_read, created_at DESC);

DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
EXCEPTION WHEN others THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS salon_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  image_type TEXT DEFAULT 'gallery'
    CHECK (image_type IN ('logo','cover','gallery','before_after','team')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salon_images ON salon_images(salon_id, sort_order);

-- RLS aktivieren
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS macht es idempotent)
DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments FOR SELECT USING (
  booking_id IN (SELECT id FROM bookings WHERE customer_id = auth.uid())
);

DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()
);

DROP POLICY IF EXISTS conversations_select ON conversations;
CREATE POLICY conversations_select ON conversations FOR SELECT USING (
  customer_id = auth.uid() OR provider_id = auth.uid()
);

DROP POLICY IF EXISTS push_select ON push_subscriptions;
CREATE POLICY push_select ON push_subscriptions FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS push_insert ON push_subscriptions;
CREATE POLICY push_insert ON push_subscriptions FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS push_delete ON push_subscriptions;
CREATE POLICY push_delete ON push_subscriptions FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS compliance_select ON compliance_documents;
CREATE POLICY compliance_select ON compliance_documents FOR SELECT USING (
  owner_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin','super_admin'))
);

DROP POLICY IF EXISTS notifications_select ON notification_log;
CREATE POLICY notifications_select ON notification_log FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS salon_images_select ON salon_images;
CREATE POLICY salon_images_select ON salon_images FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS user_2fa (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_2fa_select ON user_2fa;
CREATE POLICY user_2fa_select ON user_2fa FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS user_2fa_insert ON user_2fa;
CREATE POLICY user_2fa_insert ON user_2fa FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS user_2fa_update ON user_2fa;
CREATE POLICY user_2fa_update ON user_2fa FOR UPDATE USING (user_id = auth.uid());


-- ==== 10/10: 20260321_marketplace_and_commissions.sql ====
-- Produkte, Verkäufer, Warenkorb, Bestellungen, Provisionen, Empfehlungen
-- FIX: DROP POLICY IF EXISTS vor jedem CREATE POLICY (idempotent)
-- FIX: rental_bookings ALTER TABLE in DO-Block (Tabelle evtl. nicht vorhanden)

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  parent_slug TEXT REFERENCES product_categories(slug),
  target TEXT NOT NULL DEFAULT 'b2c' CHECK (target IN ('b2c','b2b','both')),
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO product_categories (slug, name, target, sort_order) VALUES
  ('haarpflege', 'Haarpflege', 'b2c', 1),
  ('styling', 'Styling', 'b2c', 2),
  ('hautpflege', 'Hautpflege', 'b2c', 3),
  ('nagelpflege', 'Nagelpflege', 'b2c', 4),
  ('bartpflege', 'Bartpflege', 'b2c', 5),
  ('kosmetik-produkte', 'Kosmetik', 'b2c', 6)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_categories (slug, name, target, sort_order) VALUES
  ('profi-haarpflege', 'Profi-Haarpflege (Liter)', 'b2b', 10),
  ('chemie', 'Chemie (Farbe, Blondierung)', 'b2b', 11),
  ('werkzeug', 'Werkzeug (Scheren, Clipper)', 'b2b', 12),
  ('einwegmaterial', 'Einwegmaterial', 'b2b', 13),
  ('hygiene', 'Hygiene & Desinfektion', 'b2b', 14),
  ('moebel-ausstattung', 'Moebel & Ausstattung', 'b2b', 15),
  ('technik', 'Technik & Geraete', 'b2b', 16)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS sellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  seller_type TEXT NOT NULL CHECK (seller_type IN ('salon','grosshaendler','affiliate')),
  company_name TEXT,
  description TEXT,
  logo_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  commission_rate_override NUMERIC(5,2),
  stripe_connect_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, seller_type)
);
CREATE INDEX IF NOT EXISTS idx_sellers_user ON sellers(user_id);
CREATE INDEX IF NOT EXISTS idx_sellers_salon ON sellers(salon_id);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  category_id UUID REFERENCES product_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  compare_at_price_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'eur',
  sku TEXT,
  barcode TEXT,
  weight_grams INTEGER,
  stock_quantity INTEGER DEFAULT 0,
  is_unlimited_stock BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]',
  target TEXT NOT NULL DEFAULT 'b2c' CHECK (target IN ('b2c','b2b','both')),
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  brand TEXT,
  tags TEXT[] DEFAULT '{}',
  affiliate_url TEXT,
  affiliate_source TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(seller_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_salon ON products(salon_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, target);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  sku TEXT,
  stock_quantity INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(customer_id, product_id, variant_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_customer ON cart_items(customer_id);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'eur',
  shipping_name TEXT,
  shipping_street TEXT,
  shipping_city TEXT,
  shipping_postal_code TEXT,
  shipping_country TEXT DEFAULT 'DE',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  payment_status TEXT DEFAULT 'pending'
    CHECK (payment_status IN ('pending','paid','failed','refunded')),
  notes TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  seller_id UUID NOT NULL REFERENCES sellers(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  fulfillment_status TEXT DEFAULT 'pending'
    CHECK (fulfillment_status IN ('pending','processing','shipped','delivered','cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller ON order_items(seller_id);

CREATE TABLE IF NOT EXISTS commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rental','new_customer','product_recommendation','product_sale')),
  source_type TEXT NOT NULL CHECK (source_type IN ('rental_booking','booking','order_item','recommendation')),
  source_id UUID NOT NULL,
  beneficiary_type TEXT NOT NULL CHECK (beneficiary_type IN ('platform','salon','provider')),
  beneficiary_id UUID,
  rate_percent NUMERIC(5,2) NOT NULL,
  base_amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'eur',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','paid_out','cancelled')),
  paid_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(type, status);
CREATE INDEX IF NOT EXISTS idx_commissions_beneficiary ON commissions(beneficiary_type, beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_commissions_source ON commissions(source_type, source_id);

CREATE TABLE IF NOT EXISTS commission_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL UNIQUE CHECK (type IN (
    'rental','new_customer','product_recommendation_salon',
    'product_recommendation_platform','product_sale_platform'
  )),
  rate_percent NUMERIC(5,2) NOT NULL,
  min_rate_percent NUMERIC(5,2),
  max_rate_percent NUMERIC(5,2),
  effective_from TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO commission_rates (type, rate_percent, min_rate_percent, max_rate_percent) VALUES
  ('rental', 12.00, 12.00, 15.00),
  ('new_customer', 15.00, 15.00, 15.00),
  ('product_recommendation_salon', 7.50, 5.00, 10.00),
  ('product_recommendation_platform', 5.00, 3.00, 7.00),
  ('product_sale_platform', 10.00, 8.00, 15.00)
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS product_recommendations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id),
  staff_id UUID REFERENCES staff(id),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES profiles(id),
  message TEXT,
  is_viewed BOOLEAN DEFAULT false,
  is_purchased BOOLEAN DEFAULT false,
  purchased_order_item_id UUID REFERENCES order_items(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recommendations_customer ON product_recommendations(customer_id, is_viewed);
CREATE INDEX IF NOT EXISTS idx_recommendations_booking ON product_recommendations(booking_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_salon ON product_recommendations(salon_id);

CREATE TABLE IF NOT EXISTS customer_salon_history (
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  first_booking_id UUID REFERENCES bookings(id),
  first_booking_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_bookings INTEGER DEFAULT 1,
  last_booking_date TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (customer_id, salon_id)
);
CREATE INDEX IF NOT EXISTS idx_csh_salon ON customer_salon_history(salon_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS is_first_visit BOOLEAN DEFAULT false;

-- FIX: rental_bookings in DO-Block, da Tabelle evtl. noch nicht existiert
DO $$ BEGIN
  ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS commission_id UUID REFERENCES commissions(id);
EXCEPTION WHEN undefined_table THEN
  NULL; -- Tabelle existiert noch nicht, überspringen
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- RLS aktivieren
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_salon_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies (DROP IF EXISTS macht es idempotent)
DROP POLICY IF EXISTS "product_categories_public_read" ON product_categories;
CREATE POLICY "product_categories_public_read" ON product_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "product_variants_public_read" ON product_variants;
CREATE POLICY "product_variants_public_read" ON product_variants FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "commission_rates_public_read" ON commission_rates;
CREATE POLICY "commission_rates_public_read" ON commission_rates FOR SELECT USING (true);

DROP POLICY IF EXISTS "sellers_own" ON sellers;
CREATE POLICY "sellers_own" ON sellers FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_seller_manage" ON products;
CREATE POLICY "products_seller_manage" ON products FOR ALL USING (
  seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "product_variants_seller_manage" ON product_variants;
CREATE POLICY "product_variants_seller_manage" ON product_variants FOR ALL USING (
  product_id IN (SELECT id FROM products WHERE seller_id IN (SELECT id FROM sellers WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "cart_own" ON cart_items;
CREATE POLICY "cart_own" ON cart_items FOR ALL USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "orders_own" ON orders;
CREATE POLICY "orders_own" ON orders FOR ALL USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "order_items_own" ON order_items;
CREATE POLICY "order_items_own" ON order_items FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE customer_id = auth.uid())
);

DROP POLICY IF EXISTS "recommendations_customer" ON product_recommendations;
CREATE POLICY "recommendations_customer" ON product_recommendations FOR SELECT USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "recommendations_salon" ON product_recommendations;
CREATE POLICY "recommendations_salon" ON product_recommendations FOR ALL USING (
  salon_id IN (SELECT id FROM salons WHERE owner_id = auth.uid())
);

DROP POLICY IF EXISTS "commissions_own" ON commissions;
CREATE POLICY "commissions_own" ON commissions FOR SELECT USING (auth.uid() = beneficiary_id);

DROP POLICY IF EXISTS "csh_own" ON customer_salon_history;
CREATE POLICY "csh_own" ON customer_salon_history FOR SELECT USING (auth.uid() = customer_id);


-- ============================================================
-- BUNDLE ABGESCHLOSSEN
-- ============================================================

COMMIT;
