-- Rental Payment Flow: Stuhl-Miete end-to-end bezahlbar machen
-- 1. rental_bookings bekommt Payment-Tracking (analog zu bookings)
-- 2. payments bekommt source_type/source_id/user_id — der Stripe-Webhook
--    inserted diese Spalten seit 20260317, sie existierten aber nie in Prod:
--    jeder payments-Insert des Webhooks schlug still fehl (supabase-js gibt
--    Fehler zurueck statt zu werfen, der Webhook prueft ihn nicht).
-- Migration ist idempotent (ADD COLUMN IF NOT EXISTS).

-- --- rental_bookings: Payment-Tracking ---
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent TEXT;
ALTER TABLE rental_bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- payment_status-Werte konsistent zu bookings.payment_status halten
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_bookings_payment_status_check'
  ) THEN
    ALTER TABLE rental_bookings
      ADD CONSTRAINT rental_bookings_payment_status_check
      CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rental_bookings_equipment_dates
  ON rental_bookings(equipment_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_renter
  ON rental_bookings(renter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_payment_intent
  ON rental_bookings(stripe_payment_intent);

-- --- payments: Spalten nachziehen, die der Webhook bereits nutzt ---
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source_id UUID;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS user_id UUID;

CREATE INDEX IF NOT EXISTS idx_payments_source ON payments(source_type, source_id);
