-- ──────────────────────────────────────────────────────────────────────
-- Rollback zu 20260826_pricing_gueltigkeit.sql
-- ──────────────────────────────────────────────────────────────────────
-- ‼️ ACHTUNG: der Rollback stellt den UNIQUE-Index wieder her. Existieren
-- zu diesem Zeitpunkt bereits ZWEI Preiszeilen fuer dieselbe Stufe
-- (Historie), scheitert er mit 23505 — und das ist richtig so: sonst
-- muesste er Preisgeschichte loeschen, um durchzukommen.
--
-- Vorher pruefen:
--   SELECT risk_level, count(*) FROM public.protect_pricing
--    GROUP BY 1 HAVING count(*) > 1;
--   SELECT plan_type, count(*) FROM public.compliance_plans
--    GROUP BY 1 HAVING count(*) > 1;
-- ──────────────────────────────────────────────────────────────────────

BEGIN;

ALTER TABLE public.protect_pricing  DROP CONSTRAINT IF EXISTS protect_pricing_kein_ueberlapp;
ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_kein_ueberlapp;

DROP INDEX IF EXISTS public.protect_pricing_aktuell_idx;
DROP INDEX IF EXISTS public.compliance_plans_aktuell_idx;

CREATE UNIQUE INDEX IF NOT EXISTS protect_pricing_risk_level_key
  ON public.protect_pricing (risk_level);
CREATE UNIQUE INDEX IF NOT EXISTS compliance_plans_plan_type_key
  ON public.compliance_plans (plan_type);

ALTER TABLE public.protect_pricing  DROP CONSTRAINT IF EXISTS protect_pricing_zeitraum_chk;
ALTER TABLE public.compliance_plans DROP CONSTRAINT IF EXISTS compliance_plans_zeitraum_chk;

-- Die Spalten bleiben stehen. Sie zu droppen wuerde die Gueltigkeits-
-- angaben unwiederbringlich verwerfen; unbenutzt schaden sie nicht.

COMMIT;
