-- ──────────────────────────────────────────────────────────────────────
-- Zwei offene Schreibtueren fuer `anon` schliessen
-- ──────────────────────────────────────────────────────────────────────
-- ANLASS
--
-- Supabase meldet Tabellen im Schema `public` ohne Row Level Security. Die
-- Meldung nennt keine Tabelle. Statt zu raten, ist der Perimeter am
-- 2026-09-10 gegen die laufende Instanz GEMESSEN worden — 47 Tabellen, nur
-- mit dem ANON-Key, reproduzierbar ueber scripts/anon-perimeter-probe.sh.
--
-- ══════════════════════════════════════════════════════════════════════
-- BEFUND
-- ══════════════════════════════════════════════════════════════════════
--
-- LESEN ist dicht. 46 von 47 Tabellen antworten `anon` mit 401. Die
-- einzige Ausnahme ist `categories` (Kategoriekatalog, steht ohnehin auf
-- jeder oeffentlichen Seite, keine personenbezogenen Daten) — das ist eine
-- bewusste Entscheidung und bleibt.
--
-- SCHREIBEN ist es NICHT. Zwei Tabellen nehmen einen anonymen INSERT an
-- und antworten mit 201:
--
--   POST /rest/v1/submission_tickets  {}   → 201
--   POST /rest/v1/visit_logs          {}   → 201
--
-- Die Rechtelage laesst sich am Verhalten ablesen: mit
-- `Prefer: return=representation` antwortet dieselbe Anfrage 42501
-- „permission denied" — PostgREST braucht dafuer zusaetzlich SELECT.
-- `anon` hat auf diesen beiden Tabellen also INSERT, aber kein SELECT und
-- kein DELETE. Wer etwas hineinschreibt, kann es nicht wieder herausholen —
-- und niemand sieht es, ausser ueber den Dienstschluessel.
--
-- ══════════════════════════════════════════════════════════════════════
-- WARUM DAS GEFAEHRLICH IST
-- ══════════════════════════════════════════════════════════════════════
--
-- `visit_logs` traegt laut Datenschutzerklaerung IP-Adresse, User-Agent und
-- Seitenpfad. Eine offene INSERT-Tuer heisst: jeder kann die Tabelle in
-- einer Nacht mit erfundenen Besuchen fuellen. Das kostet erst Speicher,
-- dann Glaubwuerdigkeit — die Besucherauswertung unter /admin/besucher
-- rechnet mit diesen Zeilen.
--
-- `submission_tickets` ist der Posteingang der Verwaltung
-- (/admin/tickets). Eine offene Tuer erzeugt dort Vorgaenge, die niemand
-- ausgeloest hat.
--
-- Beides ist dieselbe Klasse, die im Schwesterprojekt Alltagsengel am
-- 28.08.2026 geschlossen wurde („Anyone can submit lead inquiry" — es war
-- dort die einzige offene INSERT-Tuer des Schemas).
--
-- ══════════════════════════════════════════════════════════════════════
-- WARUM DAS REVOKE NICHTS KAPUTT MACHT
-- ══════════════════════════════════════════════════════════════════════
--
-- Ausgezaehlt am 2026-09-10: JEDER Zugriff der Anwendung auf diese beiden
-- Tabellen laeuft ueber `getSupabaseAdmin()`, also ueber den
-- Dienstschluessel, und der ignoriert GRANTs und RLS.
--
--   src/app/api/analytics/visit/route.ts      insert visit_logs
--   src/app/api/admin/mis/route.ts            select visit_logs
--   src/app/(admin)/admin/besucher/page.tsx   select visit_logs
--   src/app/api/admin/tickets/[id]/route.ts   update submission_tickets
--   src/app/(admin)/admin/tickets/page.tsx    select submission_tickets
--
-- Das anon-Recht ist reiner Ueberschuss: es wird von keiner Zeile Code
-- gebraucht. Der Schreibweg fuer die Besuchszaehlung bleibt
-- POST /api/analytics/visit — dort sitzen Rate-Limit und Pruefung, an einer
-- offenen Tabellentuer sitzt nichts davon.
--
-- ══════════════════════════════════════════════════════════════════════
-- REIHENFOLGE
-- ══════════════════════════════════════════════════════════════════════
--
-- Erst REVOKE, dann RLS. Umgekehrt waere `FORCE`/`ENABLE` ohne Policies
-- der wirksame Riegel und das GRANT bliebe als stille Altlast stehen —
-- sichtbar erst, wenn jemand spaeter eine permissive Policy anlegt.
--
-- Rollback: rollback/20260910_anon_insert_lockdown_rollback.sql
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

-- ── 1) Die gemessenen Tueren zu ──────────────────────────────────────
REVOKE ALL ON public.visit_logs         FROM anon;
REVOKE ALL ON public.submission_tickets FROM anon;

-- PUBLIC deckt jede kuenftige Rolle ab, auch eine, die es heute nicht gibt.
REVOKE ALL ON public.visit_logs         FROM PUBLIC;
REVOKE ALL ON public.submission_tickets FROM PUBLIC;

-- ── 2) RLS einschalten ───────────────────────────────────────────────
-- Der Dienstschluessel (`service_role`) umgeht RLS und bleibt unberuehrt;
-- die Anwendung merkt davon nichts. FORCE steht hier bewusst NICHT: es
-- wuerde auch den Tabelleneigentuemer den Policies unterwerfen, und diese
-- Migration soll genau eine Sache tun.
ALTER TABLE public.visit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_tickets ENABLE ROW LEVEL SECURITY;

-- ── 3) Keine Policy ──────────────────────────────────────────────────
-- Ohne Policy sieht und schreibt unter RLS niemand ausser `service_role`.
-- Das ist der gewollte Zustand: beide Tabellen werden ausschliesslich mit
-- dem Dienstschluessel bedient. Wer spaeter eine Verwaltungsrolle direkt
-- lesen lassen will, legt dafuer eine eigene Policy an — und zwar bewusst.

COMMENT ON TABLE public.visit_logs IS
  'Besuchsspur (IP, User-Agent, Pfad). Schreibweg ausschliesslich '
  'POST /api/analytics/visit mit dem Dienstschluessel. Seit 20260910 kein '
  'anon-Recht mehr — die INSERT-Tuer war offen und am 2026-09-10 mit 201 belegt.';

COMMENT ON TABLE public.submission_tickets IS
  'Posteingang der Verwaltung (/admin/tickets). Nur ueber den '
  'Dienstschluessel. Seit 20260910 kein anon-Recht mehr.';

COMMIT;

-- ══════════════════════════════════════════════════════════════════════
-- GEGENPROBE NACH DEM ANWENDEN
-- ══════════════════════════════════════════════════════════════════════
--
--   bash scripts/anon-perimeter-probe.sh
--
-- Erwartet: submission_tickets und visit_logs antworten auf POST mit 401
-- statt 201; `categories` bleibt bei GET 200; sonst aendert sich nichts.
--
-- AUFRAEUMEN, NUR MIT DEM DIENSTSCHLUESSEL MOEGLICH:
-- Die Messung vom 2026-09-10 hat je Tabelle EINE leere Zeile erzeugt
-- (POST mit `{}`). Sie sind ueber den anon-Key weder lesbar noch
-- loeschbar. Zu entfernen im SQL-Editor:
--
--   DELETE FROM public.visit_logs
--    WHERE ip IS NULL AND user_agent IS NULL AND path IS NULL;
--   DELETE FROM public.submission_tickets
--    WHERE created_at::date = DATE '2026-09-10' AND status IS NULL;
--
-- Vorher mit SELECT gegenpruefen — die Spaltennamen stammen aus
-- src/test/live-schema.ts und sind hier nicht nachgemessen.
