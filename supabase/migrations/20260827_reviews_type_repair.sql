-- ──────────────────────────────────────────────────────────────────────
-- REPARATUR: Kundenbewertungen ohne Typ und ohne published-Flag
-- ──────────────────────────────────────────────────────────────────────
-- Migration 20260515_bidirectional_reviews hat `review_type` und
-- `published NOT NULL DEFAULT FALSE` eingefuehrt und die damals vorhandenen
-- Zeilen korrekt auf ('customer_to_salon', TRUE) gesetzt.
--
-- Der Schreibpfad wurde dabei nicht mitgezogen: `createReview` hat bis
-- 2026-08-27 weiterhin ohne `reviewer_id`, ohne `review_type` und ohne
-- `published` eingefuegt. Jede seit dem 15.05.2026 abgegebene
-- Kundenbewertung liegt deshalb als (review_type = NULL, published = FALSE)
-- in der Tabelle. Zwei Folgen:
--
--   1. Die RLS-Policy `reviews_public_select_published` (published = TRUE)
--      blendet diese Bewertungen fuer jeden direkten Client-Zugriff aus.
--   2. Der Unique-Index `reviews_unique_per_reviewer_booking` greift auf
--      (reviewer_id, booking_id, review_type). Mit reviewer_id = NULL
--      vergleicht Postgres nie auf Gleichheit — der Doppelbewertungs-Schutz
--      war auf DB-Ebene wirkungslos.
--
-- Diese Migration zieht die Altdaten nach. Der Code schreibt die Felder ab
-- sofort selbst; sie ist also einmalig und idempotent.
--
-- Abgegrenzt wird ueber `booking_id`/`reviewer_id`: Miet-Bewertungen setzen
-- ihren `review_type` IMMER explizit, sind hier also nie betroffen.
-- ──────────────────────────────────────────────────────────────────────

UPDATE public.reviews
SET
  review_type = 'customer_to_salon',
  reviewer_id = COALESCE(reviewer_id, customer_id),
  published   = TRUE,
  visible_at  = COALESCE(visible_at, created_at)
WHERE review_type IS NULL
  AND customer_id IS NOT NULL;

-- Kontrolle: es darf danach keine Zeile ohne Typ mehr geben.
DO $$
DECLARE offen INTEGER;
BEGIN
  SELECT COUNT(*) INTO offen FROM public.reviews WHERE review_type IS NULL;
  IF offen > 0 THEN
    RAISE WARNING 'reviews: % Zeilen ohne review_type verbleiben (customer_id ebenfalls NULL) — bitte manuell pruefen', offen;
  END IF;
END $$;
