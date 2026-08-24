-- ──────────────────────────────────────────────────────────────────────
-- ChairMatch — Schema-Drift schliessen (Stand 2026-08-24)
-- ──────────────────────────────────────────────────────────────────────
-- Befund: alle 317 Spaltenreferenzen aus `src/` wurden per PostgREST-Probe
-- gegen `pwdbjqfpgumyfktbfswg` geprueft (?select=<spalte> antwortet mit
-- 42703, wenn die Spalte fehlt — und zwar vor der Rechtepruefung, deshalb
-- reicht der ANON-Key). 29 Referenzen zeigten auf Spalten, die es live nicht
-- gibt.
--
-- Diese Datei behandelt die drei Faelle, in denen die Spalte tatsaechlich
-- fehlt und der Code sie braucht. Die uebrigen Faelle waren falsche
-- Spaltennamen im Code und wurden dort korrigiert (conversations.updated_at
-- → last_message_at, error_logs.level → severity, profiles.first_name →
-- aus full_name abgeleitet).
--
-- ACHTUNG: `CREATE TABLE IF NOT EXISTS` ist auf einer bestehenden Tabelle
-- wirkungslos. Genau daran ist `visit_logs` gescheitert: die Migration
-- 20260309 beschreibt die richtigen Spalten, die Tabelle existierte aber
-- schon vorher in einer anderen Form — und blieb es. Deshalb hier
-- ausschliesslich ALTER … ADD COLUMN IF NOT EXISTS.
--
-- Muss im Supabase-SQL-Editor angewendet werden.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ══════════════════════════════════════════════════════════════════════
-- 1. visit_logs
-- ══════════════════════════════════════════════════════════════════════
-- Live vorhanden: id, page, user_agent, created_at
-- Der Code schreibt: path, ip, country, region, city, user_agent
--
-- Folge bis 2026-08-24: JEDER Insert lief in 42703. /api/analytics/visit hat
-- den Fehler nicht ausgewertet und trotzdem {ok:true} geantwortet — die
-- Besucherstatistik war seit Bestehen leer, und die Admin-Seite zeigte
-- "Noch keine Besucherdaten" statt eines Fehlers.

ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS path    text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS ip      text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS region  text;
ALTER TABLE public.visit_logs ADD COLUMN IF NOT EXISTS city    text;

-- Bestand uebernehmen: `page` war die alte Fassung von `path`.
UPDATE public.visit_logs SET path = page WHERE path IS NULL AND page IS NOT NULL;

CREATE INDEX IF NOT EXISTS visit_logs_path_idx    ON public.visit_logs(path);
CREATE INDEX IF NOT EXISTS visit_logs_country_idx ON public.visit_logs(country);

-- DSGVO: die IP ist personenbezogen. Der Masterplan sieht 90 Tage Aufbewahrung
-- vor; das gehoert in einen geplanten Job, nicht in diese Migration:
--   UPDATE public.visit_logs SET ip = NULL WHERE created_at < now() - interval '90 days';

-- ══════════════════════════════════════════════════════════════════════
-- 2. salon_images
-- ══════════════════════════════════════════════════════════════════════
-- Live vorhanden: id, salon_id, url, image_type, sort_order, created_at
-- Der Code schreibt zusaetzlich: storage_path, bucket
--
-- Ohne die beiden Spalten scheitert der Insert in /api/upload mit 42703. Der
-- Handler raeumt die Datei daraufhin korrekt wieder aus dem Storage — der
-- Bild-Upload war also nicht halb kaputt, sondern vollstaendig blockiert.
-- Gebraucht werden sie fuers Loeschen: ohne `bucket`/`storage_path` kann
-- /api/upload/[id] die Datei im Storage nicht mehr finden.

ALTER TABLE public.salon_images ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.salon_images ADD COLUMN IF NOT EXISTS bucket       text;

-- ══════════════════════════════════════════════════════════════════════
-- 3. services.slug
-- ══════════════════════════════════════════════════════════════════════
-- `/listings/[slug]` sucht zuerst per `slug` und faellt auf `id` zurueck;
-- sitemap.ts liest `id, slug, created_at`. Ohne die Spalte scheiterte die
-- Sitemap-Abfrage komplett (42703) — es standen also GAR KEINE Listings in
-- der Sitemap, auch nicht mit ihrer ID.
--
-- Bewusst NULLABLE und ohne Backfill: ein aus dem Namen erzeugter Slug waere
-- geraten, und ein falscher Slug ist eine kaputte URL. Der Code kommt mit
-- NULL zurecht (`s.slug || s.id`). Das Befuellen ist eine inhaltliche
-- Entscheidung und gehoert in einen eigenen Schritt.

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_services_slug
  ON public.services(slug) WHERE slug IS NOT NULL;

COMMIT;
