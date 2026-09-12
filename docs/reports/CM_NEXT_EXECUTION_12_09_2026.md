# ChairMatch — Ausführung 12.09.2026

> Ausgangsstand `ee4d935`. Jede Zahl hier ist gemessen, nicht geschätzt.

## Kurzfassung

| Phase | Ergebnis |
|---|---|
| 1 · Konflikte | spatial_ref_sys **weiter offen** → USER_ACTION_REQUIRED · alle Dateien aus dem Vorlauf vorhanden |
| 2 · Verifizierung | Legacy-Übergang + Nachweisfelder + Heilberufe-Kategorien, 35 Tests |
| 3 · Booking-Funnel | Dispute, Invoice, Cancellation als Module mit 29 Tests + Migration |
| 4 · Preis-Delta | **kein Delta** — 1240 Literale, unverändert |
| 5 · CI | typecheck/Tests/Lint/Build grün · **neuer Secret-Fund, behoben** |

**Ein Fund, der nicht auf der Liste stand:** `index_legacy.html` trug seit
dem 08.03.2026 einen **funktionierenden** Supabase-anon-Key für ein fremdes
Projekt — in einem **öffentlichen** Repository. Entfernt; der Schlüssel
gehört rotiert (siehe unten).

---

## Phase 1 · Konflikte

### spatial_ref_sys — nicht angewendet, **USER_ACTION_REQUIRED**

Live gemessen:

```
spatial_ref_sys   GET 200 · INSERT 22P02 · DELETE 204
                  ← LESEN  ← SCHREIBEN  ← LÖSCHEN
anon-perimeter-probe.sh → Exit 1
```

Kein Supabase-MCP in dieser Session (Tool-Suche auf `execute_sql` /
`apply_migration`: kein Treffer), und die vier Verbindungswege sind
unverändert zu: service_role 401, `psql` ohne IPv6-Route zum AAAA-only-Host,
Pooler `ENOTFOUND`, CLI ohne Token.

**Was zu tun ist** — Dashboard → SQL Editor, Projekt `pwdbjqfpgumyfktbfswg`:

```sql
REVOKE ALL ON TABLE public.spatial_ref_sys   FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geography_columns FROM anon, authenticated, PUBLIC;
REVOKE ALL ON TABLE public.geometry_columns  FROM anon, authenticated, PUBLIC;
```

Danach `bash scripts/anon-perimeter-probe.sh` — erst bei **Exit 0** ist der
Perimeter zu.

### Code-Stand

Alle fünf Dateien aus dem Vorlauf vorhanden: `verification.ts` (jetzt 254 →
erweitert), `PRICE_SOURCE_OF_TRUTH.md`, `BOOKING_FUNNEL.md` und die beiden
Migrationen.

---

## Phase 2 · Verifizierung

### Legacy-Übergang

`is_verified = true` → `verification_tier = 'UNVERIFIED'` **+**
`legacy_verified = true`.

Zwei Felder statt einem, und das ist der ganze Punkt: hinter dem alten Flag
steht ein Admin-Klick und kein Nachweis. Jede Stufe außer `UNVERIFIED` würde
eine Prüfung behaupten, die es nie gab. So geht keine Information verloren —
der Klick bleibt sichtbar und auswertbar — und trotzdem behauptet niemand
etwas.

Im Test festgehalten: **kein** Eingabewert führt zu einer anderen Stufe als
`UNVERIFIED`.

### Nachweisfelder

`verified_at`, `verified_by`, `verification_evidence`, `verification_expiry`
— auf `profiles` und `salons`. Dazu zwei Riegel in der Migration:

- Eine bestätigte oder abgelehnte Stufe **ohne** Prüfer und Zeitpunkt ist
  kein Vorgang → CHECK.
- Ein Ablaufdatum vor dem Prüfdatum ist ein Tippfehler → CHECK.

`nachweisGueltig()` behandelt ein unlesbares Datum als **ungültig**: ein
kaputter Wert belegt nichts.

### Heilberufe-Kategorien

Aus den elf Kategorien (Code **und** DB abgeglichen):

| Kategorie | Grund | Anlass |
|---|---|---|
| `arzt` | heilberuf | Heilkunde am Menschen, Approbation |
| `opraum` | heilberuf | chirurgische Eingriffe, Hygiene- und Raumanforderungen |
| `aesthetik` | heilberuf | Botox/Filler — verschreibungspflichtig bzw. arztvorbehalten |
| `kosmetik` | gerätefachkunde | Kategorie-Unterzeile nennt ausdrücklich „Laser" (NiSV) |
| `friseur` | handwerk | zulassungspflichtiges Handwerk, Meisterpflicht |

Die Konstante heißt `NACHWEIS_ZU_PRUEFEN` und nicht „braucht Nachweis" —
**ob** ChairMatch ihn verlangen muss, ist eine Rechtsfrage und hier
ausdrücklich nicht entschieden.

### Das Abzeichen bleibt zu

`darfAlsVerifiziertGelten()` gibt weiter für **jede** Stufe `false` zurück,
auch für `PROFESSIONAL`. Im Test festgehalten.

---

## Phase 3 · Booking-Funnel

Drei Module, **29 Tests**, dazu eine Migration mit vier Tabellen. Der rote
Faden durch alle drei: **eine fehlende Angabe wird nie zu einer Zahl** —
weder zu 0 noch zum vollen Betrag. Beide Richtungen wären erfunden, und die
günstigere ist nicht die harmlosere; sie kostet nur jemand anderen.

### `cancellation.ts`

`unbestimmt` ist ein erstklassiges Ergebnis mit eigenem Zweig, kein
Fehlerfall — und heute der Normalfall. Die öffentlich genannten „50–100 %"
sind **nicht** eingebaut: sie stehen in keinem Vertrag und keiner Datenbank,
nur in einem Marketingtext.

Abgedeckt: Frist, Staffel (die Staffel schlägt das Einzelfenster),
Prozent/Festbetrag, Deckelung auf den Buchungswert (sonst würde aus einer
Absage eine Forderung), Prozentsatz > 100 als Fehler, No-Show aus dem
einzigen real existierenden Feld `no_show_fee_cents`.

### `dispute.ts`

Zustandsmaschine mit einer Quelle (`DISPUTE_TRANSITIONS`), Frist aus der
öffentlichen Zusage (`DISPUTE_RESPONSE_HOURS = 48`), Verlauf, Ausgang.

Drei Regeln, die im Test stehen:

- **Nur der Eröffner darf zurückziehen.** Sonst wäre „Beschwerde des Kunden
  zurückziehen" der bequemste Weg aus jedem Streit.
- **Nur die Plattform entscheidet.**
- **Ein Abschluss ohne Ausgang ist kein Abschluss** — und ein Ausgang gehört
  nur an den Abschluss.

`resolution` hält fest, **was** entschieden wurde (`partial_refund`), nicht
wie viel: der Betrag hängt an der Stornoregel, und die ist offen.
`folgeNachFristablauf()` stellt fest, dass die Frist gerissen ist, und zieht
**keine** Folge — eine Automatik mit Geldwirkung wäre hier die teuerste Art
erfundener Zahl.

### `invoice.ts`

Beleg und Zahlungsstand, **kein** Geldtransfer. `taxRatePercent` hat
**keinen** Default — ob eine Stuhlmiete nach § 4 Nr. 12 UStG steuerfrei ist,
mit 19 % läuft oder der Anbieter Kleinunternehmer nach § 19 UStG ist, hängt
am Einzelfall. Ohne Steuersatz bleibt die Rechnung `draft` und ist nicht
ausstellbar.

`storniere()` löscht nichts — in Deutschland ist der Weg eine Gutschrift;
Nummer, Positionen und Datum bleiben stehen.
`naechsteRechnungsnummer()` gibt `null` zurück: der Nummernkreis ist eine
Entscheidung mit Nebenwirkungen (pro Aussteller? Lücken bei `ROLLBACK`?
Jahreswechsel?), und eine erfundene Nummer ist schlimmer als keine.

### Migration

`disputes`, `dispute_events`, `invoices`, `invoice_lines` plus vier
Stornospalten auf `booking_policies`. Alle Regelfelder NULL-bar — **kein**
Default für Gebühr, Steuersatz oder Staffel. Ein Teilindex sorgt für genau
einen offenen Streitfall je Buchung. Perimeter: erst `REVOKE`, dann RLS.

**Nicht angewendet** — kein DDL-Zugang.

---

## Phase 4 · Preis-Delta

**Kein Delta.** `npm run price-audit` erzeugt dieselbe Datei wie im Commit
(`git diff` leer), `--check` grün.

| Gruppe | Literale |
|---|---:|
| Marktbehauptungen | 1087 |
| Heilbehandlungspreise | 93 |
| Ertragserwartungen | 29 |
| intern | 14 |
| eigene Produktpreise | 9 |
| Testdaten | 8 |
| **gesamt** | **1240** |

Alle 36 öffentlich sichtbaren Dateien tragen weiterhin sowohl
`BUSINESS_DECISION_REQUIRED` als auch `PRICE_DECISION_REQUIRED`; der Test
`preis-literale-markiert.test.ts` hält die Grenze. Neu markiert in diesem
Lauf: die Schlichtungs-Zusage (keine Preisangabe, dieselbe Klasse
unbelegter öffentlicher Zusage) und die offenen Stellen in den drei neuen
Modulen.

---

## Phase 5 · CI

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | **PASS** |
| `npm test -- --run` | **PASS** — 1930 Tests in 101 Dateien (vorher 1886/100) |
| `npm run lint` | **PASS** — 0 Fehler, 13 Warnungen (unverändert) |
| `npm run build` | **PASS** — Exit 0 |
| `npm run price-audit:check` | **PASS** |
| `npm run secret-scan` | **PASS** (nach Behebung) |

### Kein `|| true` an einer Prüfung

Nachgesehen: die neun Treffer in `scripts/` und `deploy.sh` sind sämtlich
`grep … || true` (grep liefert Exit 1 bei „nichts gefunden" — das ist kein
Fehlschlag) bzw. `rm -f` und ein optionaler Statuslauf. **Keine
Verifikationsstufe ist maskiert**, und in den Workflows gibt es kein
`continue-on-error`. Der neue Secret-Scan ist ausdrücklich ohne beides
eingehängt.

### PII-Perimeter

19 PII-Tabellen einzeln: `SELECT 401 · INSERT 42501 · DELETE 401`.
Die Rolle `authenticated` bleibt **ungeprüft und als ungeprüft
gekennzeichnet** — dafür bräuchte es ein Nutzer-JWT, und das gäbe es nur
durch Anlegen eines echten Kontos in der Produktion.

### Der Secret-Fund

`index_legacy.html`, Zeile 200, seit Commit `2d89dc7` vom **08.03.2026**:

```
const SUPABASE_URL="https://vlrviyrgggzhayepfmop.supabase.co";
const SUPABASE_KEY="eyJ…role:anon…";
```

- Das Projekt ist **nicht** ChairMatch (ChairMatch ist `pwdbjqfpgumyfktbfswg`).
- Das Repository ist **öffentlich** (`gh repo view` → `visibility=PUBLIC`).
- Der Schlüssel war am 12.09.2026 **noch gültig**: `/auth/v1/health` mit
  diesem Key antwortet mit GoTrue v2.196.0.
- Die Datei wird **nicht** ausgeliefert (`/index_legacy.html` → 404) und von
  keinem Produktivpfad geladen.

**Einordnung, ohne Dramatik:** ein anon-Key ist öffentlich by design — er
steht in jedem Browser-Bundle. Ihn zu besitzen ist kein Einbruch. Was
zählt, ist, dass er zu einem **fremden, lebenden** Projekt gehört, dessen
RLS-Lage von hier aus nicht bekannt ist, und dass er Auth-Operationen (und
damit Kosten und Spam) gegen dieses Projekt ermöglicht.

**Behoben:** Schlüssel entfernt, mit Begründung an Ort und Stelle.

> **Das reicht nicht.** Die git-Historie ist öffentlich; der Schlüssel steht
> weiter in Commit `2d89dc7`. Er gehört im Projekt `vlrviyrgggzhayepfmop`
> **rotiert**.

**Warum es sechs Monate lag:** `precommit-guard.sh` prüft den *staged diff*
— es sieht nur, was hinzukommt. Sein Muster hätte die Zeile heute erwischt,
aber sie wurde committet, bevor es den Guard gab. Deshalb jetzt
`scripts/secret-scan.sh` über den **gesamten** getrackten Bestand, in CI
eingehängt. Gegenprobe gefahren: mit dem Schlüssel im Baum Exit 1, ohne
ihn Exit 0.

---

## Offen — braucht Dashboard-Zugang

1. **`spatial_ref_sys`** — SQL oben. Erst bei `Exit 0` ist der Perimeter zu.
2. **Drei Migrationen anwenden**: Verifikationsstufen, Funnel-Tabellen,
   spatial_ref_sys.
3. **Schlüssel rotieren** im Projekt `vlrviyrgggzhayepfmop`.

## Offen — braucht eine Entscheidung, keine Technik

4. Ab welcher Stufe darf „verifiziert" öffentlich stehen? Strenger bei
   Heilberufen? Was passiert mit dem Altbestand?
5. Welche Stornostaffel gilt — und was bei Krankheit mit Attest (öffentlich
   zugesagt, nirgends abgebildet: es gibt keinen Attest-Upload)?
6. Was folgt nach den 48 Stunden im Streitfall? Und was ist der zugesagte
   „Gutschein-Ausgleich", den es im System nicht gibt?
7. Wer stellt Rechnungen, mit welchem Steuersatz? → Steuerberatung.
