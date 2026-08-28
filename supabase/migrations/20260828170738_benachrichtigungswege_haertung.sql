-- ══════════════════════════════════════════════════════════════════════════
-- Track 23 — Benachrichtigungswege haerten
-- ══════════════════════════════════════════════════════════════════════════
-- Erhoben am 28.08.2026 gegen pwdbjqfpgumyfktbfswg (Spaltensonde mit dem
-- oeffentlichen ANON-Key, ./scripts/schema-probe.sh; ausschliesslich lesend).
--
-- Betroffen sind die vier Wege, auf denen die Plattform einen Menschen
-- erreicht oder seinen Willen festhaelt: Push, In-App-Postfach, Warteliste,
-- Cookie-Einwilligung.
--
-- WAS DIESE MIGRATION TUT
--
--  1. `push_subscriptions.updated_at` nachtragen. Die Spalte fehlt live; der
--     Code hat sie geschrieben, und JEDER Anmeldeversuch ist daran
--     gescheitert. Der Produktivcode schreibt sie ab Track 23 nicht mehr —
--     die Spalte kommt trotzdem, weil „wann zuletzt gesehen" die Grundlage
--     jedes spaeteren Aufraeumens abgelaufener Abos ist.
--
--  2. `wait_list`: einen Arbiter-faehigen UNIQUE-Constraint nachlegen. Der
--     vorhandene Index ist ein AUSDRUCKS-Index auf `(email, COALESCE(city,''))`
--     und kommt fuer `ON CONFLICT (email, city)` nicht in Frage — daran ist
--     jeder einzelne Wartelisten-Eintrag gescheitert.
--
--  3. CHECK-Constraints fuer Regeln, die heute NUR im Route-Handler stehen.
--     Jede zaehlt vorher die verletzenden Zeilen und bricht mit klarer
--     Meldung ab, statt still zu aendern.
--
--  4. anon die Rechte auf allen vier Tabellen entziehen und die
--     `cookie_consents`-Policy „jeder darf einfuegen" fallen lassen.
--
-- WAS SIE NICHT TUT: sie loescht nichts und schreibt keine fachlichen Werte.
--
-- REIHENFOLGE: erst pruefen, dann aendern. Wer sie in Teilen einspielt,
-- riskiert einen Zustand, in dem der Constraint steht und die Daten nicht
-- dazu passen.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. push_subscriptions — fehlende Spalte, Endpunkt-Riegel
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Der Endpunkt ist eine URL, die der SERVER abruft. Die Positivliste der
-- Push-Dienste steht in src/lib/push-endpoint.ts und wird in der Route wie im
-- Sendepfad geprueft; hier steht der Teil davon, den die Datenbank selbst
-- halten kann. Ohne ihn haengt alles an einer einzigen Codestelle.
DO $$
DECLARE
  verletzer bigint;
BEGIN
  SELECT count(*) INTO verletzer
  FROM public.push_subscriptions
  WHERE endpoint IS NULL OR endpoint NOT LIKE 'https://%';

  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'push_subscriptions: % Zeile(n) mit einem Endpunkt, der nicht mit https:// beginnt. Erst pruefen und bereinigen, dann diese Migration erneut einspielen.',
      verletzer;
  END IF;
END $$;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_https_chk;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_endpoint_https_chk
  CHECK (endpoint LIKE 'https://%');

DO $$
DECLARE
  verletzer bigint;
BEGIN
  SELECT count(*) INTO verletzer
  FROM public.push_subscriptions
  WHERE coalesce(p256dh, '') = '' OR coalesce(auth, '') = '';

  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'push_subscriptions: % Zeile(n) ohne p256dh oder auth. Ohne beide ist eine Verschluesselung nach RFC 8291 nicht moeglich — die Zeilen sind wertlos und gehoeren geloescht.',
      verletzer;
  END IF;
END $$;

ALTER TABLE public.push_subscriptions
  DROP CONSTRAINT IF EXISTS push_subscriptions_keys_vorhanden_chk;
ALTER TABLE public.push_subscriptions
  ADD CONSTRAINT push_subscriptions_keys_vorhanden_chk
  CHECK (coalesce(p256dh, '') <> '' AND coalesce(auth, '') <> '');

-- Sucht die Sendeschleife (`… .eq('user_id', …)`) und das Aufraeumen bei der
-- Konto-Loeschung. Der bestehende idx_push_user deckt das ab; hier nur zur
-- Sicherheit, falls er live fehlt.
CREATE INDEX IF NOT EXISTS idx_push_user ON public.push_subscriptions(user_id);

-- ══════════════════════════════════════════════════════════════════════
-- 2. wait_list — ein Arbiter-faehiger UNIQUE-Constraint
-- ══════════════════════════════════════════════════════════════════════
-- Der bestehende Ausdrucks-Index bleibt: er erzwingt schon heute genau das
-- Richtige (eine Adresse je Stadt, NULL und '' als dasselbe). Er kann nur
-- kein Arbiter fuer ON CONFLICT sein.
--
-- `NULLS NOT DISTINCT` gibt es ab PostgreSQL 15. Ohne das waeren zwei Zeilen
-- (adresse, NULL) beide zulaessig, und der Constraint wuerde genau den Fall
-- nicht abdecken, der in der Warteliste der haeufigste ist: „irgendeine
-- Stadt".
DO $$
DECLARE
  verletzer bigint;
BEGIN
  IF current_setting('server_version_num')::int < 150000 THEN
    RAISE NOTICE 'wait_list: PostgreSQL < 15, UNIQUE NULLS NOT DISTINCT nicht verfuegbar — der Ausdrucks-Index bleibt die einzige Absicherung.';
    RETURN;
  END IF;

  SELECT count(*) INTO verletzer FROM (
    SELECT email, city FROM public.wait_list
    GROUP BY email, city HAVING count(*) > 1
  ) d;

  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'wait_list: % doppelte (email, city)-Kombination(en). Erst zusammenfuehren, dann diese Migration erneut einspielen.',
      verletzer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'wait_list_email_city_key'
      AND conrelid = 'public.wait_list'::regclass
  ) THEN
    EXECUTE 'ALTER TABLE public.wait_list
             ADD CONSTRAINT wait_list_email_city_key
             UNIQUE NULLS NOT DISTINCT (email, city)';
  END IF;
END $$;

-- Die Route schreibt ausschliesslich klein und ohne Rand. Steht die Regel nur
-- dort, entstehen bei jedem zweiten Schreibweg Doubletten, die der UNIQUE
-- nicht sieht ("A@B.de" und "a@b.de" sind fuer ihn zwei Adressen).
DO $$
DECLARE
  verletzer bigint;
BEGIN
  SELECT count(*) INTO verletzer
  FROM public.wait_list
  WHERE email <> lower(btrim(email)) OR position('@' in email) = 0;

  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'wait_list: % Zeile(n) mit gross geschriebener, umrandeter oder unvollstaendiger E-Mail-Adresse. Erst normalisieren (lower(btrim(email))), dann erneut einspielen.',
      verletzer;
  END IF;
END $$;

ALTER TABLE public.wait_list DROP CONSTRAINT IF EXISTS wait_list_email_normalisiert_chk;
ALTER TABLE public.wait_list
  ADD CONSTRAINT wait_list_email_normalisiert_chk
  CHECK (email = lower(btrim(email)) AND position('@' in email) > 1);

-- `city = ''` und `city IS NULL` sind fachlich dasselbe („keine Stadt"). Zwei
-- Schreibweisen fuer denselben Sachverhalt sind der Anfang jeder Doublette.
DO $$
DECLARE
  verletzer bigint;
BEGIN
  SELECT count(*) INTO verletzer FROM public.wait_list WHERE city = '';
  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'wait_list: % Zeile(n) mit leerer Stadt-Zeichenkette. Auf NULL setzen, dann erneut einspielen.',
      verletzer;
  END IF;
END $$;

ALTER TABLE public.wait_list DROP CONSTRAINT IF EXISTS wait_list_city_nicht_leer_chk;
ALTER TABLE public.wait_list
  ADD CONSTRAINT wait_list_city_nicht_leer_chk
  CHECK (city IS NULL OR btrim(city) <> '');

-- ══════════════════════════════════════════════════════════════════════
-- 3. cookie_consents — Nachweis, nicht Sammelbecken
-- ══════════════════════════════════════════════════════════════════════
-- Die Policy „FOR INSERT WITH CHECK (true)" erlaubt jeder Rolle mit einem
-- INSERT-GRANT, Einwilligungen fuer eine beliebige `session_id` einzutragen.
-- Heute traegt sie nichts, weil anon auf der Tabelle gar kein GRANT hat
-- (Sonde: 42501). Sie ist damit genau die Sorte Riegel, die erst auffaellt,
-- wenn jemand ein GRANT nachzieht. Der Schreibweg ist die Route, und die
-- laeuft mit service_role — service_role umgeht RLS ohnehin.
DROP POLICY IF EXISTS "cookie_consents_insert_anon" ON public.cookie_consents;

DO $$
DECLARE
  verletzer bigint;
BEGIN
  SELECT count(*) INTO verletzer
  FROM public.cookie_consents
  WHERE choices IS NULL
     OR jsonb_typeof(choices) <> 'object'
     OR NOT (choices ? 'necessary' AND choices ? 'statistics' AND choices ? 'marketing');

  IF verletzer > 0 THEN
    RAISE EXCEPTION
      'cookie_consents: % Zeile(n), deren choices nicht alle drei Kategorien fuehren. Ein Nachweis, dem eine Kategorie fehlt, ist keiner — erst ergaenzen, dann erneut einspielen.',
      verletzer;
  END IF;
END $$;

ALTER TABLE public.cookie_consents DROP CONSTRAINT IF EXISTS cookie_consents_choices_vollstaendig_chk;
ALTER TABLE public.cookie_consents
  ADD CONSTRAINT cookie_consents_choices_vollstaendig_chk
  CHECK (
    jsonb_typeof(choices) = 'object'
    AND choices ? 'necessary'
    AND choices ? 'statistics'
    AND choices ? 'marketing'
  );

-- ══════════════════════════════════════════════════════════════════════
-- 4. anon verliert jedes Recht auf den Zustellwegen
-- ══════════════════════════════════════════════════════════════════════
-- Dieselbe Linie wie 20260827_anon_grant_lockdown.sql. Heute antwortet keine
-- der vier Tabellen anon mit Daten (Sonde: alle 42501), aber ein GRANT ist
-- schnell nachgezogen, und was in ihnen steht, ist eindeutig:
--
--   push_subscriptions  Geraete-Endpunkt je Konto — ein Zustellziel.
--   notification_log    Postfach: Termine, Betraege, Bestellnummern.
--   wait_list           E-Mail-Adressen mit Wunschstadt.
--   cookie_consents     Einwilligungsnachweise.
--
-- KEIN Client liest eine davon: alle vier laufen ueber getSupabaseAdmin()
-- (service_role), und service_role ist von REVOKE ... FROM anon nicht
-- betroffen.
DO $$
DECLARE
  t text;
  gesperrt text[] := ARRAY[
    'push_subscriptions',
    'notification_log',
    'wait_list',
    'cookie_consents'
  ];
BEGIN
  FOREACH t IN ARRAY gesperrt LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ══════════════════════════════════════════════════════════════════════════
-- GEGENPROBE nach dem Einspielen (lesend, ohne Nebenwirkung)
-- ══════════════════════════════════════════════════════════════════════════
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'push_subscriptions' AND column_name = 'updated_at';
--
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--  WHERE conrelid IN ('public.push_subscriptions'::regclass,
--                     'public.wait_list'::regclass,
--                     'public.cookie_consents'::regclass)
--    AND contype IN ('c','u') ORDER BY conrelid, conname;
--
-- SELECT relname, has_table_privilege('anon', oid, 'SELECT') AS anon_select,
--        has_table_privilege('anon', oid, 'INSERT') AS anon_insert
--   FROM pg_class
--  WHERE relname IN ('push_subscriptions','notification_log','wait_list','cookie_consents');
