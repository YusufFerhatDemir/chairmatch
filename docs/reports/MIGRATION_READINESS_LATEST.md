# Migration Readiness — ChairMatch, Stand 12.09.2026

> Projekt `pwdbjqfpgumyfktbfswg`. Jede Zeile gemessen, nicht angenommen.
> **Keine dieser Migrationen ist angewendet.**

## Wie hier gemessen wurde, ohne DB-Zugang

Es gibt in dieser Session keinen DDL-Zugang (service_role rotiert, `psql`
ohne IPv6-Route zum AAAA-only-Host, Pooler `ENOTFOUND`, CLI ohne Token, kein
Supabase-MCP). Die Existenz einer Tabelle lässt sich trotzdem belegen — über
den **Unterschied zweier Fehlercodes** am öffentlichen Endpunkt:

| Antwort | Bedeutung |
|---|---|
| `404` + `PGRST205` | Tabelle ist **nicht im Schema** — existiert nicht |
| `401` (`42501`) | Tabelle **existiert**, `anon` hat keine Rechte |

Das ist belastbar, weil PostgREST die Schema-Prüfung vor der Rechteprüfung
macht. Was damit **nicht** geht: `supabase_migrations.schema_migrations`
lesen. Ob eine Migration *formal registriert* ist, bleibt deshalb offen —
gemessen ist nur, ob ihre **Wirkung** da ist.

## Gesamtbild

| Migration | Status | Wirkung live? | Idempotent | TX | Datenverlust |
|---|---|---|---|---|---|
| `20260912_spatial_ref_sys_lockdown` | **READY_TO_APPLY · P0** | nein (gemessen) | ja | ✅ neu | nein |
| `20260912_verifikationsstufen` | **READY_TO_APPLY** | nein (gemessen) | ja | ✅ | nein |
| `20260912_funnel_dispute_invoice_cancellation` | **READY_TO_APPLY** | nein (gemessen) | ja | ✅ | nein |
| `20260910_anon_insert_lockdown` | READY_TO_APPLY | **ja, bereits wirksam** | ja | ✅ | nein |
| `20260902_rls_restliche_tabellen` | READY_TO_APPLY · Vorsicht | teilweise | ja | ✅ | nein |
| `20260828170738_benachrichtigungswege_haertung` | READY_TO_APPLY | teilweise | ja | ✅ | nein |

Keine einzige Migration enthält `DELETE FROM`, `TRUNCATE`, `DROP TABLE` oder
`DROP COLUMN` — mechanisch geprüft.

---

## 1 · `20260912_spatial_ref_sys_lockdown` — **P0**

**Produktionsprüfung.** Unverändert offen:

```
GET    /rest/v1/spatial_ref_sys      → 200 (echte Zeilen)
INSERT (ungültiger Wert)             → 22P02   → Recht vorhanden
DELETE (leere Filtermenge)           → 204     → Recht vorhanden
```

**Inhalt.** Drei `REVOKE`-Anweisungen, seit heute in `BEGIN`/`COMMIT`
gewickelt — ohne Transaktion könnte die erste greifen und die zweite
scheitern, und der Perimeter wäre halb zu.

**Idempotenz.** `REVOKE` auf ein nicht vorhandenes Recht ist ein No-op.
Beliebig oft wiederholbar.

**Abhängigkeiten.** Keine. `spatial_ref_sys` gehört zu PostGIS und ist da.
(`ON TABLE` deckt in Postgres auch Views — die beiden `*_columns` sind Views.)

**Datenverlust.** Keiner. Nur Rechte, keine Daten.

**Bricht es etwas?** Nein. PostGIS ist installiert, aber unbenutzt:
`geography_columns` und `geometry_columns` antworten beide leer, es gibt im
Schema keine Geometrie-Spalte.

**Rollback.**
```sql
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;
```
Nur nötig, falls je eine Geo-Funktion dazukommt, die aus dem Browser liest —
heute tut das nichts.

**Gegenprobe.** `bash scripts/anon-perimeter-probe.sh` → erst bei **Exit 0**
ist der Perimeter zu.

---

## 2 · `20260912_verifikationsstufen`

**Produktionsprüfung.** `verification_reviews`, `verification_review_events`,
`verification_review_documents` → alle **404 PGRST205**, existieren nicht.
Zieltabellen `profiles` und `salons` → **401**, existieren.

**Inhalt.** Zwei Enums, Stufen- und Nachweisspalten auf `profiles` und
`salons`, drei neue Tabellen für den Prüfvorgang, vier CHECK-Constraints,
zwei Indizes, `REVOKE` + RLS.

**Der einzige Backfill** ist bewusst minimal:
```sql
UPDATE public.salons SET legacy_verified = true
 WHERE is_verified IS TRUE AND legacy_verified IS FALSE;
```
`verification_tier` bleibt für **alle** auf `UNVERIFIED`. Aus einem
Admin-Klick fünf Prüfungen zu machen wäre genau der Fehler, den das Modell
behebt.

**Idempotenz.** 29 × `IF NOT EXISTS`, Enums über `pg_type`-Prüfung,
Constraints mit `DROP CONSTRAINT IF EXISTS` davor, der Backfill durch die
`AND legacy_verified IS FALSE`-Bedingung selbstbegrenzend.

**Abhängigkeiten.** `profiles`, `salons`, `auth.users` — alle vorhanden.
Keine Reihenfolge-Abhängigkeit zu den anderen Migrationen.

**Datenverlust.** Keiner. `is_verified` wird **nicht** angefasst — es zu
löschen würde schlagartig ändern, was auf 100 öffentlichen Stellen behauptet
wird, ohne dass jemand entschieden hätte, was dort künftig steht.

**Rollback.**
```sql
BEGIN;
DROP TABLE IF EXISTS public.verification_review_events;
DROP TABLE IF EXISTS public.verification_review_documents;
DROP TABLE IF EXISTS public.verification_reviews;
ALTER TABLE public.salons
  DROP COLUMN IF EXISTS verification_tier, DROP COLUMN IF EXISTS legacy_verified,
  DROP COLUMN IF EXISTS verif_business,    DROP COLUMN IF EXISTS verif_qualification,
  DROP COLUMN IF EXISTS verified_at,       DROP COLUMN IF EXISTS verified_by,
  DROP COLUMN IF EXISTS verification_evidence, DROP COLUMN IF EXISTS verification_expiry;
-- profiles analog
DROP TYPE IF EXISTS public.review_status;
DROP TYPE IF EXISTS public.rejection_reason;
DROP TYPE IF EXISTS public.verification_tier;
DROP TYPE IF EXISTS public.verification_state;
COMMIT;
```
Verliert die Prüfvorgänge — ab dem Zeitpunkt, an dem echte Prüfungen
erfasst sind, ist das **kein** folgenloser Rollback mehr.

---

## 3 · `20260912_funnel_dispute_invoice_cancellation`

**Produktionsprüfung.** `disputes`, `dispute_events`, `invoices`,
`invoice_lines` → alle **404 PGRST205**. `bookings` und `booking_policies` →
**401**, existieren.

**Inhalt.** Vier Enums, vier Tabellen, vier Stornospalten auf
`booking_policies`, sechs CHECKs, vier Indizes (darunter ein Teilindex für
genau einen offenen Streitfall je Buchung), `REVOKE` + RLS.

**Idempotenz.** 18 × `IF NOT EXISTS`, Enums über `pg_type`, Constraint mit
`DROP … IF EXISTS` davor.

**Abhängigkeiten.** `bookings`, `booking_policies`, `auth.users` — vorhanden.
`gen_random_uuid()` setzt `pgcrypto` bzw. PG13+ voraus; im Repo wird es
bereits von `rental_requests` genutzt, ist also da.

**Datenverlust.** Keiner — nur neue Tabellen und neue, NULL-bare Spalten.

**Keine Defaults für Geld.** Kein Default für Gebühr, Steuersatz oder
Staffel. Die öffentlich genannten „50–100 %" hier als `DEFAULT`
einzutragen wäre dieselbe erfundene Zahl, nur mit Datenbankgewicht.

**Rollback.** `DROP TABLE` der vier neuen Tabellen + `DROP COLUMN` der vier
Stornospalten + `DROP TYPE`. Folgenlos, solange keine echten Streitfälle und
Rechnungen darin stehen — danach nicht mehr.

---

## 4 · `20260910_anon_insert_lockdown` — Wirkung bereits live

**Produktionsprüfung.** `visit_logs` und `submission_tickets` antworten auf
`INSERT` mit **42501** — die Lücke von 2026-09-10 ist **zu**.

**Ob durch diese Datei oder von Hand, ist von außen nicht unterscheidbar**:
dafür müsste man `supabase_migrations.schema_migrations` lesen können. Die
Datei bleibt deshalb unter „offen", bis jemand mit Dashboard-Zugang die
Version bestätigt.

**Erneutes Anwenden ist harmlos** — `REVOKE` und `ENABLE ROW LEVEL SECURITY`
sind beide idempotent.

---

## 5 · `20260902_rls_restliche_tabellen` — **Vorsicht**

**Produktionsprüfung.** Alle neun Zieltabellen antworten `anon` mit 401 —
lesend ist der Perimeter dort zu. Ob `FORCE ROW LEVEL SECURITY` gesetzt ist,
ist von außen **nicht** feststellbar.

**Der Grund für die Vorsicht** steht in der Migration selbst: `FORCE ROW
LEVEL SECURITY` **ohne jede Policy** legt jede Rolle ohne `BYPASSRLS` stumm.
Hätte `service_role` dieses Attribut nicht, wäre die Anwendung im Moment der
Absicherung abgeschaltet. Die Datei hat dafür einen Pre-Flight mit `RAISE
EXCEPTION` — **dieser Riegel ist der Grund, warum sie überhaupt anwendbar
ist**, und er darf beim Anwenden nicht übersprungen werden.

**Datenverlust.** Keiner, aber **Ausfallrisiko** bei fehlendem `BYPASSRLS`.
Als einzige der sechs sollte sie außerhalb der Stoßzeiten laufen.

**Rollback.** `ALTER TABLE … NO FORCE ROW LEVEL SECURITY;` +
`DISABLE ROW LEVEL SECURITY` + `GRANT` zurück.

---

## 6 · `20260828170738_benachrichtigungswege_haertung` (CM23)

**Produktionsprüfung.** Der `REVOKE`-Teil ist wirksam — alle vier
Zieltabellen antworten `anon` mit 401. Der **Schema-Teil**
(`push_subscriptions.updated_at`, UNIQUE auf `wait_list(email, city)`, sechs
CHECKs) ist **nicht prüfbar**: bei gesperrten Tabellen verdeckt 401 ein
mögliches 42703.

**Idempotenz.** 3 × `IF NOT EXISTS`, 3 × `DROP … IF EXISTS`.

**Datenverlust.** Keiner. Aber die sechs CHECKs können **fehlschlagen**,
wenn Altdaten sie verletzen — die Migration zählt vorher und bricht mit
`RAISE EXCEPTION` ab, statt still zu ändern. Das ist richtig so und heißt:
ein Abbruch ist ein Befund, kein Fehler.

---

## Empfohlene Reihenfolge

1. **`20260912_spatial_ref_sys_lockdown`** — P0, kleinste Fläche, sofort
   verifizierbar über die Sonde.
2. `20260912_verifikationsstufen` und
   `20260912_funnel_dispute_invoice_cancellation` — unabhängig voneinander,
   beide reine Ergänzungen.
3. `20260828170738` und `20260910` — erwartete No-ops bzw. Teil-No-ops; ein
   `RAISE EXCEPTION` aus CM23 ist ein Befund.
4. **Zuletzt `20260902_rls_restliche_tabellen`**, außerhalb der Stoßzeiten,
   mit dem Pre-Flight.

## USER_ACTION_REQUIRED

Alle sechs brauchen den Supabase SQL Editor. Nach jeder:

```bash
bash scripts/anon-perimeter-probe.sh   # Perimeter
npm test -- --run                      # Module
```

Und nach dem Anwenden der beiden neuen Tabellen-Migrationen: die sieben
neuen Tabellen in `TABELLEN=` der Sonde eintragen — sonst meldet sie
weiterhin „dicht" und meint nur „dicht, soweit ich hingesehen habe".
