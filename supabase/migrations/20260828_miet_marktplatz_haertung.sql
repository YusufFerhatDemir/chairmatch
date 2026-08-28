-- ──────────────────────────────────────────────────────────────────────
-- TRACK 22 — Miet-Marktplatz: Haertung auf Datenbankebene
-- ──────────────────────────────────────────────────────────────────────
-- Drei Themen, die im Anwendungscode nicht abschliessend zu loesen sind:
--
--   1. `publish_review_pair()` sucht Miet-Buchungen in `bookings` statt in
--      `rental_bookings` — die 14-Tage-Freischaltung ist nie gelaufen.
--   2. `rental_equipment` ist mit dem oeffentlichen ANON-Key vollstaendig
--      lesbar, einschliesslich unveroeffentlichter Entwuerfe und der
--      Inserate gesperrter Anbieter.
--   3. Regeln, die heute nur in Route-Handlern stehen (kein Gratis-Inserat,
--      Enddatum nicht vor Startdatum, bekannte Statuswerte) haben in der
--      Datenbank kein Gegenstueck.
--
-- ACHTUNG: muss im Supabase-SQL-Editor angewendet werden. Es gibt in diesem
-- Projekt keinen Migrations-Runner; diese Datei ist committet, NICHT
-- ausgefuehrt. Bis dahin gilt fuer Punkt 1 der Anwendungs-Fix in
-- src/app/api/cron/publish-reviews/route.ts (der braucht keine Migration),
-- fuer Punkt 2 und 3 nichts.
--
-- Abschnitt 3 ist bewusst so geschrieben, dass er bei Altdaten, die eine
-- neue Regel verletzen, mit einer klaren Meldung ABBRICHT statt Zeilen
-- stillschweigend zu veraendern. Was zu tun ist, steht dann in der Meldung.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. publish_review_pair(): polymorphe Aufloesung des Buchungsendes
-- ══════════════════════════════════════════════════════════════════════
-- Die Funktion stammt aus 20260515_bidirectional_reviews und liest das
-- Buchungsende ausschliesslich aus `public.bookings`. Zwei Monate spaeter
-- hat 20260702_reviews_rental_bookings den Fremdschluessel
-- `reviews_booking_id_fkey` ABSICHTLICH entfernt, damit Miet-Bewertungen
-- eine `rental_bookings.id` in `booking_id` tragen koennen. Die Funktion
-- wurde nicht mitgezogen.
--
-- Fuer jede Miet-Bewertung findet der SELECT deshalb keine Zeile,
-- `v_booking_ended_at` bleibt NULL, `v_days_since_booking` wird NULL — und
-- `IF NULL >= 14 THEN` ist nicht wahr. Fall 2 (einseitige Bewertung nach 14
-- Tagen freischalten) ist seitdem tot. Fall 1 (beide Seiten haben bewertet)
-- funktionierte weiter, weil er `bookings` gar nicht braucht; genau deshalb
-- ist der Defekt nie aufgefallen.
--
-- Sichtbar war er auch sonst nicht: die Funktion gibt VOID zurueck und
-- meldet keinen Fehler, wenn sie nichts findet. Der naechtliche Cron hat sie
-- gerufen, `error: null` bekommen und `published++` gezaehlt.
--
-- Zusaetzlich repariert: `EXTRACT(DAY FROM ...)` liefert bei einem Intervall
-- nur die Tageskomponente. Fuer die Differenz zweier Zeitstempel ist das
-- richtig, aber es haengt an einer Eigenschaft des Ausdrucks statt an der
-- Absicht. `>= interval '14 days'` sagt dasselbe und bleibt richtig, wenn
-- jemand die Herkunft des Werts aendert.
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
BEGIN
  SELECT COUNT(*) INTO v_tenant_review_count
  FROM public.reviews
  WHERE booking_id = p_booking_id AND review_type = 'tenant_to_provider';

  SELECT COUNT(*) INTO v_provider_review_count
  FROM public.reviews
  WHERE booking_id = p_booking_id AND review_type = 'provider_to_tenant';

  -- Fall 1: beide Seiten haben bewertet -> beide freischalten.
  -- Braucht das Buchungsende nicht und lief deshalb schon immer.
  IF v_tenant_review_count > 0 AND v_provider_review_count > 0 THEN
    UPDATE public.reviews
    SET published = TRUE,
        visible_at = COALESCE(visible_at, NOW())
    WHERE booking_id = p_booking_id
      AND review_type IN ('tenant_to_provider', 'provider_to_tenant')
      AND published = FALSE;
    RETURN;
  END IF;

  -- `booking_id` ist polymorph: Termin-Bewertungen zeigen auf `bookings`,
  -- Miet-Bewertungen auf `rental_bookings`. Beide Tabellen fragen, in dieser
  -- Reihenfolge — eine ID kann nur in einer von beiden stehen.
  SELECT COALESCE(end_at, updated_at, created_at) INTO v_booking_ended_at
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking_ended_at IS NULL THEN
    -- `rental_bookings.end_date` ist ein DATE (Berliner Kalendertag). Der
    -- Mietzeitraum ist einschliesslich des Endtags, das Ende liegt also am
    -- Folgetag um 00:00 — deshalb `+ 1`.
    SELECT COALESCE((end_date + 1)::timestamptz, updated_at, created_at)
      INTO v_booking_ended_at
    FROM public.rental_bookings
    WHERE id = p_booking_id;
  END IF;

  -- Kein Buchungsende auffindbar: nichts freischalten. Ein NULL-Vergleich
  -- wuerde hier stillschweigend dasselbe tun; ausgeschrieben ist es eine
  -- Entscheidung statt eines Nebeneffekts.
  IF v_booking_ended_at IS NULL THEN
    RETURN;
  END IF;

  -- Fall 2: nur eine Seite, aber 14 Tage rum -> diese eine freischalten.
  IF NOW() - v_booking_ended_at >= INTERVAL '14 days' THEN
    UPDATE public.reviews
    SET published = TRUE,
        visible_at = COALESCE(visible_at, NOW())
    WHERE booking_id = p_booking_id
      AND review_type IN ('tenant_to_provider', 'provider_to_tenant')
      AND published = FALSE;
  END IF;

  -- customer_to_salon ist immer sofort published (kein Double-Blind)
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2. rental_equipment: anon und authenticated verlieren den Tabellenzugriff
-- ══════════════════════════════════════════════════════════════════════
-- Befund (Live-Sonde 2026-08-28, nur mit dem oeffentlichen ANON-Key):
--
--   GET /rest/v1/rental_equipment?select=*  ->  200, 5 Zeilen
--
-- Die Policy stammt aus 20260819_rls_close_gaps_v2 und lautet dort
-- `FOR SELECT TO anon, authenticated USING (true)`. Ihre Begruendung steht
-- im Kopf derselben Datei: „Der Browser-Client liest NUR rental_equipment,
-- salons und rental_bookings". Das stimmt seit Track 7 nicht mehr. Genau
-- weil `salons` fuer `anon` an `permission denied for function
-- is_admin_or_super` scheitert, wurde die Inseratssuche damals auf
-- /api/rental-listings umgestellt — serverseitig, mit dem Service-Client.
-- Heute liest KEINE Client-Datei mehr direkt aus der Tabelle; der ANON-Key
-- wird im Browser nur noch fuer `supabase.auth.*` benutzt
-- (src/app/(public)/konto/page.tsx ist die einzige Datei, die ihn importiert).
--
-- Was `USING (true)` offenlegt, ist mehr als der oeffentliche Katalog:
--
--   * Unveroeffentlichte Entwuerfe. `ensurePrimaryListing()` legt fuer jeden
--     Vermieter, der den Inserats-Editor oeffnet, eine Zeile mit
--     `is_available = false` an. Jeder Preis, den er dort eintippt, bevor er
--     online geht, steht ab dem Speichern oeffentlich unter /rest/v1.
--   * Inserate gesperrter und nie freigeschalteter Anbieter. Track 15 hat
--     `salons.is_active` auf die Geldstrecken gelegt, Track 20 auf die
--     oeffentliche Salonseite (404). /api/rental-listings filtert entsprechend
--     — die Tabelle selbst filtert nichts. Der Riegel war ueber PostgREST in
--     einem Request zu umgehen.
--
-- Warum REVOKE und keine engere Policy: die Bedingung „Salon ist
-- freigeschaltet" steht in `salons`, und eine Policy-Unterabfrage dorthin
-- laeuft fuer `anon` in genau das `is_admin_or_super`-Recht, an dem schon
-- der urspruengliche Join gescheitert ist. Eine Spalte in
-- `rental_equipment` zu denormalisieren waere ein zweiter Wahrheitsort fuer
-- den Sperrzustand. Die oeffentliche Sicht hat mit /api/rental-listings und
-- /api/rental-equipment/[id] bereits zwei Routen, die beide Filter korrekt
-- anwenden — die Tabelle direkt lesbar zu lassen, umgeht nur sie.
--
-- service_role ist nicht betroffen (haelt die Rechte unabhaengig, umgeht RLS
-- per BYPASSRLS). Jeder Lesepfad im Code laeuft ueber getSupabaseAdmin().
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'rental_equipment' AND c.relkind = 'r'
  ) THEN
    REVOKE ALL ON TABLE public.rental_equipment FROM anon, authenticated;
    ALTER TABLE public.rental_equipment ENABLE ROW LEVEL SECURITY;
    -- Die Policy ohne GRANT stehen zu lassen waere Dekoration, die etwas
    -- anderes suggeriert als sie tut.
    DROP POLICY IF EXISTS "rental_equipment_public_read" ON public.rental_equipment;
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. CHECK-Constraints: Regeln, die bisher nur im Route-Handler standen
-- ══════════════════════════════════════════════════════════════════════
-- Keine dieser Regeln ist neu. Sie stehen alle im Anwendungscode, teils an
-- mehreren Stellen — und jede Stelle, die sie vergisst, schreibt Zeilen, die
-- die anderen Stellen nicht mehr verstehen. `rental_bookings` und
-- `rental_equipment` sind live entstanden und haben deshalb ausser dem
-- Status-CHECK aus 20260705 nichts davon.
--
-- Vorab wird gezaehlt, wie viele Zeilen die jeweilige Regel heute verletzen.
-- Gibt es welche, bricht die Migration ab: was da liegt, ist eine
-- fachliche Frage und keine, die ein UPDATE hier beantworten darf.

-- ── 3a. rental_bookings ──────────────────────────────────────────────
DO $$
DECLARE
  v_bad INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'rental_bookings' AND c.relkind = 'r'
  ) THEN
    RAISE NOTICE 'rental_bookings existiert nicht — Abschnitt 3a uebersprungen';
    RETURN;
  END IF;

  -- (1) Enddatum nicht vor Startdatum.
  --
  -- Der EXCLUDE-Constraint `rental_bookings_no_overlap` aus 20260705 baut
  -- `daterange(start_date, end_date, '[]')` — bei end < start wirft Postgres
  -- dort „range lower bound must be less than or equal to upper bound". Das
  -- traegt aber nur fuer Zeilen, die unter die WHERE-Bedingung des
  -- Constraints fallen (status IN pending/confirmed/active). Eine stornierte
  -- oder abgeschlossene Buchung mit verdrehtem Zeitraum geht durch, und
  -- `rentalDays()` rechnet daraus eine negative Mietdauer.
  SELECT COUNT(*) INTO v_bad FROM public.rental_bookings WHERE end_date < start_date;
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'rental_bookings: % Zeile(n) mit end_date < start_date. Bitte zuerst klaeren (Zeitraum korrigieren oder Buchung stornieren) — dieser Constraint kann sie nicht setzen.', v_bad;
  END IF;
  ALTER TABLE public.rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_date_order;
  ALTER TABLE public.rental_bookings ADD CONSTRAINT rental_bookings_date_order
    CHECK (end_date >= start_date);

  -- (2) Kein negativer Betrag.
  SELECT COUNT(*) INTO v_bad FROM public.rental_bookings WHERE total_cents < 0;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'rental_bookings: % Zeile(n) mit total_cents < 0 — bitte zuerst klaeren.', v_bad;
  END IF;
  ALTER TABLE public.rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_total_nonnegative;
  ALTER TABLE public.rental_bookings ADD CONSTRAINT rental_bookings_total_nonnegative
    CHECK (total_cents IS NULL OR total_cents >= 0);

  -- (3) Bekannte Zahlungsstatus.
  --
  -- Der Buchungsstatus hat seinen CHECK seit 20260705, der Zahlungsstatus
  -- nicht — dabei entscheidet genau er ueber die Auszahlung
  -- (cron/rental-payouts), ueber die Erstattung beim Storno und seit Track 22
  -- darueber, was in /api/me/rental-revenue als Einnahme zaehlt. Ein Tippfehler
  -- in einem dieser Pfade legt eine Zahlung in einen Zustand, den keiner der
  -- anderen kennt — und keiner von ihnen faellt dabei auf.
  SELECT COUNT(*) INTO v_bad FROM public.rental_bookings
   WHERE payment_status IS NOT NULL
     AND payment_status NOT IN ('unpaid', 'pending', 'paid', 'refunded', 'failed');
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'rental_bookings: % Zeile(n) mit unbekanntem payment_status — bitte die Werte pruefen, bevor der CHECK sie festschreibt.', v_bad;
  END IF;
  ALTER TABLE public.rental_bookings DROP CONSTRAINT IF EXISTS rental_bookings_payment_status_check;
  ALTER TABLE public.rental_bookings ADD CONSTRAINT rental_bookings_payment_status_check
    CHECK (payment_status IS NULL
           OR payment_status IN ('unpaid', 'pending', 'paid', 'refunded', 'failed'));
END $$;

-- ── 3b. rental_equipment ─────────────────────────────────────────────
DO $$
DECLARE
  v_bad INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'rental_equipment' AND c.relkind = 'r'
  ) THEN
    RAISE NOTICE 'rental_equipment existiert nicht — Abschnitt 3b uebersprungen';
    RETURN;
  END IF;

  -- (1) Bekannte Objektarten.
  --
  -- Der Typ ist keine Beschriftung: der Stripe-Webhook liest ihn, um die
  -- Provision zu bestimmen (`type === 'opraum'` -> 8 %, sonst 10 %). Ein
  -- unbekannter Wert faellt dort in den 10-%-Zweig, ohne dass jemand
  -- widerspricht. Live-Stand 2026-08-28: stuhl, liege, raum, opraum — genau
  -- die vier, die auch die Zod-Schemata kennen.
  SELECT COUNT(*) INTO v_bad FROM public.rental_equipment
   WHERE type IS NOT NULL AND type NOT IN ('stuhl', 'liege', 'raum', 'opraum');
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'rental_equipment: % Zeile(n) mit unbekanntem type — bitte pruefen (der Provisionssatz haengt daran).', v_bad;
  END IF;
  ALTER TABLE public.rental_equipment DROP CONSTRAINT IF EXISTS rental_equipment_type_check;
  ALTER TABLE public.rental_equipment ADD CONSTRAINT rental_equipment_type_check
    CHECK (type IS NULL OR type IN ('stuhl', 'liege', 'raum', 'opraum'));

  -- (2) Keine negativen Preise.
  SELECT COUNT(*) INTO v_bad FROM public.rental_equipment
   WHERE COALESCE(price_per_day_cents, 0)   < 0
      OR COALESCE(price_per_hour_cents, 0)  < 0
      OR COALESCE(price_per_week_cents, 0)  < 0
      OR COALESCE(price_per_month_cents, 0) < 0;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'rental_equipment: % Zeile(n) mit negativem Preis — bitte zuerst klaeren.', v_bad;
  END IF;
  ALTER TABLE public.rental_equipment DROP CONSTRAINT IF EXISTS rental_equipment_prices_nonnegative;
  ALTER TABLE public.rental_equipment ADD CONSTRAINT rental_equipment_prices_nonnegative
    CHECK (COALESCE(price_per_day_cents, 0)   >= 0
       AND COALESCE(price_per_hour_cents, 0)  >= 0
       AND COALESCE(price_per_week_cents, 0)  >= 0
       AND COALESCE(price_per_month_cents, 0) >= 0);

  -- (3) Kein Gratis-Inserat online.
  --
  -- Diese Regel steht dreimal im Code — in POST /api/rental-equipment, in
  -- PATCH /api/rental-equipment/[id] und in PATCH /api/me/listing — jedes Mal
  -- mit derselben Begruendung („sonst koennte jemand es fuer 0 € buchen").
  -- In der Datenbank stand sie nirgends. Sie gehoert dorthin, wo sie fuer
  -- jeden kuenftigen Schreibpfad gilt und nicht fuer die drei, an die
  -- jemand gedacht hat.
  --
  -- /api/rental-bookings faengt einen Nullpreis heute erst NACH der
  -- Verfuegbarkeits- und Overlap-Pruefung ab (422 „Ungueltiger Mietpreis") —
  -- das Inserat ist bis dahin oeffentlich als buchbar gelistet.
  SELECT COUNT(*) INTO v_bad FROM public.rental_equipment
   WHERE is_available IS TRUE AND COALESCE(price_per_day_cents, 0) <= 0;
  IF v_bad > 0 THEN
    RAISE EXCEPTION
      'rental_equipment: % Zeile(n) sind online (is_available = true) ohne Tagespreis. Bitte Preis nachtragen oder offline nehmen — welches von beidem gilt, ist eine Entscheidung des Anbieters.', v_bad;
  END IF;
  ALTER TABLE public.rental_equipment DROP CONSTRAINT IF EXISTS rental_equipment_online_needs_price;
  ALTER TABLE public.rental_equipment ADD CONSTRAINT rental_equipment_online_needs_price
    CHECK (is_available IS NOT TRUE OR COALESCE(price_per_day_cents, 0) > 0);

  -- (4) Verfuegbarkeitsfenster in der richtigen Reihenfolge.
  SELECT COUNT(*) INTO v_bad FROM public.rental_equipment
   WHERE available_from IS NOT NULL AND available_to IS NOT NULL
     AND available_to <= available_from;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'rental_equipment: % Zeile(n) mit available_to <= available_from — bitte zuerst klaeren.', v_bad;
  END IF;
  ALTER TABLE public.rental_equipment DROP CONSTRAINT IF EXISTS rental_equipment_time_window;
  ALTER TABLE public.rental_equipment ADD CONSTRAINT rental_equipment_time_window
    CHECK (available_from IS NULL OR available_to IS NULL OR available_to > available_from);
END $$;

COMMIT;
