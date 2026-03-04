-- ╔══════════════════════════════════════════════════════════════╗
-- ║  ChairMatch — Supabase Database Setup                       ║
-- ║  Phase 1: Schema + Seed Data + Row Level Security           ║
-- ║  Run this in: Supabase Dashboard → SQL Editor → New Query   ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLES
-- ═══════════════════════════════════════════════════════════════

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','provider','b2b','admin')),
  first_name TEXT DEFAULT '',
  last_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  city TEXT DEFAULT '',
  lang TEXT DEFAULT 'de' CHECK (lang IN ('de','en','tr')),
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark','light')),
  referral_code TEXT UNIQUE,
  stamps INT DEFAULT 0,
  referral_count INT DEFAULT 0,
  referral_earnings NUMERIC(10,2) DEFAULT 0,
  newsletter BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories (reference table)
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  label_de TEXT NOT NULL,
  label_en TEXT,
  label_tr TEXT,
  sub_de TEXT,
  sub_en TEXT,
  sub_tr TEXT,
  sort_order INT DEFAULT 0
);

-- Providers
CREATE TABLE IF NOT EXISTS public.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  street TEXT,
  city TEXT,
  tagline TEXT,
  tags TEXT[] DEFAULT '{}',
  rating NUMERIC(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  discount INT DEFAULT 0,
  brand_color TEXT DEFAULT '#C8A84B',
  is_promoted BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  is_live BOOLEAN DEFAULT FALSE,
  free_slots INT DEFAULT 0,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free','gold','premium')),
  boost INT DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration INT NOT NULL, -- minutes
  price NUMERIC(10,2) NOT NULL,
  sort_order INT DEFAULT 0
);

-- Specialists (global list)
CREATE TABLE IF NOT EXISTS public.specialists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT,
  rating NUMERIC(2,1) DEFAULT 0,
  initials TEXT,
  color TEXT,
  category TEXT
);

-- Provider ↔ Specialist link (many-to-many)
CREATE TABLE IF NOT EXISTS public.provider_specialists (
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES public.specialists(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (provider_id, specialist_id)
);

-- Reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  duration INT,
  price NUMERIC(10,2),
  date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  specialist_name TEXT,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','pending','cancelled')),
  notes TEXT,
  promo_code TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental Options
CREATE TABLE IF NOT EXISTS public.rental_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('stuhl','liege','raum','opraum')),
  price_per_day NUMERIC(10,2) NOT NULL,
  description TEXT,
  size TEXT,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- Opening Hours
CREATE TABLE IF NOT EXISTS public.opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Mo','Di','Mi','Do','Fr','Sa','So')),
  hours TEXT NOT NULL DEFAULT 'Geschlossen',
  UNIQUE (provider_id, day_of_week)
);

-- Favorites
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider_id)
);

-- Promo Codes
CREATE TABLE IF NOT EXISTS public.promo_codes (
  code TEXT PRIMARY KEY,
  discount INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- 2. INDEXES
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_providers_category ON public.providers(category);
CREATE INDEX IF NOT EXISTS idx_providers_city ON public.providers(city);
CREATE INDEX IF NOT EXISTS idx_providers_is_live ON public.providers(is_live);
CREATE INDEX IF NOT EXISTS idx_providers_tier ON public.providers(tier);
CREATE INDEX IF NOT EXISTS idx_services_provider ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_provider ON public.reviews(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON public.bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_opening_hours_provider ON public.opening_hours(provider_id);
CREATE INDEX IF NOT EXISTS idx_rental_provider ON public.rental_options(provider_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_specs_provider ON public.provider_specialists(provider_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. FUNCTIONS & TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name, lang, theme, referral_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    'de', 'dark',
    'CM-' || UPPER(SUBSTR(MD5(NEW.id::text), 1, 6))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS providers_updated_at ON public.providers;
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-update provider review_count and rating on review INSERT
CREATE OR REPLACE FUNCTION public.update_provider_review_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.providers SET
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE provider_id = NEW.provider_id),
    rating = (SELECT ROUND(AVG(stars)::numeric, 1) FROM public.reviews WHERE provider_id = NEW.provider_id)
  WHERE id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_provider_review_stats();

-- ═══════════════════════════════════════════════════════════════
-- 4. ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_specialists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can read/update their own profile
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- PROVIDERS: Everyone can read, owner can update
CREATE POLICY "providers_select_all" ON public.providers FOR SELECT USING (true);
CREATE POLICY "providers_insert_own" ON public.providers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "providers_update_own" ON public.providers FOR UPDATE USING (auth.uid() = user_id);

-- SERVICES: Everyone can read
CREATE POLICY "services_select_all" ON public.services FOR SELECT USING (true);
CREATE POLICY "services_insert_owner" ON public.services FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.providers WHERE id = provider_id AND user_id = auth.uid()));
CREATE POLICY "services_update_owner" ON public.services FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.providers WHERE id = provider_id AND user_id = auth.uid()));
CREATE POLICY "services_delete_owner" ON public.services FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.providers WHERE id = provider_id AND user_id = auth.uid()));

-- SPECIALISTS: Everyone can read
CREATE POLICY "specialists_select_all" ON public.specialists FOR SELECT USING (true);

-- PROVIDER_SPECIALISTS: Everyone can read
CREATE POLICY "provider_specs_select_all" ON public.provider_specialists FOR SELECT USING (true);

-- REVIEWS: Everyone can read, auth users can insert
CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_auth" ON public.reviews FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- BOOKINGS: Users see their own bookings
CREATE POLICY "bookings_select_own" ON public.bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "bookings_insert_auth" ON public.bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_update_own" ON public.bookings FOR UPDATE USING (auth.uid() = user_id);

-- RENTAL OPTIONS: Everyone can read
CREATE POLICY "rentals_select_all" ON public.rental_options FOR SELECT USING (true);

-- OPENING HOURS: Everyone can read
CREATE POLICY "hours_select_all" ON public.opening_hours FOR SELECT USING (true);

-- FAVORITES: Users see/manage their own
CREATE POLICY "favorites_select_own" ON public.favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "favorites_insert_own" ON public.favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "favorites_delete_own" ON public.favorites FOR DELETE USING (auth.uid() = user_id);

-- PROMO CODES: Everyone can read active codes
CREATE POLICY "promos_select_active" ON public.promo_codes FOR SELECT USING (is_active = true);

-- CATEGORIES: Everyone can read
CREATE POLICY "categories_select_all" ON public.categories FOR SELECT USING (true);

-- Allow anonymous (guest) read access for public data
CREATE POLICY "providers_anon_select" ON public.providers FOR SELECT TO anon USING (true);
CREATE POLICY "services_anon_select" ON public.services FOR SELECT TO anon USING (true);
CREATE POLICY "specialists_anon_select" ON public.specialists FOR SELECT TO anon USING (true);
CREATE POLICY "provider_specs_anon_select" ON public.provider_specialists FOR SELECT TO anon USING (true);
CREATE POLICY "reviews_anon_select" ON public.reviews FOR SELECT TO anon USING (true);
CREATE POLICY "rentals_anon_select" ON public.rental_options FOR SELECT TO anon USING (true);
CREATE POLICY "hours_anon_select" ON public.opening_hours FOR SELECT TO anon USING (true);
CREATE POLICY "promos_anon_select" ON public.promo_codes FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "categories_anon_select" ON public.categories FOR SELECT TO anon USING (true);

-- ═══════════════════════════════════════════════════════════════
-- 5. SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- ─── Categories ───
INSERT INTO public.categories (id, label_de, label_en, label_tr, sub_de, sub_en, sub_tr, sort_order) VALUES
  ('barber',    'Barbershop',    'Barbershop',    'Berber',         'Fade · Cut · Bart',              'Fade · Cut · Beard',            'Fade · Kesim · Sakal',     1),
  ('friseur',   'Friseur',       'Hair Salon',    'Kuaför',         'Schnitt · Farbe · Styling',      'Cut · Color · Styling',         'Kesim · Renk · Şekil',     2),
  ('kosmetik',  'Kosmetik',      'Beauty',        'Kozmetik',       'Facial · Peeling · Laser',       'Facial · Peeling · Laser',      'Cilt · Peeling · Lazer',   3),
  ('aesthetik', 'Ästhetik',      'Aesthetics',    'Estetik',        'Botox · Filler · Anti-Aging',    'Botox · Filler · Anti-Aging',   'Botox · Dolgu · Anti-Aging',4),
  ('nail',      'Nagelstudio',   'Nail Studio',   'Tırnak Salonu',  'Gel · Nail Art · Maniküre',      'Gel · Nail Art · Manicure',     'Jel · Tırnak · Manikür',   5),
  ('massage',   'Massage',       'Massage',       'Masaj',          'Klassisch · Thai · Hot Stone',   'Classic · Thai · Hot Stone',    'Klasik · Thai · Sıcak Taş',6),
  ('lash',      'Lash & Brows',  'Lash & Brows',  'Kirpik & Kaş',  'Extensions · Lifting',           'Extensions · Lifting',          'Uzatma · Kaldırma',        7),
  ('arzt',      'Arzt / Klinik', 'Doctor / Clinic','Doktor / Klinik','Derma · Laser · Behandlung',    'Derma · Laser · Treatment',     'Derma · Lazer · Tedavi',   8),
  ('opraum',    'OP-Raum',       'OR Room',       'Ameliyathane',   'Sterile Räume · Chirurgie',      'Sterile Rooms · Surgery',       'Steril Odalar · Cerrahi',  9),
  ('angebote',  'Angebote',      'Offers',        'Teklifler',      'Rabatte · Specials',             'Discounts · Specials',          'İndirimler · Fırsatlar',  10),
  ('termin',    'Termin',        'Appointment',   'Randevu',        'Buchen · Umbuchen',              'Book · Reschedule',             'Rezerve · Değiştir',       11);

-- ─── Promo Codes ───
INSERT INTO public.promo_codes (code, discount, type, is_active) VALUES
  ('CHAIR2026', 15, 'percent', true),
  ('WELCOME10', 10, 'percent', true),
  ('BEAUTY5',    5, 'fixed',   true);

-- ─── Providers (fixed UUIDs for foreign key references) ───
INSERT INTO public.providers (id, category, name, street, city, rating, review_count, tagline, tags, discount, brand_color, is_promoted, is_verified, is_live, free_slots, tier, boost) VALUES
  ('00000000-0000-4000-a000-000000000001', 'barber',    'BlackLabel Barbershop',  'Münchener Str. 17',     'Frankfurt',  4.9, 412, 'Premium Fades & Beard Design',           ARRAY['Fade','Skin Fade','Bart','Herrenschnitt','Rasur'], 15, '#C8A84B', true,  true, true,  3, 'gold',    95),
  ('00000000-0000-4000-a000-000000000002', 'kosmetik',  'Glow Studio',            'Maximilianstr. 18',     'München',    4.8, 234, 'Organic Facials & Skin Care',             ARRAY['Facial','Peeling','Hautreinigung','Gesichtspflege','Anti-Aging'], 0, '#D4829A', false, true, true,  2, 'free',     0),
  ('00000000-0000-4000-a000-000000000003', 'aesthetik', 'AesthetiQ Klinik',       'Kurfürstendamm 55',    'Berlin',     5.0, 188, 'Med. Ästhetik & Anti-Aging',              ARRAY['Botox','Filler','Haartransplantation','Faltenbehandlung','Lippenunterspritzung','Schönheitsklinik'], 10, '#6AAED4', true,  true, false, 0, 'premium',  70),
  ('00000000-0000-4000-a000-000000000004', 'nail',      'NailLab by Lena',        'Jungfernstieg 7',      'Hamburg',    4.9, 301, 'Gel Nails & Premium Nail Art',            ARRAY['Gel','Nail Art','Maniküre','Pediküre','Shellac'], 0, '#C8A87A', false, true, true,  1, 'free',     0),
  ('00000000-0000-4000-a000-000000000005', 'friseur',   'Maison Haarwerk',        'Königsallee 44',       'Düsseldorf', 4.9, 318, 'Premium Haarschnitt & Colorationen',      ARRAY['Damenschnitt','Herrenschnitt','Balayage','Strähnchen','Haarfarbe','Haarverlängerung'], 10, '#9A70C8', true,  true, true,  2, 'gold',    88),
  ('00000000-0000-4000-a000-000000000006', 'massage',   'ZenFlow Massage',        'Schildergasse 12',     'Köln',       5.0, 276, 'Klassische & Tiefengewebsmassagen',       ARRAY['Klassisch','Tiefengewebe','Hot Stone','Sportmassage','Lymphdrainage'], 0, '#4AA890', true,  true, true,  4, 'premium',  60),
  ('00000000-0000-4000-a000-000000000007', 'barber',    'King''s Cut Berlin',     'Torstraße 89',         'Berlin',     4.8, 189, 'Urban Barbershop Culture',                ARRAY['Fade','Razor','Bart','Herrenschnitt','Konturenschnitt'], 20, '#D4A840', true,  true, true,  2, 'premium',  55),
  ('00000000-0000-4000-a000-000000000008', 'friseur',   'Haarmonie Stuttgart',    'Calwer Str. 22',       'Stuttgart',  4.7, 156, 'Nachhaltige Friseur-Kunst',               ARRAY['Bio','Vegan','Balayage','Naturfarbe','Haarschnitt'], 0, '#7AB870', false, true, true,  3, 'free',     0),
  ('00000000-0000-4000-a000-000000000009', 'kosmetik',  'Skin Atelier',           'Neuer Wall 15',        'Hamburg',    4.9, 210, 'Luxus Hautpflege & Treatments',           ARRAY['Microneedling','Facial','Anti-Aging','Haarentfernung','Hautstraffung','Fruchtsäurepeeling'], 15, '#C880A0', true,  true, true,  1, 'gold',    82),
  ('00000000-0000-4000-a000-000000000010', 'massage',   'Lotus Wellness',         'Hohenzollernring 33',  'Köln',       4.8, 198, 'Asiatische Massage-Tradition',            ARRAY['Thai','Shiatsu','Aromatherapie','Fußreflexzonen','Rückenmassage'], 0, '#60A8A0', false, true, true,  5, 'free',     0),
  ('00000000-0000-4000-a000-000000000011', 'nail',      'Glitter & Glow Nails',   'Zeil 28',              'Frankfurt',  4.7, 145, 'Trendy Nail Art Studio',                  ARRAY['Chrome','Airbrush','Extensions','Acryl','French Nails'], 10, '#C0A0D0', false, true, true,  2, 'free',     0),
  ('00000000-0000-4000-a000-000000000012', 'aesthetik', 'Face Perfect München',   'Leopoldstr. 31',       'München',    4.9, 167, 'Lippenunterspritzung & Profhilo',         ARRAY['Lippen','Profhilo','Mesotherapie','Faltenunterspritzung','Schönheitsklinik','Haartransplantation'], 0, '#80A8D8', true,  true, true,  1, 'premium',  50),
  ('00000000-0000-4000-a000-000000000013', 'lash',      'LashPerfect Studio',     'Sendlinger Str. 28',   'München',    4.9, 178, 'Premium Wimpern & Brow Design',           ARRAY['Lash Extensions','Lash Lifting','Brow Lamination','Wimpernverlängerung','Augenbrauen'], 0, '#B8A060', false, true, true,  3, 'free',     0),
  ('00000000-0000-4000-a000-000000000014', 'arzt',      'Derma Zentrum Berlin',   'Friedrichstr. 112',    'Berlin',     4.9, 203, 'Dermatologie & Laserbehandlung',          ARRAY['Laser','Hautcheck','Akne','Haarentfernung','Haartransplantation','Laserbehandlung','Pigmentflecken','Narbenbehandlung'], 5, '#6090C8', true,  true, true,  2, 'gold',    78),
  ('00000000-0000-4000-a000-000000000015', 'opraum',    'MedCenter OP-Räume',     'Kaiserstr. 40',        'Frankfurt',  5.0,  89, 'Sterile OP-Räume für Chirurgen & Ärzte', ARRAY['OP-Raum','Steril','Chirurgie','Haartransplantation','Schönheits-OP','Operationssaal','Ambulant'], 0, '#50B8A0', true,  true, true,  2, 'gold',    90),
  ('00000000-0000-4000-a000-000000000016', 'opraum',    'SterileSpace München',   'Prinzregentenstr. 22', 'München',    4.9,  67, 'Premium OP-Räume & Behandlungszimmer',    ARRAY['OP-Raum','Steril','Ambulante Chirurgie','Haartransplantation','Implantate','Operationssaal'], 10, '#40A890', true,  true, true,  1, 'premium',  65);

-- ─── Specialists (fixed UUIDs) ───
INSERT INTO public.specialists (id, name, role, rating, initials, color, category) VALUES
  ('00000000-0000-4000-b000-000000000001', 'Ahmed K.',      'Master Barber',      4.9, 'AK', '#2A4A3A', 'barber'),
  ('00000000-0000-4000-b000-000000000002', 'Sofia M.',      'Kosmetikerin',       4.8, 'SM', '#4A2A3A', 'kosmetik'),
  ('00000000-0000-4000-b000-000000000003', 'Dr. Meyer',     'Ästhetik Arzt',      5.0, 'DM', '#1A3050', 'aesthetik'),
  ('00000000-0000-4000-b000-000000000004', 'Lena B.',       'Nail Artist',        4.9, 'LB', '#3A3828', 'nail'),
  ('00000000-0000-4000-b000-000000000005', 'Marcus R.',     'Senior Barber',      4.7, 'MR', '#2A3828', 'barber'),
  ('00000000-0000-4000-b000-000000000006', 'Julia H.',      'Friseurmeisterin',   4.9, 'JH', '#3A2840', 'friseur'),
  ('00000000-0000-4000-b000-000000000007', 'Kenan A.',      'Masseur',            5.0, 'KA', '#1A3430', 'massage'),
  ('00000000-0000-4000-b000-000000000008', 'Elif T.',       'Friseurin',          4.8, 'ET', '#3A2048', 'friseur'),
  ('00000000-0000-4000-b000-000000000009', 'Jan W.',        'Barber',             4.6, 'JW', '#283A28', 'barber'),
  ('00000000-0000-4000-b000-000000000010', 'Sarah L.',      'Kosmetikerin',       4.9, 'SL', '#4A2848', 'kosmetik'),
  ('00000000-0000-4000-b000-000000000011', 'Mia K.',        'Nail Designerin',    4.8, 'MK', '#38382A', 'nail'),
  ('00000000-0000-4000-b000-000000000012', 'Timo F.',       'Masseur',            4.7, 'TF', '#1A3028', 'massage'),
  ('00000000-0000-4000-b000-000000000013', 'Nadine R.',     'Lash Stylistin',     4.9, 'NR', '#3A3020', 'lash'),
  ('00000000-0000-4000-b000-000000000014', 'Dr. Schneider', 'Dermatologe',        4.8, 'DS', '#1A2840', 'arzt');

-- ─── Provider ↔ Specialist Links ───
INSERT INTO public.provider_specialists (provider_id, specialist_id, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001', 1),  -- p1 ← Ahmed K.
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000005', 2),  -- p1 ← Marcus R.
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000002', 1),  -- p2 ← Sofia M.
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000010', 2),  -- p2 ← Sarah L.
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-b000-000000000003', 1),  -- p3 ← Dr. Meyer
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000004', 1),  -- p4 ← Lena B.
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000011', 2),  -- p4 ← Mia K.
  ('00000000-0000-4000-a000-000000000005', '00000000-0000-4000-b000-000000000006', 1),  -- p5 ← Julia H.
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-b000-000000000007', 1),  -- p6 ← Kenan A.
  ('00000000-0000-4000-a000-000000000007', '00000000-0000-4000-b000-000000000009', 1),  -- p7 ← Jan W.
  ('00000000-0000-4000-a000-000000000008', '00000000-0000-4000-b000-000000000008', 1),  -- p8 ← Elif T.
  ('00000000-0000-4000-a000-000000000009', '00000000-0000-4000-b000-000000000010', 1),  -- p9 ← Sarah L.
  ('00000000-0000-4000-a000-000000000010', '00000000-0000-4000-b000-000000000012', 1),  -- p10 ← Timo F.
  ('00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000011', 1),  -- p11 ← Mia K.
  ('00000000-0000-4000-a000-000000000012', '00000000-0000-4000-b000-000000000003', 1),  -- p12 ← Dr. Meyer
  ('00000000-0000-4000-a000-000000000013', '00000000-0000-4000-b000-000000000013', 1),  -- p13 ← Nadine R.
  ('00000000-0000-4000-a000-000000000014', '00000000-0000-4000-b000-000000000014', 1),  -- p14 ← Dr. Schneider
  ('00000000-0000-4000-a000-000000000015', '00000000-0000-4000-b000-000000000003', 1),  -- p15 ← Dr. Meyer
  ('00000000-0000-4000-a000-000000000015', '00000000-0000-4000-b000-000000000014', 2),  -- p15 ← Dr. Schneider
  ('00000000-0000-4000-a000-000000000016', '00000000-0000-4000-b000-000000000003', 1);  -- p16 ← Dr. Meyer

-- ─── Services ───
-- p1: BlackLabel Barbershop
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Signature Cut',  40, 42, 1),
  ('00000000-0000-4000-a000-000000000001', 'Skin Fade',      45, 48, 2),
  ('00000000-0000-4000-a000-000000000001', 'Beard Design',   30, 28, 3);

-- p2: Glow Studio
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000002', 'Deep Cleanse Facial', 60, 85, 1),
  ('00000000-0000-4000-a000-000000000002', 'Chemical Peeling',    45, 65, 2);

-- p3: AesthetiQ Klinik
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000003', 'Botox',                        30, 320, 1),
  ('00000000-0000-4000-a000-000000000003', 'Hyaluron Filler',              45, 450, 2),
  ('00000000-0000-4000-a000-000000000003', 'Haartransplantation Beratung', 60,   0, 3);

-- p4: NailLab by Lena
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000004', 'Gel Manicure',     60, 55, 1),
  ('00000000-0000-4000-a000-000000000004', 'Nail Art Design',  90, 75, 2);

-- p5: Maison Haarwerk
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000005', 'Damenschnitt & Styling',   60,  65, 1),
  ('00000000-0000-4000-a000-000000000005', 'Herrenschnitt',            35,  38, 2),
  ('00000000-0000-4000-a000-000000000005', 'Balayage / Highlights',   120, 120, 3);

-- p6: ZenFlow Massage
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000006', 'Klassische Massage',      60,  75, 1),
  ('00000000-0000-4000-a000-000000000006', 'Tiefengewebsmassage',     60,  90, 2),
  ('00000000-0000-4000-a000-000000000006', 'Hot Stone Massage',       90, 110, 3);

-- p7: King's Cut Berlin
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000007', 'Classic Cut',       35, 35, 1),
  ('00000000-0000-4000-a000-000000000007', 'Hot Towel Shave',   30, 30, 2),
  ('00000000-0000-4000-a000-000000000007', 'Full Service',      60, 58, 3);

-- p8: Haarmonie Stuttgart
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000008', 'Bio Haarschnitt',    45, 52, 1),
  ('00000000-0000-4000-a000-000000000008', 'Vegan Coloration',   90, 95, 2);

-- p9: Skin Atelier
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000009', 'Luxus Facial',            75, 120, 1),
  ('00000000-0000-4000-a000-000000000009', 'Microneedling',           60, 150, 2),
  ('00000000-0000-4000-a000-000000000009', 'Laser Haarentfernung',    45, 130, 3);

-- p10: Lotus Wellness
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000010', 'Thai Massage',     60,  70, 1),
  ('00000000-0000-4000-a000-000000000010', 'Shiatsu',          75,  85, 2),
  ('00000000-0000-4000-a000-000000000010', 'Aromatherapie',    90, 100, 3);

-- p11: Glitter & Glow Nails
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000011', 'Chrome Nails',       75, 65, 1),
  ('00000000-0000-4000-a000-000000000011', 'Airbrush Design',    90, 85, 2);

-- p12: Face Perfect München
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000012', 'Lippen Filler',              30,  380, 1),
  ('00000000-0000-4000-a000-000000000012', 'Profhilo',                   45,  420, 2),
  ('00000000-0000-4000-a000-000000000012', 'Haartransplantation FUE',   180, 2500, 3);

-- p13: LashPerfect Studio
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000013', 'Classic Lash Extensions',  90, 89, 1),
  ('00000000-0000-4000-a000-000000000013', 'Lash Lifting & Tinting',   60, 55, 2),
  ('00000000-0000-4000-a000-000000000013', 'Brow Lamination',          45, 45, 3);

-- p14: Derma Zentrum Berlin
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000014', 'Hautkrebs-Screening',           30,  95, 1),
  ('00000000-0000-4000-a000-000000000014', 'Laser Haarentfernung',          45, 150, 2),
  ('00000000-0000-4000-a000-000000000014', 'Akne Behandlung',               40, 120, 3),
  ('00000000-0000-4000-a000-000000000014', 'Haartransplantation Beratung',  45,   0, 4);

-- p15: MedCenter OP-Räume
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000015', 'OP-Raum Tagesmiete',              480, 450, 1),
  ('00000000-0000-4000-a000-000000000015', 'OP-Raum Halbtag',                 240, 280, 2),
  ('00000000-0000-4000-a000-000000000015', 'Sterilisation & Aufbereitung',     60,  80, 3);

-- p16: SterileSpace München
INSERT INTO public.services (provider_id, name, duration, price, sort_order) VALUES
  ('00000000-0000-4000-a000-000000000016', 'OP-Raum Premium (Ganztag)',   480, 400, 1),
  ('00000000-0000-4000-a000-000000000016', 'Behandlungsraum Steril',      240, 180, 2);

-- ─── Reviews ───
INSERT INTO public.reviews (provider_id, username, stars, text, created_at) VALUES
  ('00000000-0000-4000-a000-000000000001', 'Tobias K.',   5, 'Absolut top!',                          '2026-02-12'),
  ('00000000-0000-4000-a000-000000000001', 'Markus L.',   5, 'Super Atmosphäre.',                     '2026-02-05'),
  ('00000000-0000-4000-a000-000000000002', 'Anna S.',     5, 'Haut strahlt!',                         '2026-02-08'),
  ('00000000-0000-4000-a000-000000000003', 'Sandra M.',   5, 'Dr. Meyer ist der Beste.',              '2026-02-10'),
  ('00000000-0000-4000-a000-000000000004', 'Julia R.',    5, 'Traumhafte Nägel!',                     '2026-02-14'),
  ('00000000-0000-4000-a000-000000000005', 'Klara W.',    5, 'Traumhafte Farbe!',                     '2026-02-15'),
  ('00000000-0000-4000-a000-000000000005', 'Tom B.',      5, 'Bester Haarschnitt.',                   '2026-02-09'),
  ('00000000-0000-4000-a000-000000000006', 'Peter N.',    5, 'Absolut entspannend!',                  '2026-02-13'),
  ('00000000-0000-4000-a000-000000000006', 'Sabine K.',   5, 'Kenan ist ein Profi.',                  '2026-02-07'),
  ('00000000-0000-4000-a000-000000000007', 'Leon M.',     5, 'Bester Barber in Berlin!',              '2026-02-18'),
  ('00000000-0000-4000-a000-000000000007', 'Felix A.',    4, 'Super Ergebnis.',                       '2026-02-11'),
  ('00000000-0000-4000-a000-000000000008', 'Marie S.',    5, 'Endlich ein nachhaltiger Salon!',       '2026-02-20'),
  ('00000000-0000-4000-a000-000000000009', 'Lisa W.',     5, 'Beste Behandlung ever!',                '2026-02-22'),
  ('00000000-0000-4000-a000-000000000010', 'Hans B.',     5, 'Wie in Thailand!',                      '2026-02-16'),
  ('00000000-0000-4000-a000-000000000011', 'Lara T.',     4, 'Coole Designs!',                        '2026-02-19'),
  ('00000000-0000-4000-a000-000000000012', 'Nina G.',     5, 'Natürliches Ergebnis!',                 '2026-02-21'),
  ('00000000-0000-4000-a000-000000000013', 'Jenny K.',    5, 'Perfekte Wimpern!',                     '2026-02-23'),
  ('00000000-0000-4000-a000-000000000014', 'Max B.',      5, 'Sehr professionell!',                   '2026-02-24'),
  ('00000000-0000-4000-a000-000000000015', 'Dr. Yilmaz',  5, 'Perfekt ausgestattet, steril und modern.', '2026-02-20'),
  ('00000000-0000-4000-a000-000000000015', 'Dr. Fischer', 5, 'Beste OP-Räume in Frankfurt.',          '2026-02-15'),
  ('00000000-0000-4000-a000-000000000016', 'Dr. Berger',  5, 'Top Ausstattung, alles steril.',        '2026-02-18');

-- ─── Rental Options ───
INSERT INTO public.rental_options (provider_id, type, price_per_day) VALUES
  ('00000000-0000-4000-a000-000000000001', 'stuhl',  45),
  ('00000000-0000-4000-a000-000000000001', 'raum',   60),
  ('00000000-0000-4000-a000-000000000002', 'liege',  38),
  ('00000000-0000-4000-a000-000000000002', 'raum',   50),
  ('00000000-0000-4000-a000-000000000003', 'raum',  120),
  ('00000000-0000-4000-a000-000000000004', 'stuhl',  30),
  ('00000000-0000-4000-a000-000000000005', 'stuhl',  50),
  ('00000000-0000-4000-a000-000000000005', 'raum',   65),
  ('00000000-0000-4000-a000-000000000006', 'liege',  40),
  ('00000000-0000-4000-a000-000000000006', 'raum',   55),
  ('00000000-0000-4000-a000-000000000007', 'stuhl',  42),
  ('00000000-0000-4000-a000-000000000008', 'stuhl',  35),
  ('00000000-0000-4000-a000-000000000009', 'liege',  45),
  ('00000000-0000-4000-a000-000000000009', 'raum',   70),
  ('00000000-0000-4000-a000-000000000010', 'liege',  35),
  ('00000000-0000-4000-a000-000000000010', 'raum',   48),
  ('00000000-0000-4000-a000-000000000011', 'stuhl',  28),
  ('00000000-0000-4000-a000-000000000012', 'raum',  100),
  ('00000000-0000-4000-a000-000000000013', 'stuhl',  32),
  ('00000000-0000-4000-a000-000000000014', 'raum',   90),
  ('00000000-0000-4000-a000-000000000014', 'opraum',350),
  ('00000000-0000-4000-a000-000000000015', 'opraum',450),
  ('00000000-0000-4000-a000-000000000016', 'opraum',400),
  ('00000000-0000-4000-a000-000000000016', 'raum',  120);

-- ─── Opening Hours ───
-- Helper: default hours are Mo-Fr 09:00–19:00, Sa 10:00–16:00, So Geschlossen
-- Providers with custom hours: p1, p2, p3, p5, p7, p8, p10, p15, p16
-- Rest get default hours

-- p1: BlackLabel (Mo-Fr 09-20, Sa 09-17, So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000001','Mo','09:00–20:00'),('00000000-0000-4000-a000-000000000001','Di','09:00–20:00'),
  ('00000000-0000-4000-a000-000000000001','Mi','09:00–20:00'),('00000000-0000-4000-a000-000000000001','Do','09:00–20:00'),
  ('00000000-0000-4000-a000-000000000001','Fr','09:00–20:00'),('00000000-0000-4000-a000-000000000001','Sa','09:00–17:00'),
  ('00000000-0000-4000-a000-000000000001','So','Geschlossen');

-- p2: Glow Studio (Mo Geschlossen, Di-Fr 10-18, Do bis 20, Sa 10-16, So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000002','Mo','Geschlossen'),('00000000-0000-4000-a000-000000000002','Di','10:00–18:00'),
  ('00000000-0000-4000-a000-000000000002','Mi','10:00–18:00'),('00000000-0000-4000-a000-000000000002','Do','10:00–20:00'),
  ('00000000-0000-4000-a000-000000000002','Fr','10:00–18:00'),('00000000-0000-4000-a000-000000000002','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000002','So','Geschlossen');

-- p3: AesthetiQ Klinik (Mo-Do 08-18, Fr 08-16, Sa n.V., So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000003','Mo','08:00–18:00'),('00000000-0000-4000-a000-000000000003','Di','08:00–18:00'),
  ('00000000-0000-4000-a000-000000000003','Mi','08:00–18:00'),('00000000-0000-4000-a000-000000000003','Do','08:00–18:00'),
  ('00000000-0000-4000-a000-000000000003','Fr','08:00–16:00'),('00000000-0000-4000-a000-000000000003','Sa','Nach Vereinbarung'),
  ('00000000-0000-4000-a000-000000000003','So','Geschlossen');

-- p4: NailLab (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000004','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000004','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000004','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000004','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000004','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000004','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000004','So','Geschlossen');

-- p5: Maison Haarwerk (Mo Geschlossen, Di-Mi/Fr 09-19, Do 09-21, Sa 09-17, So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000005','Mo','Geschlossen'),('00000000-0000-4000-a000-000000000005','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000005','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000005','Do','09:00–21:00'),
  ('00000000-0000-4000-a000-000000000005','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000005','Sa','09:00–17:00'),
  ('00000000-0000-4000-a000-000000000005','So','Geschlossen');

-- p6: ZenFlow (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000006','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000006','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000006','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000006','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000006','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000006','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000006','So','Geschlossen');

-- p7: King's Cut (Mo-Do 10-20, Fr 10-21, Sa 10-18, So 12-17)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000007','Mo','10:00–20:00'),('00000000-0000-4000-a000-000000000007','Di','10:00–20:00'),
  ('00000000-0000-4000-a000-000000000007','Mi','10:00–20:00'),('00000000-0000-4000-a000-000000000007','Do','10:00–20:00'),
  ('00000000-0000-4000-a000-000000000007','Fr','10:00–21:00'),('00000000-0000-4000-a000-000000000007','Sa','10:00–18:00'),
  ('00000000-0000-4000-a000-000000000007','So','12:00–17:00');

-- p8: Haarmonie (Mo Geschlossen, Di-Fr 09-18, Sa 09-14, So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000008','Mo','Geschlossen'),('00000000-0000-4000-a000-000000000008','Di','09:00–18:00'),
  ('00000000-0000-4000-a000-000000000008','Mi','09:00–18:00'),('00000000-0000-4000-a000-000000000008','Do','09:00–18:00'),
  ('00000000-0000-4000-a000-000000000008','Fr','09:00–18:00'),('00000000-0000-4000-a000-000000000008','Sa','09:00–14:00'),
  ('00000000-0000-4000-a000-000000000008','So','Geschlossen');

-- p9: Skin Atelier (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000009','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000009','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000009','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000009','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000009','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000009','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000009','So','Geschlossen');

-- p10: Lotus Wellness (Mo-Fr 10-20, Sa 10-18, So 11-17)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000010','Mo','10:00–20:00'),('00000000-0000-4000-a000-000000000010','Di','10:00–20:00'),
  ('00000000-0000-4000-a000-000000000010','Mi','10:00–20:00'),('00000000-0000-4000-a000-000000000010','Do','10:00–20:00'),
  ('00000000-0000-4000-a000-000000000010','Fr','10:00–20:00'),('00000000-0000-4000-a000-000000000010','Sa','10:00–18:00'),
  ('00000000-0000-4000-a000-000000000010','So','11:00–17:00');

-- p11: Glitter & Glow (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000011','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000011','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000011','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000011','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000011','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000011','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000011','So','Geschlossen');

-- p12: Face Perfect (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000012','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000012','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000012','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000012','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000012','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000012','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000012','So','Geschlossen');

-- p13: LashPerfect (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000013','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000013','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000013','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000013','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000013','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000013','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000013','So','Geschlossen');

-- p14: Derma Zentrum (Default hours)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000014','Mo','09:00–19:00'),('00000000-0000-4000-a000-000000000014','Di','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000014','Mi','09:00–19:00'),('00000000-0000-4000-a000-000000000014','Do','09:00–19:00'),
  ('00000000-0000-4000-a000-000000000014','Fr','09:00–19:00'),('00000000-0000-4000-a000-000000000014','Sa','10:00–16:00'),
  ('00000000-0000-4000-a000-000000000014','So','Geschlossen');

-- p15: MedCenter (Mo-Do 07-19, Fr 07-17, Sa n.V., So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000015','Mo','07:00–19:00'),('00000000-0000-4000-a000-000000000015','Di','07:00–19:00'),
  ('00000000-0000-4000-a000-000000000015','Mi','07:00–19:00'),('00000000-0000-4000-a000-000000000015','Do','07:00–19:00'),
  ('00000000-0000-4000-a000-000000000015','Fr','07:00–17:00'),('00000000-0000-4000-a000-000000000015','Sa','Nach Vereinbarung'),
  ('00000000-0000-4000-a000-000000000015','So','Geschlossen');

-- p16: SterileSpace (Mo-Do 08-18, Fr 08-16, Sa n.V., So Geschlossen)
INSERT INTO public.opening_hours (provider_id, day_of_week, hours) VALUES
  ('00000000-0000-4000-a000-000000000016','Mo','08:00–18:00'),('00000000-0000-4000-a000-000000000016','Di','08:00–18:00'),
  ('00000000-0000-4000-a000-000000000016','Mi','08:00–18:00'),('00000000-0000-4000-a000-000000000016','Do','08:00–18:00'),
  ('00000000-0000-4000-a000-000000000016','Fr','08:00–16:00'),('00000000-0000-4000-a000-000000000016','Sa','Nach Vereinbarung'),
  ('00000000-0000-4000-a000-000000000016','So','Geschlossen');

-- ═══════════════════════════════════════════════════════════════
-- ✅ DONE — All tables, policies, triggers, and seed data created.
-- Next: Add Supabase URL + anon key to index.html
-- ═══════════════════════════════════════════════════════════════
