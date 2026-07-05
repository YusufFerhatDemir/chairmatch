-- ═══════════════════════════════════════════════════════════
-- ChairMatch — Service & Equipment Template Seed Data
-- Kaynak: index.html SVC_CATALOG + EQUIP_CATALOG
-- ═══════════════════════════════════════════════════════════

-- ─── Tabloları oluştur (yoksa) ───

CREATE TABLE IF NOT EXISTS service_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS equipment_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  default_price_per_day NUMERIC(10,2) NOT NULL DEFAULT 0,
  icon TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Loyalty & Referral Tabloları (yoksa)

CREATE TABLE IF NOT EXISTS loyalty_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stamps_required INTEGER NOT NULL DEFAULT 10,
  reward_description TEXT NOT NULL DEFAULT '1 Gratis-Service',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS loyalty_stamps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id UUID REFERENCES salons(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  stamp_count INTEGER NOT NULL DEFAULT 1,
  redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_cents INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT NOT NULL DEFAULT 'Lade Freunde ein und erhalte 5€ pro Empfehlung',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_cents INTEGER NOT NULL DEFAULT 500,
  paid_out BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL DEFAULT 'website',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- ─── Mevcut veriyi temizle (idempotent) ───

DELETE FROM service_templates;
DELETE FROM equipment_templates;

-- ═══════════════════════════════════════════════════════════
-- SERVICE TEMPLATES — SVC_CATALOG
-- ═══════════════════════════════════════════════════════════

-- ── BARBER (11 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('barber', 'Herrenschnitt', 30, 28, 1),
('barber', 'Trockenschnitt', 25, 22, 2),
('barber', 'Skin Fade', 40, 35, 3),
('barber', 'Beard Trim', 20, 15, 4),
('barber', 'Bart Design', 30, 25, 5),
('barber', 'Hot Towel Shave', 30, 28, 6),
('barber', 'Full Service (Cut + Bart)', 60, 50, 7),
('barber', 'Kinderschnitt', 20, 18, 8),
('barber', 'Kopfmassage', 15, 12, 9),
('barber', 'Augenbrauen', 10, 8, 10),
('barber', 'Nasenhaare Waxing', 5, 5, 11);

-- ── FRISEUR (10 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('friseur', 'Damenschnitt', 45, 45, 1),
('friseur', 'Herrenschnitt', 30, 32, 2),
('friseur', 'Waschen & Föhnen', 30, 25, 3),
('friseur', 'Balayage / Highlights', 120, 120, 4),
('friseur', 'Komplett-Coloration', 90, 85, 5),
('friseur', 'Strähnchen', 90, 95, 6),
('friseur', 'Haarverlängerung', 180, 250, 7),
('friseur', 'Brautfrisur', 90, 120, 8),
('friseur', 'Kinderschnitt', 20, 18, 9),
('friseur', 'Kopfhaut-Treatment', 30, 35, 10);

-- ── KOSMETIK (10 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('kosmetik', 'Klassisches Facial', 60, 75, 1),
('kosmetik', 'Anti-Aging Behandlung', 75, 120, 2),
('kosmetik', 'Chemical Peeling', 45, 65, 3),
('kosmetik', 'Microdermabrasion', 45, 80, 4),
('kosmetik', 'Hautreinigung', 60, 55, 5),
('kosmetik', 'Augenbrauen Waxing', 15, 12, 6),
('kosmetik', 'Wimpern Lifting', 60, 55, 7),
('kosmetik', 'Rückenbehandlung', 50, 70, 8),
('kosmetik', 'Fruchtsäurepeeling', 40, 60, 9),
('kosmetik', 'Ultraschall-Behandlung', 45, 85, 10);

-- ── ÄSTHETIK (8 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('aesthetik', 'Botox', 30, 280, 1),
('aesthetik', 'Hyaluron Filler', 45, 380, 2),
('aesthetik', 'Lippen Unterspritzung', 30, 350, 3),
('aesthetik', 'Profhilo', 45, 420, 4),
('aesthetik', 'Mesotherapie', 45, 200, 5),
('aesthetik', 'PRP Behandlung', 60, 350, 6),
('aesthetik', 'Faltenunterspritzung', 30, 300, 7),
('aesthetik', 'Haartransplantation Beratung', 60, 0, 8);

-- ── NAGELSTUDIO (8 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('nail', 'Gel Maniküre', 60, 45, 1),
('nail', 'Shellac', 45, 35, 2),
('nail', 'Nail Art Design', 90, 75, 3),
('nail', 'Acryl Verlängerung', 90, 65, 4),
('nail', 'French Nails', 60, 50, 5),
('nail', 'Pediküre', 50, 40, 6),
('nail', 'Chrome Nails', 75, 60, 7),
('nail', 'Nail Repair', 30, 20, 8);

-- ── MASSAGE (9 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('massage', 'Klassische Massage', 60, 65, 1),
('massage', 'Tiefengewebsmassage', 60, 80, 2),
('massage', 'Hot Stone Massage', 90, 100, 3),
('massage', 'Thai Massage', 60, 70, 4),
('massage', 'Sportmassage', 45, 60, 5),
('massage', 'Lymphdrainage', 60, 75, 6),
('massage', 'Fußreflexzonen', 30, 40, 7),
('massage', 'Aromatherapie', 75, 85, 8),
('massage', 'Shiatsu', 60, 75, 9);

-- ── LASH & BROWS (7 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('lash', 'Classic Lash Extensions', 90, 85, 1),
('lash', 'Volume Lash Extensions', 120, 120, 2),
('lash', 'Lash Lifting & Tinting', 60, 55, 3),
('lash', 'Wimpern Auffüllen', 60, 50, 4),
('lash', 'Brow Lamination', 45, 45, 5),
('lash', 'Brow Shaping', 30, 25, 6),
('lash', 'Lash Removal', 30, 25, 7);

-- ── ARZT / KLINIK (7 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('arzt', 'Hautkrebs-Screening', 30, 95, 1),
('arzt', 'Laser Haarentfernung', 45, 150, 2),
('arzt', 'Akne Behandlung', 40, 120, 3),
('arzt', 'Derma-Beratung', 30, 80, 4),
('arzt', 'Narbenbehandlung', 60, 200, 5),
('arzt', 'Pigmentflecken Laser', 45, 180, 6),
('arzt', 'Haartransplantation', 180, 2500, 7);

-- ── OP-RAUM (3 services) ──
INSERT INTO service_templates (category, name, duration_minutes, default_price, sort_order) VALUES
('opraum', 'OP-Raum Tagesmiete', 480, 450, 1),
('opraum', 'OP-Raum Halbtag', 240, 280, 2),
('opraum', 'Sterilisation & Aufbereitung', 60, 80, 3);


-- ═══════════════════════════════════════════════════════════
-- EQUIPMENT TEMPLATES — EQUIP_CATALOG
-- ═══════════════════════════════════════════════════════════

-- ── BARBER (6 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('barber', 'Profi-Trimmer Set', 5, '✂️', 1),
('barber', 'Rasiermesser-Set', 3, '🪒', 2),
('barber', 'Hot-Towel Dampfgerät', 8, '♨️', 3),
('barber', 'Barber-Werkzeugkoffer', 10, '🧰', 4),
('barber', 'Haarwaschbecken', 0, '🚿', 5),
('barber', 'Sterilisator (UV)', 5, '🔬', 6);

-- ── FRISEUR (6 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('friseur', 'Föhn & Rundbürsten-Set', 5, '💨', 1),
('friseur', 'Glätteisen / Lockenstab', 5, '🔥', 2),
('friseur', 'Färbe-Arbeitsplatz', 8, '🎨', 3),
('friseur', 'Haarwaschbecken', 0, '🚿', 4),
('friseur', 'Trockenhaube', 5, '💇', 5),
('friseur', 'Sterilisator (UV)', 3, '🔬', 6);

-- ── KOSMETIK (8 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('kosmetik', 'Laser-Haarentfernung', 25, '⚡', 1),
('kosmetik', 'Microneedling-Gerät', 15, '💉', 2),
('kosmetik', 'Microblading-Set', 12, '✏️', 3),
('kosmetik', 'Ultraschall-Gerät', 10, '📡', 4),
('kosmetik', 'Hochfrequenz-Gerät', 10, '🔌', 5),
('kosmetik', 'Dampfgerät (Vapozon)', 5, '♨️', 6),
('kosmetik', 'LED-Lichttherapie', 8, '💡', 7),
('kosmetik', 'Derma-Roller Set', 5, '🔄', 8);

-- ── ÄSTHETIK (6 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('aesthetik', 'Botox-Injektionsset', 0, '💉', 1),
('aesthetik', 'Filler-Kanülen Set', 0, '💉', 2),
('aesthetik', 'Laser-Gerät', 30, '⚡', 3),
('aesthetik', 'Kühlgerät (Kryolipolyse)', 20, '❄️', 4),
('aesthetik', 'Ultraschall (HIFU)', 25, '📡', 5),
('aesthetik', 'Mesotherapie-Gerät', 15, '🔬', 6);

-- ── NAGELSTUDIO (5 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('nail', 'UV/LED Lampe', 3, '💡', 1),
('nail', 'Fräser (E-Feile)', 5, '🔧', 2),
('nail', 'Airbrush-Set', 8, '🎨', 3),
('nail', 'Gel & Acryl Sortiment', 5, '💅', 4),
('nail', 'Absaugung', 3, '💨', 5);

-- ── MASSAGE (5 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('massage', 'Hot-Stone Set', 8, '🪨', 1),
('massage', 'Schröpfgläser', 5, '⭕', 2),
('massage', 'Massageöle Sortiment', 3, '🧴', 3),
('massage', 'Infrarot-Lampe', 5, '🔴', 4),
('massage', 'TENS-Gerät', 5, '⚡', 5);

-- ── LASH & BROWS (5 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('lash', 'Wimpern-Extensions Set', 10, '👁️', 1),
('lash', 'Lash-Lifting Kit', 8, '✨', 2),
('lash', 'Brow-Lamination Kit', 8, '✏️', 3),
('lash', 'Ringlampe', 3, '💡', 4),
('lash', 'Lupe mit Licht', 3, '🔍', 5);

-- ── ARZT / KLINIK (6 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('arzt', 'Dermatoskop', 10, '🔬', 1),
('arzt', 'Laser-Gerät (med.)', 40, '⚡', 2),
('arzt', 'EKG-Monitor', 15, '💓', 3),
('arzt', 'Ultraschall (Sono)', 20, '📡', 4),
('arzt', 'Kryotherapie-Gerät', 15, '❄️', 5),
('arzt', 'Blutdruckmessgerät', 0, '🩺', 6);

-- ── OP-RAUM (7 items) ──
INSERT INTO equipment_templates (category, name, default_price_per_day, icon, sort_order) VALUES
('opraum', 'OP-Tisch (elektrisch)', 0, '🛏️', 1),
('opraum', 'OP-Leuchte', 0, '💡', 2),
('opraum', 'Anästhesie-Gerät', 30, '😷', 3),
('opraum', 'Monitor & Vitaldaten', 15, '💓', 4),
('opraum', 'Absaugung (chirurg.)', 10, '🔧', 5),
('opraum', 'Sterilisator (Autoklav)', 10, '🔬', 6),
('opraum', 'Instrumenten-Set', 20, '🩺', 7);


-- ═══════════════════════════════════════════════════════════
-- DEFAULT CONFIG — Loyalty & Referral
-- ═══════════════════════════════════════════════════════════

INSERT INTO loyalty_config (stamps_required, reward_description, is_active)
SELECT 10, '1 Gratis-Service nach 10 Buchungen', true
WHERE NOT EXISTS (SELECT 1 FROM loyalty_config LIMIT 1);

INSERT INTO referral_config (reward_cents, is_active, description)
SELECT 500, true, 'Lade Freunde ein und erhalte 5€ pro Empfehlung'
WHERE NOT EXISTS (SELECT 1 FROM referral_config LIMIT 1);


-- ─── RLS Policies ───

ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_stamps ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow read for all authenticated users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_templates_read') THEN
    CREATE POLICY service_templates_read ON service_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'equipment_templates_read') THEN
    CREATE POLICY equipment_templates_read ON equipment_templates FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'loyalty_config_read') THEN
    CREATE POLICY loyalty_config_read ON loyalty_config FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'referral_config_read') THEN
    CREATE POLICY referral_config_read ON referral_config FOR SELECT USING (true);
  END IF;
END $$;

-- Done: 73 service templates + 54 equipment templates + config seeded
