-- ──────────────────────────────────────────────────────────────────────
-- REVIEWS: booking_id polymorphisch machen
-- ──────────────────────────────────────────────────────────────────────
-- Bidirektionale Miet-Bewertungen (tenant_to_provider / provider_to_tenant)
-- referenzieren rental_bookings.id — nicht bookings.id.
-- Ein evtl. vorhandener FK auf bookings(id) würde diese Inserts blocken.
-- Integrität wird stattdessen in der API-Schicht geprüft
-- (src/app/api/reviews/rental/route.ts validiert die Buchung vor Insert).
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_booking_id_fkey;
