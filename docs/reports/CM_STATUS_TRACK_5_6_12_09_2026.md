# ChairMatch — Track 5 + 6, Status 12.09.2026

> Ausgangsstand `da6af5f`. Kein Truth Reset — nur Messung und ein Fix.
> Jede Zahl unten ist gemessen.

## Kurzfassung

| | Ergebnis |
|---|---|
| CI | **alles grün** — typecheck, 1933 Tests, Build, Lint, Secret-Scan, Preis-Audit |
| Production | **live** — alle geprüften Pfade 200, 5 Inserate aus der DB |
| `darfAlsVerifiziertGelten()` | **false**, jetzt für alle 1024 Profile geprüft + Signatur bewacht |
| `spatial_ref_sys` | **weiter offen** — Migration READY_TO_APPLY, nicht angewendet |
| Funnel-Module | vorhanden und getestet, aber **ohne Aufrufer** — blockiert von der Migration |

---

## TRACK 5 · CI + Production

| # | Prüfung | Ergebnis |
|---|---|---|
| 1 | `npm run typecheck` | **0 Fehler**, Exit 0 |
| 2 | `npm test -- --run` | **1933 Tests / 101 Dateien** — Baseline 1930, **+3** (siehe Track 6.1) |
| 3 | `npm run build` | **grün**, Exit 0 |
| 4 | `scripts/secret-scan.sh` | **Exit 0** |
| 5 | Production | **erreichbar** |

### Production im Detail

```
/                      200
/rentals               200
/preisvergleich        200
/api/rental-listings   200   → 5 Inserate aus der Datenbank
/api/public-stats      200
```

### Nebenbefunde

- **Lint**: 0 Fehler, 13 Warnungen — unverändert seit Wochen (`<img>`-Hinweise,
  ungenutzte Variablen). Blockiert nichts.
- **`price-audit:check`**: grün, also ist das Inventar reproduzierbar.

---

## TRACK 6 · Verification + Booking-Funnel

### 6.1 · `darfAlsVerifiziertGelten()` — jetzt dreifach gesichert

Die stehende Regel war schon erfüllt, aber nur einfach abgesichert. Das ist
jetzt behoben — **+3 Tests**:

1. **Typebene** (bestand schon): der Rückgabetyp ist `{ erlaubt: false }`,
   ein Literaltyp. Der Compiler lässt `true` gar nicht zu.
2. **Erschöpfend zur Laufzeit** (neu): alle **1024** Kombinationen
   (4 Stufen ^ 5 Dimensionen) werden durchgeprüft, nicht mehr nur der
   voll-verifizierte Fall.
3. **Signatur bewacht** (neu): ein Test liest den Quelltext und besteht
   darauf, dass dort `erlaubt: false` steht und **nicht** `erlaubt: boolean`.

Punkt 3 ist der eigentliche Zugewinn. Die Typsicherung ist die stärkste der
drei — und die, die man versehentlich aufweicht: ein `boolean` statt `false`
in der Signatur fällt beim Lesen kaum auf, und ab dann schweigt der
Compiler.

**Gegenprobe gefahren:** Signatur auf `boolean` geweitet **und** Rumpf auf
`true` gedreht → **3 Tests fallen durch**. Danach zurückgesetzt.

### 6.2 · Modul-Tests

```
funnel-dispute-invoice-cancellation.test.ts   29
verifikation-stufenmodell.test.ts             38   (vorher 35)
salon-sperre-eine-quelle.test.ts               5
preis-literale-markiert.test.ts               31
                                             ───
                                             103   alle grün
```

### 6.3 · `spatial_ref_sys` — **READY_TO_APPLY**, weiter nötig

Live gemessen, unverändert:

```
SELECT   200
INSERT   22P02     → Recht vorhanden
DELETE   204       → Recht vorhanden
```

Die Migration enthält genau drei Anweisungen:

```sql
REVOKE ALL ON TABLE public.spatial_ref_sys   FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geometry_columns  FROM anon, authenticated, PUBLIC;
```

Nichts Destruktives, idempotent, kein `DROP`, kein `UPDATE`.
(`ON TABLE` gilt in Postgres auch für Views — die beiden `*_columns` sind
Views.)

**Status: READY_TO_APPLY.** Anwenden braucht Dashboard-Zugang.
Gegenprobe danach: `bash scripts/anon-perimeter-probe.sh` — erst bei
**Exit 0** ist der Perimeter zu.

### 6.4 · Fehlende Features — identifiziert, nicht entschieden

#### (a) Die neuen Module haben keinen Aufrufer

Gemessen: `dispute.ts`, `invoice.ts`, `cancellation.ts` und
`verification.ts` werden **von keinem Produktivpfad** aufgerufen. Die
einzigen Treffer außerhalb der Tests sind Selbstverweise in den eigenen
Fehlertexten.

Das ist **kein Versehen und keine tote Schicht**: die Module brauchen
Tabellen und Spalten, die es in der Produktion noch nicht gibt
(`disputes`, `dispute_events`, `invoices`, `invoice_lines`,
`verification_tier` & Co.). Solange die Migrationen nicht angewendet sind,
wäre jede Verdrahtung ein Aufruf ins Leere.

**Der Zustand gehört aber beobachtet.** Unverdrahtete Module altern still:
Wenn die Migration in vier Wochen kommt, muss jemand wissen, dass hier
etwas auf sie wartet. Deshalb steht es hier und im Ledger.

#### (b) Sechs offene Migrationen

| Datei | Inhalt |
|---|---|
| `20260828170738_benachrichtigungswege_haertung` | CM23 — Constraints, REVOKEs |
| `20260902_rls_restliche_tabellen` | RLS + REVOKE auf 9 Tabellen |
| `20260910_anon_insert_lockdown` | `visit_logs`, `submission_tickets` (Wirkung live bereits messbar) |
| `20260912_spatial_ref_sys_lockdown` | **P0** — siehe 6.3 |
| `20260912_verifikationsstufen` | Stufenmodell + Legacy-Übergang |
| `20260912_funnel_dispute_invoice_cancellation` | vier Tabellen + Stornospalten |

#### (c) Weiterhin ohne Mechanismus, mit öffentlicher Zusage

Unverändert gegenüber `BOOKING_FUNNEL.md` — hier nur als Erinnerung, dass
nichts davon stillschweigend erledigt wurde:

- **Schlichtung in 48h**: Modul da, Tabelle nicht, Zuständigkeit nicht
  entschieden.
- **Stornostaffel „50–100 %"**: Modul da, Werte nicht — und sie stehen in
  keiner Quelle außer dem Marketingtext.
- **Krankheit mit Attest → „immer kostenlos"**: es gibt keinen
  Attest-Upload und keinen Zustand dafür.
- **„Gutschein-Ausgleich"**: es gibt keine Gutscheine (`promo_codes` ist
  etwas anderes).
- **Rechnungen**: Modul da, Nummernkreis und Steuersatz sind Entscheidungen
  für die Steuerberatung.
- **Stripe**: `BLOCKED_EXTERNAL_STRIPE` / DEFERRED — in Produktion nicht
  konfiguriert.

**Keine dieser Entscheidungen wurde in diesem Lauf getroffen.**

---

## Offen

### Braucht Dashboard-Zugang

1. **`spatial_ref_sys`** — SQL oben, READY_TO_APPLY.
2. **Fünf weitere Migrationen** anwenden.
3. **Schlüssel rotieren** im Projekt `vlrviyrgggzhayepfmop` — der anon-Key
   stand bis `da6af5f` in diesem **öffentlichen** Repo und steht weiter in
   der Historie (Commit `2d89dc7`). Entfernen allein reicht nicht.

### Braucht eine Entscheidung

4. Ab welcher Stufe darf „verifiziert" öffentlich stehen? Strenger bei
   Heilberufen? Was passiert mit dem Altbestand?
5. Welche Stornostaffel gilt, und was bei Attest?
6. Was folgt nach den 48 Stunden im Streitfall, und wer ist zuständig?
7. Wer stellt Rechnungen, mit welchem Steuersatz?
