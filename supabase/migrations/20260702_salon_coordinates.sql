-- ──────────────────────────────────────────────────────────────────────
-- SALON-KOORDINATEN für die interaktive Stuhl-Karte (/karte)
-- ──────────────────────────────────────────────────────────────────────
-- Phase 1: Karte nutzt Stadt-Zentroide aus src/lib/geo/city-coords.ts.
-- Phase 2: Sobald latitude/longitude gepflegt sind (Geocoding beim
--          Salon-Onboarding), zeigt die Karte exakte Pin-Positionen.
-- ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.salons
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);

-- Index für Bounding-Box-Abfragen (Karte lädt nur sichtbaren Ausschnitt)
CREATE INDEX IF NOT EXISTS salons_coordinates_idx
  ON public.salons (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
