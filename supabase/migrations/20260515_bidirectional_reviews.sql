-- ──────────────────────────────────────────────────────────────────────
-- BIDIREKTIONALE BEWERTUNGEN (Airbnb-Style)
-- ──────────────────────────────────────────────────────────────────────
-- Vorher: reviews war einseitig (customer → salon).
-- Nachher: drei Bewertungs-Typen:
--   1. customer_to_salon — End-Kunde bewertet Salon (Termin-Behandlung)
--   2. tenant_to_provider — Stuhl-Mieter bewertet Stuhl-Anbieter (Marketplace-Booking)
--   3. provider_to_tenant — Stuhl-Anbieter bewertet Stuhl-Mieter (Marketplace-Booking)
--
-- DOUBLE-BLIND-LOGIK (verhindert "Rache-Reviews"):
--   - Beide Seiten haben 14 Tage nach Booking-Ende um zu bewerten
--   - Reviews bleiben "draft" bis beide eingegangen sind ODER 14 Tage rum
--   - Dann gleichzeitige Freischaltung (visible_at gesetzt)
--   - Wenn nur 1 Seite bewertet hat nach 14d → diese eine wird freigeschaltet
-- ──────────────────────────────────────────────────────────────────────

-- Neue Spalten an reviews
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS review_type TEXT,
  ADD COLUMN IF NOT EXISTS visible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT FALSE;

-- Migrate existing data: customer_id → reviewer_id, salon-owner als reviewee
UPDATE public.reviews
SET
  reviewer_id = customer_id,
  review_type = 'customer_to_salon',
  published = TRUE,
  visible_at = COALESCE(visible_at, created_at)
WHERE reviewer_id IS NULL;

-- Constraint: review_type muss bekannt sein
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_review_type_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_review_type_check
  CHECK (review_type IN ('customer_to_salon', 'tenant_to_provider', 'provider_to_tenant'));

-- Eindeutigkeit: ein Reviewer kann pro Booking nur 1x bewerten
CREATE UNIQUE INDEX IF NOT EXISTS reviews_unique_per_reviewer_booking
  ON public.reviews (reviewer_id, booking_id, review_type)
  WHERE booking_id IS NOT NULL;

-- Performance-Indexes
CREATE INDEX IF NOT EXISTS reviews_reviewer_id_idx ON public.reviews (reviewer_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee_user_id_idx ON public.reviews (reviewee_user_id);
CREATE INDEX IF NOT EXISTS reviews_published_idx ON public.reviews (published);
CREATE INDEX IF NOT EXISTS reviews_review_type_idx ON public.reviews (review_type);

-- ──────────────────────────────────────────────────────────────────────
-- profiles: Aggregat-Felder für Mieter-Reputation
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avg_rating_as_tenant NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count_as_tenant INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_rating_as_provider NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count_as_provider INTEGER NOT NULL DEFAULT 0;

-- ──────────────────────────────────────────────────────────────────────
-- Trigger: User-Aggregate-Update bei jedem Review-Insert/Update
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_user_review_aggregates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user UUID;
  review_type_processed TEXT;
BEGIN
  -- Bei DELETE: alten Wert nehmen
  target_user := COALESCE(NEW.reviewee_user_id, OLD.reviewee_user_id);
  review_type_processed := COALESCE(NEW.review_type, OLD.review_type);

  IF target_user IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Nur bei sichtbaren (published) Reviews aggregieren
  IF review_type_processed = 'provider_to_tenant' THEN
    UPDATE public.profiles
    SET
      avg_rating_as_tenant = (
        SELECT AVG(rating)::NUMERIC(3,2)
        FROM public.reviews
        WHERE reviewee_user_id = target_user
          AND review_type = 'provider_to_tenant'
          AND published = TRUE
      ),
      review_count_as_tenant = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_user_id = target_user
          AND review_type = 'provider_to_tenant'
          AND published = TRUE
      )
    WHERE id = target_user;
  ELSIF review_type_processed = 'tenant_to_provider' THEN
    UPDATE public.profiles
    SET
      avg_rating_as_provider = (
        SELECT AVG(rating)::NUMERIC(3,2)
        FROM public.reviews
        WHERE reviewee_user_id = target_user
          AND review_type = 'tenant_to_provider'
          AND published = TRUE
      ),
      review_count_as_provider = (
        SELECT COUNT(*)
        FROM public.reviews
        WHERE reviewee_user_id = target_user
          AND review_type = 'tenant_to_provider'
          AND published = TRUE
      )
    WHERE id = target_user;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_update_user_review_aggregates ON public.reviews;
CREATE TRIGGER trg_update_user_review_aggregates
  AFTER INSERT OR UPDATE OF published, rating OR DELETE
  ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_review_aggregates();

-- ──────────────────────────────────────────────────────────────────────
-- Function: Double-Blind-Freischaltung
-- ──────────────────────────────────────────────────────────────────────
-- Wird vom Backend nach Review-Submission aufgerufen.
-- Logik:
--   1. Wenn beide Seiten bewertet haben → beide published=TRUE setzen
--   2. Wenn nur eine Seite bewertet UND > 14 Tage seit Booking-Ende → diese eine freischalten
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.publish_review_pair(p_booking_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_review_count INT;
  v_provider_review_count INT;
  v_booking_ended_at TIMESTAMPTZ;
  v_days_since_booking INT;
BEGIN
  -- Counts beider Seiten
  SELECT COUNT(*) INTO v_tenant_review_count
  FROM public.reviews
  WHERE booking_id = p_booking_id AND review_type = 'tenant_to_provider';

  SELECT COUNT(*) INTO v_provider_review_count
  FROM public.reviews
  WHERE booking_id = p_booking_id AND review_type = 'provider_to_tenant';

  -- Booking-Ende prüfen
  SELECT COALESCE(end_at, updated_at, created_at) INTO v_booking_ended_at
  FROM public.bookings
  WHERE id = p_booking_id;

  v_days_since_booking := EXTRACT(DAY FROM NOW() - v_booking_ended_at);

  -- Fall 1: Beide haben bewertet → beide freischalten
  IF v_tenant_review_count > 0 AND v_provider_review_count > 0 THEN
    UPDATE public.reviews
    SET published = TRUE,
        visible_at = COALESCE(visible_at, NOW())
    WHERE booking_id = p_booking_id
      AND review_type IN ('tenant_to_provider', 'provider_to_tenant')
      AND published = FALSE;
  END IF;

  -- Fall 2: Nur eine Seite, aber 14 Tage rum → diese eine freischalten
  IF v_days_since_booking >= 14 THEN
    UPDATE public.reviews
    SET published = TRUE,
        visible_at = COALESCE(visible_at, NOW())
    WHERE booking_id = p_booking_id
      AND review_type IN ('tenant_to_provider', 'provider_to_tenant')
      AND published = FALSE;
  END IF;

  -- customer_to_salon ist immer sofort published (kein Double-Blind)
END $$;

-- ──────────────────────────────────────────────────────────────────────
-- RLS-Policies für reviews
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reviews_public_select_published" ON public.reviews;
DROP POLICY IF EXISTS "reviews_owner_select_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_reviewer_insert" ON public.reviews;
DROP POLICY IF EXISTS "reviews_reviewer_update_own" ON public.reviews;

-- SELECT: published Reviews sind public; eigene + reviewee-Reviews auch wenn unpublished
CREATE POLICY "reviews_public_select_published" ON public.reviews
  FOR SELECT TO anon, authenticated
  USING (published = TRUE);

CREATE POLICY "reviews_owner_select_own" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR reviewee_user_id = auth.uid()
    OR public.is_admin()
  );

-- INSERT: nur als Reviewer eigene Reviews schreiben
CREATE POLICY "reviews_reviewer_insert" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (reviewer_id = auth.uid() OR public.is_admin());

-- UPDATE: nur eigene draft-Reviews editierbar
CREATE POLICY "reviews_reviewer_update_own" ON public.reviews
  FOR UPDATE TO authenticated
  USING (reviewer_id = auth.uid() AND published = FALSE)
  WITH CHECK (reviewer_id = auth.uid() AND published = FALSE);

-- DELETE: nur Admin (Moderation)
DROP POLICY IF EXISTS "reviews_admin_delete" ON public.reviews;
CREATE POLICY "reviews_admin_delete" ON public.reviews
  FOR DELETE TO authenticated
  USING (public.is_admin());
