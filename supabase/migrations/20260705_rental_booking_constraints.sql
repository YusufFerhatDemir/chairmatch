-- Rental-Booking-Härtung (Review-Findings aus dem Rental-Payment-Flow):
-- 1. Doppelbuchungs-Race: App-seitiger Overlap-Check (SELECT→INSERT) ist nicht
--    atomar — zwei parallele Requests konnten denselben Zeitraum doppelt buchen.
--    → DB-seitiger EXCLUDE-Constraint (btree_gist) als harte Wahrheit.
-- 2. Status 'active' fehlte im Live-CHECK rental_bookings_status_check —
--    der Payout-Cron hätte den Übergang confirmed→active still verloren.
-- 3. provider_stripe_accounts.user_id war nicht UNIQUE — Insert-Race hätte
--    zwei Connect-Accounts pro Anbieter erlaubt.
-- 4. Backstop gegen doppelte succeeded-Miet-Transaktionen (Re-Payment-Race):
--    max. EINE succeeded chair/opraum-Transaktion pro rental_id.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Status-CHECK um 'active' erweitern (laufende Miete nach Mietbeginn)
ALTER TABLE rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_status_check;
ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_status_check
  CHECK (status IN ('pending', 'confirmed', 'active', 'cancelled', 'completed'));

-- Harter Doppelbuchungs-Schutz: kein Datums-Overlap pro Equipment,
-- solange die Buchung nicht storniert/abgeschlossen ist.
ALTER TABLE rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_no_overlap;
ALTER TABLE rental_bookings ADD CONSTRAINT rental_bookings_no_overlap
  EXCLUDE USING gist (
    equipment_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'active'));

-- Ein Connect-Account pro Anbieter
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_stripe_user
  ON provider_stripe_accounts(user_id);

-- Max. eine erfolgreiche Miet-Transaktion pro Buchung (Doppel-Payout-Backstop)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pltx_rental_succeeded
  ON platform_transactions(rental_id)
  WHERE type IN ('chair_rental', 'opraum_rental') AND status = 'succeeded';
