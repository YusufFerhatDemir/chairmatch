-- risk_level on services (LOW, HIGH, VERY_HIGH)
ALTER TABLE services ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';

-- documents: Location + Provider compliance docs
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

-- insurance_policies: ChairMatch Protect
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

-- authorities_packs: Behördenpaket (kostenlos erstellt)
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

-- submission_tickets: Paid Einreich-Service
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

-- consents: Kunde unterschreibt vor Buchung (HIGH/VERY_HIGH)
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

-- protect_pricing: Admin konfigurierbar (HIGH/VERY_HIGH Day/Month/Year)
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

-- compliance_plans: Einreich-Service Preise (99/299/39)
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
