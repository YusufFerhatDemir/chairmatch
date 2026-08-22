-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Persistenz-Fundament (Stand 2026-08-21)
-- ──────────────────────────────────────────────────────────────────────
-- Schliesst die Luecken aus der Delta-Analyse:
--   B) "Mein Bereich"-Formulare schrieben nur in localStorage
--   C) Bild-/Dokument-Uploads lagen als Data-URL im localStorage
--   D) Mietanfragen wurden nie zugestellt
--   E) rental_equipment war read-only (kein CRUD)
--
-- Zugriffsmodell (identisch zu 20260819_rls_close_gaps_v2):
--   Der Browser schreibt NIE direkt. Jeder Schreibpfad laeuft ueber eine
--   authentifizierte API-Route mit getSupabaseAdmin() (service_role, umgeht
--   RLS). Die Policies hier sind Defense-in-Depth: SELECT nur auf die
--   eigene Zeile, keine INSERT/UPDATE/DELETE-Policy fuer anon/authenticated.
--
-- ACHTUNG: muss im Supabase-SQL-Editor angewendet werden. Ohne diese
-- Migration liefern die neuen API-Routen 500 mit Klartext-Fehler — sie
-- faellt bewusst NICHT still auf localStorage zurueck.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ──────────────────────────────────────────────────────────────────────
-- 1. tenant_profiles — Mieter-Profil + Suchradius
--    Ersetzt: cm_mieter_profil, cm_mieter_radius
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_profiles (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name      text,
  job               text,
  license_number    text,
  search_radius_km  integer NOT NULL DEFAULT 10
                      CHECK (search_radius_km BETWEEN 1 AND 50),
  search_city       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tenant_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_profiles_own_select" ON public.tenant_profiles;
CREATE POLICY "tenant_profiles_own_select" ON public.tenant_profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────
-- 2. payout_accounts — Auszahlungsdaten (Anbieter UND Vermieter)
--    Ersetzt: cm_anbieter_auszahlung, cm_vermieter_auszahlung
--
--    Ein Nutzer kann beide Rollen haben, deshalb (user_id, context) als PK.
--    Die volle IBAN wird NIE an den Browser zurueckgegeben — die API liest
--    ausschliesslich iban_last4. Zusaetzlich wird das Klartext-Feld auf
--    PostgREST-Ebene fuer anon/authenticated gesperrt (wie totp_secret).
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payout_accounts (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  context         text NOT NULL CHECK (context IN ('anbieter', 'vermieter')),
  iban            text NOT NULL,
  iban_last4      text NOT NULL,
  account_holder  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, context)
);

ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payout_accounts_own_select" ON public.payout_accounts;
CREATE POLICY "payout_accounts_own_select" ON public.payout_accounts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE SELECT (iban) ON public.payout_accounts FROM anon, authenticated;

-- ──────────────────────────────────────────────────────────────────────
-- 3. user_uploads — Bilder & Dokumente (Track C)
--    Dateien liegen im PRIVATEN Bucket 'cm-uploads'. In der DB steht nur
--    der storage_path; ausgeliefert wird ueber /api/uploads/{id}, das je
--    Request eine frische Signed URL erzeugt. So landet nie eine
--    ablaufende URL in salons.logo_url / rental_equipment.images.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_uploads (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target        text NOT NULL CHECK (target IN (
                  'salon_logo', 'salon_gallery', 'salon_certificate', 'listing_photo'
                )),
  salon_id      uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  equipment_id  uuid REFERENCES public.rental_equipment(id) ON DELETE CASCADE,
  doc_key       text,
  bucket        text NOT NULL DEFAULT 'cm-uploads',
  storage_path  text NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    integer NOT NULL,
  -- Logo/Galerie/Inserats-Fotos sind oeffentlich sichtbar, Zertifikate nicht.
  is_public     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_uploads_user   ON public.user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_user_uploads_salon  ON public.user_uploads(salon_id, target);
CREATE INDEX IF NOT EXISTS idx_user_uploads_equip  ON public.user_uploads(equipment_id);
-- Pro Salon + doc_key genau ein Zertifikat (Ersetzen statt Duplikate).
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_uploads_cert
  ON public.user_uploads(salon_id, doc_key)
  WHERE target = 'salon_certificate';

ALTER TABLE public.user_uploads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_uploads_own_select" ON public.user_uploads;
CREATE POLICY "user_uploads_own_select" ON public.user_uploads
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Privater Bucket. Ohne public=false waeren Zertifikate per Raten der
-- Storage-URL abrufbar.
INSERT INTO storage.buckets (id, name, public)
VALUES ('cm-uploads', 'cm-uploads', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- ──────────────────────────────────────────────────────────────────────
-- 4. rental_equipment — Spalten fuer das Vermieter-Inserat (Track B/E)
--    Ersetzt: cm_vermieter_preise, _verfuegbarkeit, _ausstattung, _fotos
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.rental_equipment
  ADD COLUMN IF NOT EXISTS price_per_hour_cents  integer,
  ADD COLUMN IF NOT EXISTS price_per_week_cents  integer,
  ADD COLUMN IF NOT EXISTS available_days        text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_from        time,
  ADD COLUMN IF NOT EXISTS available_to          time,
  ADD COLUMN IF NOT EXISTS features              text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at            timestamptz NOT NULL DEFAULT now();

-- Preise duerfen nicht negativ werden (Tagespreis ist bereits NOT NULL).
ALTER TABLE public.rental_equipment
  DROP CONSTRAINT IF EXISTS rental_equipment_prices_nonneg;
ALTER TABLE public.rental_equipment
  ADD CONSTRAINT rental_equipment_prices_nonneg CHECK (
    price_per_day_cents   >= 0
    AND (price_per_hour_cents  IS NULL OR price_per_hour_cents  >= 0)
    AND (price_per_week_cents  IS NULL OR price_per_week_cents  >= 0)
    AND (price_per_month_cents IS NULL OR price_per_month_cents >= 0)
  );

CREATE INDEX IF NOT EXISTS idx_rental_equipment_salon
  ON public.rental_equipment(salon_id);

-- ──────────────────────────────────────────────────────────────────────
-- 5. rental_requests — unverbindliche Miet-/Besichtigungsanfrage (Track D)
--    Ersetzt: cm_mietanfragen. Bewusst getrennt von rental_bookings:
--    eine Anfrage ist kostenlos, unbezahlt und blockt keinen Zeitraum.
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rental_requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id     uuid REFERENCES public.rental_equipment(id) ON DELETE CASCADE,
  salon_id         uuid REFERENCES public.salons(id) ON DELETE CASCADE,
  requester_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  request_type     text NOT NULL DEFAULT 'miete'
                     CHECK (request_type IN ('miete', 'besichtigung')),
  preferred_date   date NOT NULL,
  preferred_time   time,
  duration_unit    text CHECK (duration_unit IN ('hour', 'day', 'week', 'month')),
  units            integer CHECK (units IS NULL OR units BETWEEN 1 AND 999),
  message          text,
  estimated_cents  integer NOT NULL DEFAULT 0 CHECK (estimated_cents >= 0),
  status           text NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open', 'accepted', 'declined', 'withdrawn')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rental_requests_recipient
  ON public.rental_requests(recipient_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_requests_requester
  ON public.rental_requests(requester_id, created_at DESC);

ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rental_requests_party_select" ON public.rental_requests;
CREATE POLICY "rental_requests_party_select" ON public.rental_requests
  FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR recipient_id = auth.uid());

COMMIT;
