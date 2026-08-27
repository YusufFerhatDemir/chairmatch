-- ──────────────────────────────────────────────────────────────────────
-- favorites: Miet-Inserate merkbar machen (equipment_id)
-- ──────────────────────────────────────────────────────────────────────
-- Befund aus Track 7: `favorites` kennt nur `salon_id uuid NOT NULL`. Ein
-- gemerktes Miet-Inserat (rental_equipment) passt da nicht hinein. Die
-- Mieter-Oberflaeche weicht deshalb auf `localStorage['cm_inserate_favs']`
-- aus — geraetelokal, ohne Konto, beim naechsten Browser weg.
--
-- Diese Migration legt die Spalte an. Sie schaltet NICHTS um: die
-- Favoriten-Seiten bleiben vorerst auf localStorage, weil Code, der gegen
-- eine nicht angewendete Migration schreibt, live in 42703 laeuft. Erst
-- anwenden, dann per schema-probe.sh gegenpruefen, dann die UI umhaengen.
--
-- Modell: eine Zeile zeigt auf GENAU EINEN Gegenstand — entweder Salon oder
-- Inserat. Kein Eintrag ohne Ziel, kein Eintrag mit zweien.
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'favorites' AND c.relkind = 'r'
  ) THEN
    RAISE EXCEPTION 'favorites existiert nicht — Migration 20260307_ensure_tables zuerst anwenden.';
  END IF;
END $$;

ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS equipment_id uuid REFERENCES public.rental_equipment(id) ON DELETE CASCADE;

-- salon_id war NOT NULL. Ein Inserats-Favorit hat keinen Salon-Bezug, also
-- muss die Spalte leer bleiben duerfen. Die CHECK-Regel unten haelt statt
-- dessen fest, dass immer genau eines der beiden Ziele gesetzt ist.
ALTER TABLE public.favorites ALTER COLUMN salon_id DROP NOT NULL;

-- Bestehende Zeilen tragen alle einen salon_id — die Regel gilt fuer sie
-- unveraendert. Sollte wider Erwarten eine verwaiste Zeile existieren,
-- scheitert das ADD CONSTRAINT hier sichtbar, statt still durchzugehen.
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_genau_ein_ziel;
ALTER TABLE public.favorites ADD CONSTRAINT favorites_genau_ein_ziel
  CHECK ((salon_id IS NOT NULL) <> (equipment_id IS NOT NULL));

-- Ein Inserat einmal pro Konto. `favorites_customer_salon_unique` bleibt fuer
-- die Salon-Seite zustaendig; NULL-salon_id kollidiert dort nicht, weil
-- UNIQUE mehrere NULLs zulaesst.
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorites_customer_equipment
  ON public.favorites(customer_id, equipment_id)
  WHERE equipment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_favorites_equipment
  ON public.favorites(equipment_id)
  WHERE equipment_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════
-- RLS und Rechte
-- ══════════════════════════════════════════════════════════════════════
-- `favorites` hat seit 20260307_ensure_tables RLS an und die Policy
--   "Users manage own favorites"  FOR ALL USING (auth.uid() = customer_id)
-- Sie greift ueber `customer_id` und deckt damit BEIDE Zielarten ab — eine
-- eigene Policy fuer Inserats-Favoriten waere weder noetig noch richtig.
--
-- Zu WITH CHECK: die Policy hat keins. PostgreSQL nimmt dann den USING-
-- Ausdruck auch fuer INSERT/UPDATE, ein Eintrag auf fremden Namen ist also
-- ebenfalls ausgeschlossen. Hier steht das nur, damit beim naechsten Lesen
-- niemand ein fehlendes WITH CHECK fuer eine Luecke haelt.
--
-- Der Riegel im Code ist unabhaengig davon noetig: /api/favorites arbeitet mit
-- service_role und umgeht RLS. Dort kommt `customer_id` ausschliesslich aus
-- der Session, nie aus dem Request.
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- anon hat auf favorites bereits kein Recht (Live-Sonde 2026-08-27: HTTP 401
-- "permission denied for table favorites"). Der REVOKE steht trotzdem hier,
-- damit ein spaeteres GRANT nicht unbemerkt bleibt.
REVOKE ALL ON TABLE public.favorites FROM anon;

COMMIT;
