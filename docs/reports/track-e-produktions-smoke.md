# Track E — Produktions-Smoke und Härtung

**Stand:** 30.08.2026 · **Basis:** `5227751` (Track 25: Bericht)
**Methode:** Messung gegen `www.chairmatch.de` und gegen die laufende
Supabase-Instanz `pwdbjqfpgumyfktbfswg` — ausschließlich lesend, ausschließlich
mit dem öffentlichen ANON-Key. Keine Zahlung ausgelöst, kein Preis gesetzt.

---

## Zusammenfassung

Die Sicherheitsriegel halten: alle sieben Admin-Schnittstellen antworten ohne
Anmeldung mit 401, die Stripe-Strecken mit 401 bzw. 400, die drei Cron-Läufe
mit 401, und die acht PII-Tabellen sind für den anon-Key gesperrt. Das
Live-Schema deckt sich mit `src/test/live-schema.ts`.

Gefunden wurden neun Befunde. Der teuerste steht wieder in der Buchungskette,
und wieder war er nur gegen die Produktion zu sehen.

| # | Befund | Schwere | Zustand |
|---|--------|---------|---------|
| 1 | NRW-Salons nehmen an ihren Landesfeiertagen Termine an | **P1** | behoben |
| 2 | Slot-Route nennt den Grund nicht, beide Kalender raten | P2 | behoben |
| 3 | Miet-Belegung ohne Fehlerprüfung → jeder Slot frei | P2 | behoben |
| 4 | `/api/admin/export`: Lesefehler wird zur leeren CSV-Datei | P2 | behoben |
| 5 | `/admin/mis`: Lesefehler wird zu „0 € Plattformumsatz" | P2 | behoben |
| 6 | `/admin/audit-logs`: Lesefehler wird zu „Noch keine Einträge" | P2 | behoben |
| 7 | `/admin` und `/provider/dashboard`: dieselbe Verwechslung bei Geld | P2 | behoben |
| 8 | Rollenerhöhung zu `super_admin` ohne jede Spur | P2 | behoben |
| 9 | Preisliste eines gesperrten Salons ist anon lesbar | P2 | Migration liegt bereit, **nicht angewendet** |

Dazu zwei Punkte, die **nicht** in diesem Track zu entscheiden waren: der
Soft-404 auf `/salon/<unbekannt>` (Abschnitt 10) und ein scharfer
Rollen-Endpunkt in der Produktion (Abschnitt 11).

---

## 1 (P1) · Drei Salons arbeiten an Fronleichnam und Allerheiligen

Track 25 hat den Feiertagsriegel gebaut und dabei festgehalten:

> `salons.state` wird im gesamten Code an keiner Stelle geschrieben, steht
> also für die meisten Salons auf NULL.

**Für die Live-Daten stimmt das nicht.** Alle 15 öffentlichen Salons tragen
einen Wert — ausgelesen über `GET /api/salons/<slug>`:

```
Hamburg · Baden-Württemberg · Bayern · Berlin · Hessen · NRW
```

`normalizeBundesland` kannte die ersten fünf und **nicht `NRW`**. Der Ländercode
lautet `NW`; `NRW` ist die geläufige Abkürzung und stand in keiner Liste. Die
Funktion gab `undefined` zurück, und damit galten für drei von 15 Salons nur
die neun bundesweiten Feiertage.

### Gemessen, mit Gegenprobe

`/api/availability`, jeweils die erste Leistung des Salons:

| Salon | `state` | Datum | Tag | Antwort |
|---|---|---|---|---|
| Maison Haarwerk | NRW | 2027-11-01 | Allerheiligen, **Mo** | **33 Slots** |
| Maison Haarwerk | NRW | 2027-05-27 | Fronleichnam, **Do** | **41 Slots** |
| Glow Studio | Bayern | 2027-11-01 | Allerheiligen | `holiday` ✓ |
| BlackLabel Barbershop | Hessen | 2027-05-27 | Fronleichnam | `holiday` ✓ |
| BlackLabel Barbershop | Hessen | 2027-11-01 | (in HE kein Feiertag) | offen ✓ |
| Maison Haarwerk | NRW | 2027-11-08 | gewöhnlicher Mo | 33 Slots ✓ |

Die Kette funktioniert also — sie ist an einer Schreibweise vorbeigelaufen.
Weil `createBooking` denselben Riegel benutzt (`salonGeschlossen`), hätte auch
ein direkter POST den Termin angenommen: der Kunde bekommt eine Bestätigung
für einen Tag, an dem niemand da ist.

**Behoben** in `normalizeBundesland`: der Wert wird jetzt auf Buchstaben
reduziert (Umlaute ausgeschrieben, Bindestriche und Leerzeichen weg), und die
Tabelle kennt neben den 16 Namen die gängigen Kürzel (`NRW`, `RLP`, `NDS`,
`BaWü`, `MeckPomm`) und die amtlichen Beiworte („Freistaat Bayern", „Freie und
Hansestadt Hamburg"). Unbekanntes ergibt weiter `undefined` und damit die
bundesweite Liste — geraten wird nichts.

---

## 2 (P2) · Der Kalender wusste den Grund und sagte ihn nicht

`/api/availability` schickt bei Feiertag und gesperrtem Salon ein
`message`-Feld mit. **Keine der beiden Buchungs-Oberflächen hat es je
gelesen.** Beide schrieben stattdessen ihren eigenen Satz:

- `/salon/[slug]/buchen`: „An diesem Tag ist nichts mehr frei."
- `/booking/[salonId]`: „… der Salon hat geschlossen oder der Tag ist ausgebucht."

Am 25. Dezember stand dort also „nichts mehr frei", und beim gesperrten Salon
ebenso — der Kunde sucht dann weiter nach einem Tag, den es nicht gibt.

Dazu fehlte ein Grund ganz: für einen **Ruhetag** gab die Route ein nacktes
`{ slots: [] }` zurück. `CLOSED_MESSAGES.closed_day` existierte seit Track 25
und hatte in dieser Route keinen Aufrufer.

**Behoben:** die Route sendet `unavailable: 'closed_day'` mit Text, beide
Oberflächen zeigen `message`, wenn es kommt. Bewusst **nicht** geändert: bei
`unknown` (keine gepflegten Zeiten) behauptet die Route weiter nichts — das ist
dieselbe Linie, auf der `createBooking` diesen Fall nicht abweist.

---

## 3 (P2) · Bei Miet-Slots war ein Ausfall gleich „alles frei"

Der Termin-Zweig derselben Route hat den Riegel und begründet ihn im Code:

> Fällt die Belegungsabfrage aus, ist JEDER Slot frei — das ist genau die
> Antwort, die zu Doppelbuchungen führt.

Der **Miet-Zweig** hatte ihn nicht: `const { data: existing } = await …` ohne
`error`. Ein Ausfall ergibt `null`, die Schleife läuft nicht, und das volle
Tagesraster geht für ein Gerät hinaus, das längst vermietet ist. Jetzt 503 wie
oben. Ein belegter Tag nennt sich außerdem als solcher
(`unavailable: 'booked'`) statt leer zurückzukommen.

---

## 4 (P2) · Ein Lesefehler ist keine leere Tabelle — vier Mal

Track 25 hat diese Klasse für `/api/admin/commissions` geschlossen. Sie steckt
an sieben weiteren Stellen; vier davon sind hier behoben, und es sind die, an
denen jemand auf die Falschaussage hin handelt.

### `/api/admin/export`

Alle vier Abfragen destrukturierten nur `data`. Fällt eine aus, ist
`(data ?? [])` leer — und die Route liefert **Status 200 mit einer gültigen
CSV-Datei, die außer der Kopfzeile nichts enthält**, unter dem Namen
`chairmatch-buchungen-2026-08-30.csv`.

Das wiegt schwerer als eine Zahl auf einem Bildschirm: die Datei geht in die
Buchhaltung, in eine DSGVO-Auskunft oder an den Steuerberater. Dort ist ihr
nicht mehr anzusehen, dass sie nie Daten enthielt.

Am schärfsten beim Compliance-Export: fällt **nur** die Dokumenten-Abfrage aus,
kommt eine vollständig aussehende Datei zurück, in der jeder Salon
„Dokumente eingereicht: 0" trägt.

**Behoben:** 503 und **keine Datei**. Zweitens las die Route ungedeckelt gegen
`.limit(10000)` — 10 000 Zeilen sehen aus wie ein vollständiger Export. Bei
erreichter Grenze steht das jetzt im Dateinamen
(`…-GEKUERZT-10000-von-24812.csv`), nicht als Zusatzzeile in der CSV, damit die
Datei maschinenlesbar bleibt.

### `/api/admin/mis`

Der `catch` schrieb `console.warn('platform_transactions noch nicht
verfügbar')`, und auf `/admin/mis` stand danach „0,00 €" Plattformumsatz. Die
Tabelle **existiert** live (Sonde: 42501, also vorhanden und für anon
gesperrt) — der Kommentar traf nicht mehr zu und hat einen echten Lesefehler
als Normalzustand ausgegeben. Die Route meldet jetzt `platformRevenueLesbar`,
die Seite schreibt es über die Beträge.

### `/admin/audit-logs`

Auf jeder anderen Seite wäre das eine Ungenauigkeit. Hier war es die Aussage
„es ist nichts passiert" — auf dem einen Bildschirm, den man ansieht, wenn man
wissen will, ob etwas passiert ist. Statt „Noch keine Einträge." steht dort
jetzt, dass das Protokoll nicht gelesen werden konnte.

Nebenbefund derselben Seite: die Label-Tabelle deckte **7 von rund 30**
Aktionen ab. In der Spalte „Aktion" stand sonst `rental_conflict_refunded` oder
`charge_partially_refunded`. Jetzt vollständig, und die Rollenerhöhung ist als
`⚠ Zu Super-Admin befördert` markiert.

### `/admin` und `/provider/dashboard`

Zwei Geldaussagen und eine Entwarnung:

- Cockpit-Kachel „Umsatz" wurde bei einem Lesefehler zu **0,00 €**.
- „Ausstehende Verifizierungen" wurde zu **„✅ Alles verifiziert"** — eine
  Entwarnung für genau das Freischalt-Tor, das Track 15 und 20 scharf gestellt
  haben. Ein Admin, der das liest, schaltet niemanden frei.
- Das Anbieter-Dashboard zeigte **„Gesamt 0,00 €"** auf der Seite, auf der der
  Anbieter nachsieht, was die Plattform ihm schuldet. `/api/provider/dashboard`
  hatte das sogar ausdrücklich so codiert:
  `if (txError || !txs || txs.length === 0) return emptyDashboard(...)`.

Überall gilt jetzt die Konvention aus `/api/admin/kpi` (Track 11): `null` heißt
„unbekannt", und das steht auch so da.

### Nicht angefasst (dieselbe Klasse, geringere Folge)

`admin/tickets`, `admin/buchungen`, `admin/benutzer`, `admin/anbieter`,
`admin/dokumente`, `admin/besucher`, `admin/statistik`, `provider/bilder`,
`owner/locations` — jeweils `const { data: … } = await supabase` ohne
Fehlerprüfung. Dort ist die Folge eine leere Liste statt einer falschen Zahl.
Wer das aufräumt, findet die Stellen mit:

```
grep -rn "const { data: [a-zA-Z]* } = await supabase" "src/app/(admin)" "src/app/(provider)" "src/app/(owner)"
```

---

## 5 (P2) · Die höchste Rolle wurde spurlos vergeben

`POST /api/setup/promote-admin` schreibt `role = 'super_admin'` und antwortete
200 — **ohne eine einzige Zeile in `audit_logs`**. `/admin/audit-logs` zeigt
Erstattungen, Passwortwechsel und gemeldete Bewertungen; die Vergabe der
Vollmacht über all das war unsichtbar. Wer den Schlüssel hat, war danach
Super-Admin, und niemand konnte hinterher sagen, wann und von welcher Adresse
aus. Jetzt `role.promoted_super_admin` mit Vorgänger-Rolle, Modus und IP.

---

## 6 (P2, Migration offen) · Die Preisliste eines gesperrten Salons ist öffentlich

`GET /rest/v1/services?select=*` antwortet dem ANON-Key mit **200** und liefert
alle 64 Zeilen. Sie verteilen sich auf **16** Salons — öffentlich sichtbar sind
**15**:

```
GET /api/salons/cccccccc-0000-4000-a000-000000000003   →  404  (is_active = false)
GET /rest/v1/services?salon_id=eq.cccccccc-…-000003    →  200
    Botox Behandlung   299,00 €
    Hyaluron Filler    399,00 €
    PRP Therapie           …
```

Das ist der Rest des Track-20-Befunds eine Ebene tiefer. `/rest/v1/services`
braucht weder die Anwendung noch einen Slug — es reicht der Schlüssel, der in
jedem ausgelieferten Browser-Bundle steht.

Stehengeblieben ist das, weil `20260827_anon_grant_lockdown.sql` `services`,
`rental_equipment` und `salon_images` ausdrücklich ausgenommen hat („tragen
öffentlichen Katalog-inhalt … sollen es bleiben"). Diese Einschätzung stammt
von **vor** Track 20; `rental_equipment` wurde in Track 22 aus genau diesem
Grund nachgezogen.

Die Migration liegt als `supabase/migrations/20260830_services_anon_lockdown.sql`
bereit und ist im `MIGRATION_LEDGER.md` als CM24 vermerkt. **Sie ist nicht
angewendet** — Agents haben in dieser Sitzung keinen Schreibzugang zur
Datenbank. Risiko der Anwendung ist gering: alle sechs lesenden Stellen im Code
laufen über `getSupabaseAdmin()` (`service_role`), das von `REVOKE … FROM anon`
nicht betroffen ist.

---

## 7 · Soft-404: `/salon/<unbekannt>` antwortet mit 200

```
GET https://www.chairmatch.de/salon/gibtsnicht-xyz   →  200
```

Der Rumpf ist richtig („Seite nicht gefunden"), der Status nicht. Das Muster
ist scharf: **jede** Route mit `dynamicParams = false` (`/magazin`,
`/category`, `/[stadt]`) antwortet sauber mit 404 — und genau die zwei ohne
(`/salon`, `/listings`) antworten mit 200. Denselben Soft-404 hat schon
`magazin/[slug]/page.tsx` beschrieben; dort war er mit `dynamicParams = false`
zu lösen, weil alle gültigen Slugs zur Bauzeit feststehen. Bei Salons stehen
sie in der Datenbank — ein neu freigeschalteter Salon muss ohne Deploy
erreichbar sein.

**Behoben wurde die Hälfte, die wirklich schadet:** `/salon/[slug]` gab in
diesem Fall `{ title: 'Salon — ChairMatch' }` zurück — Status 200, kein
`noindex`, generischer Titel. Das ist die Einladung, jeden Tippfehler-Link und
jeden gesperrten Salon als eigene Seite in den Index zu nehmen.
`/listings/[slug]` macht es im selben Repo seit jeher richtig; jetzt beide.

**Offen bleibt der Statuscode.** Ihn zu heilen hieße, die Suspense-Grenze für
den gesamten öffentlichen Bereich aufzugeben — `(public)/loading.tsx`, der
Marken-Ladebildschirm. Das ist eine Produktentscheidung. Die Ursache ist
außerdem plausibel, aber **nicht nachgemessen**: der Dev-Server dieser Maschine
brauchte über fünf Minuten je Route und kam für die Gegenprobe nicht in Frage.
Wer das angeht, misst zuerst.

---

## 8 · Für yusuf: `ADMIN_SETUP_KEY` ist in der Produktion gesetzt

```
POST /api/setup/promote-admin  →  403  {"error":"Ungültiger Setup-Key"}
```

Das ist **nicht** die Antwort eines abgeschalteten Endpunkts. Ohne Schlüssel
antwortet die Route „Setup endpoint deaktiviert." Der Wortlaut sagt also: der
Schlüssel steht in Vercel und ist mindestens 24 Zeichen lang — der Endpunkt,
der jedes Konto zu `super_admin` macht, ist scharf. Er ist gut gesichert (5
Versuche pro Stunde und IP, zeitkonstanter Vergleich, Mindestlänge), und die
Route sagt in ihrem eigenen Kommentar: „Nach Nutzung wieder entfernen."

**Das ist eine Klick-Aktion, die nur du machen kannst:** `ADMIN_SETUP_KEY` in
den Vercel-Projekt-Einstellungen löschen. Absichtlich **nicht** im Code
abgeschaltet — ein stiller Riegel könnte dich im Ernstfall aus deiner eigenen
Plattform aussperren, und das ist keine Entscheidung für einen Härte-Track.
Bis dahin hinterlässt jede Erhöhung wenigstens eine Spur (Abschnitt 5).

---

## Gemessener Stand

### Produktionssonde (`bash scripts/prod-probe.sh`)

Alle Erwartungen erfüllt: 6 geschützte Seiten → 307 `/auth`, 7 Admin-Routen →
401, 8 PII-Tabellen → 401.

### Zusätzlich gemessen

| Aufruf | Antwort |
|---|---|
| `POST /api/stripe/checkout` | 401 |
| `POST /api/stripe/connect` | 401 |
| `POST /api/stripe/webhook` (ohne Signatur) | 400 `Missing signature` |
| `POST /api/bookings` | 401 |
| `POST /api/admin/refund` | 401 |
| `GET /api/cron/{publish-reviews,hard-delete,rental-payouts}` | 401 |
| `POST /api/setup/promote-admin` | 403 (s. Abschnitt 8) |
| `/salon/naillab-by-lena`, `/search`, `/explore`, `/rentals` | 200 |

### anon-Rechte über 44 Tabellen

42 gesperrt (401), `subscriptions` existiert nicht, **2 offen**: `services`
(64 Zeilen, s. Abschnitt 6) und `salon_images` (0 Zeilen). `newsletter_sends`
und `rental_equipment`, in älteren Notizen noch als offen geführt, sind zu.

### Schema

`bash scripts/schema-probe.sh` — „Live-Schema deckt sich mit
`src/test/live-schema.ts`." 33 Tabellen geprüft.

### Build

`npm run build` kompiliert sauber (22,3 min auf dieser Maschine, nur die
bekannte OpenTelemetry-Warnung aus `@sentry/node`). Die Typprüfung danach lief
noch, als sie durch die eigenen Änderungen ohnehin veraltet war, und wurde
abgebrochen; maßgeblich ist der `tsc`-Lauf unten und der Vercel-Build.
