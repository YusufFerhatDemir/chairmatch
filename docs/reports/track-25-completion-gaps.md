# Track 25 — Completion-Gaps

**Stand:** 29.08.2026 · **Basis:** `a5c0c5c` · **Ende:** `20b1235`
**Tests:** 1615 → 1714 (99 neu) · **tsc:** sauber · **Lint:** 0 Fehler

---

## Zusammenfassung

Gesucht waren intern lösbare Lücken: fertige Backends ohne Bedienung, Module
ohne Aufrufer, Knöpfe ohne Wirkung. Gefunden wurden sechs — und bei der
**Produktionsverifikation** ein siebter, der schwerer wiegt als alle anderen
zusammen: der Buchungskalender antwortete live mit HTTP 500.

| # | Befund | Schwere | Zustand |
|---|--------|---------|---------|
| 1 | Slot-Route wirft 500 auf dem Live-Datenformat | **P1** | behoben, live nachgemessen |
| 2 | Öffnungszeiten/Feiertage serverseitig nicht durchgesetzt | **P1** | behoben |
| 3 | Bewertungs-Antwort: Backend fertig, kein UI | P2 | behoben |
| 4 | DSA-Meldung: Backend fertig, kein UI | P2 | behoben |
| 5 | Stripe-Connect + Abo-Upgrade: `alert()`-Attrappen | P2 | behoben |
| 6 | Provisionen: Lesefehler wird als 0 € gemeldet | P2 | behoben |
| 7 | `lib/scheduling.ts` — totes Modul, das zwei Tracks irregeführt hat | P3 | entfernt |

---

## 1 (P1) · Der Buchungskalender war in der Produktion tot

**Gefunden bei der Verifikation, nicht im Review.** Der Befund ist älter als
dieser Track; die neue Feiertagsprüfung hat ihn nur sichtbar gemacht.

Messung gegen `www.chairmatch.de`, Salon „NailLab by Lena", öffentliche Route:

```
GET /api/availability?...&date=2026-09-15  →  500
GET /api/availability?...&date=2026-12-25  →  200  {"unavailable":"holiday"}
```

Der 15.09. ist ein gewöhnlicher Dienstag. **Der Unterschied war der Hinweis:**
die neue Feiertagsprüfung steht vor der Zeitendeutung und kehrt am 25.12. früh
zurück — an jedem Werktag lief die Route weiter und stürzte ab.

### Ursache

`lib/opening-hours.ts` führt `"09:00 - 18:00"` als „das EINE Format". Live
steht dort etwas anderes:

```json
{ "mo": { "open": "09:00", "close": "18:00" }, "so": null }
```

Kleingeschriebene Kürzel, ein **Objekt** je Tag, `null` für geschlossen. Fünf
von fünf geprüften Salons sahen so aus. Es gibt nicht zwei Formate, sondern
drei — und das dritte ist das verbreitete.

Die Route hatte eine eigene `parseHours(hours: string | null)`, die mit
`hours.match(…)` beginnt. Ein Objekt ist nicht `null`, der Wachposten
`if (!hours)` fiel also nicht, und `.match` gibt es darauf nicht. Um den
GET-Rumpf liegt kein `try/catch`: der TypeError kam als HTTP 500 heraus.

### Tragweite

Kein Randfall. Für jeden Salon in diesem Format war **jeder Tag mit gepflegten
Zeiten** betroffen, also der komplette Buchungskalender. Die Suche zeigte die
Salons, die Salonseite zeigte die Leistungen, und der Kalender darunter lief in
einen Serverfehler.

**Zweite Folge derselben Ursache:** `normalizeOpeningHours` verwarf mit
`typeof raw !== 'string'` jeden dieser Tage und gab `null` zurück. Das
Zeiten-Formular des Anbieters zeigte **leere Felder**, obwohl Zeiten
gespeichert waren — und wer dort speicherte, überschrieb seine echten Zeiten
mit dem Inhalt eines leeren Formulars.

### Nachweis nach dem Deploy

| Datum | Tag | Vorher | Nachher |
|---|---|---|---|
| 2026-09-15 | Di (09–18) | **500** | 200 · 33 Slots, 09:00 … 17:00 |
| 2026-09-17 | Do (09–**20**) | **500** | 200 · 41 Slots, 09:00 … 19:00 |
| 2026-09-20 | So (`null`) | **500** | 200 · 0 Slots |
| 2026-12-25 | Feiertag | 200 | 200 · `holiday` |

Die abweichende Donnerstagszeit belegt, dass die Tagesangaben wirklich
einzeln gelesen werden. Vier weitere Salons gegengeprüft: alle 200.

---

## 2 (P1) · Öffnungszeiten und Feiertage galten serverseitig nicht

`/api/availability` kannte keine Feiertage — `opening_hours` ist nach
Wochentagen gepflegt, und der 25.12.2026 ist ein Freitag. Die passende Prüfung
stand die ganze Zeit in `lib/scheduling.ts`, einem Modul ohne Aufrufer.

Die teurere Hälfte: **`createBooking` sah `opening_hours` nie an** — weder
Wochentag noch Uhrzeit noch Feiertag. Die Slot-Route war damit reine Anzeige.
Ein direkter POST auf `/api/bookings` legte einen Termin um 22:00 Uhr an einem
Sonntag mit „Geschlossen" an, verschickte beide Bestätigungsmails und belegte
den Slot.

### Zwei Entscheidungen, die nicht offensichtlich sind

1. **„Keine Angabe" ist nicht „geschlossen".** `parseHours` lieferte für
   `"Geschlossen"` und für eine fehlende Angabe dasselbe `null`. Für die
   Anzeige egal, für eine **Abweisung** nicht: ein Salon ohne gepflegte Zeiten
   hätte ab sofort keine Buchung mehr annehmen können. `hoursForDay`
   unterscheidet jetzt `closed` von `unknown`; abgewiesen wird nur, was positiv
   als geschlossen bekannt ist.
2. **`salons.state` wird im gesamten Code nirgends geschrieben**, steht also
   meist auf NULL. Ohne verwertbares Bundesland gelten die neun bundesweiten
   Feiertage — das erfindet nichts, sie gelten in allen 16 Ländern. Ein
   unbekannter Wert wird nicht geraten.

`lib/holidays.ts` fehlten drei reale Landesfeiertage: Internationaler
Frauentag (BE ab 2019, MV ab 2023) und Weltkindertag (TH ab 2019) — jeweils
mit Jahresgrenze, damit eine Abfrage für 2018 den 8. März nicht als Feiertag
meldet.

---

## 3 + 4 (P2) · Bewertungen: antworten und melden

Zwei vollständig gebaute, gehärtete Routen mit **null Aufrufern** im gesamten
Repository:

- `POST /api/reviews/[id]/reply` — Antwort des Saloninhabers (Track 10)
- `POST /api/reviews/[id]/report` — DSA-Meldung mit Audit-Eintrag (Track 10)

`/anbieter/mein-salon/bewertungen` **zeigte** eine Antwort (`{r.reply && …}`)
und bot nirgends an, eine zu schreiben. `reviews.reply` konnte damit nie einen
Wert bekommen — die Anzeige war seit jeher toter Code.

Die öffentliche Salonseite reicht `reply` seit jeher an `SalonDetailClient`
weiter, die Komponente führt es als Feld — und hat es **nie gerendert**. Eine
Antwort, die nur der Inhaber selbst sieht, ist keine.

Art. 16 DSA verlangt für nutzergenerierte Inhalte einen Meldeweg. Der Endpunkt
war fertig (10/h je Konto, Existenzprüfung, Audit-Eintrag `REVIEW_FLAGGED`, den
`/admin/audit-logs` bereits mit dem Label „Bewertung gemeldet" anzeigt) — es
gab nur kein Bedienelement.

---

## 5 (P2) · Drei `alert()`-Attrappen über fertigen Backends

| Knopf | Zeigte | Dahinter |
|---|---|---|
| Stripe-Anbindung aktivieren | „Demnächst verfügbar." | `POST /api/stripe/connect` (Track 22/24) — **kein Aufrufer** |
| Upgrade auf Premium/Gold | „Stripe noch nicht live." | `POST /api/stripe/checkout` (Track 16) |
| Details (Transaktion) | „Noch keine Details verfügbar." | Daten lagen in der Zeile |

Das ist jetzt **ehrlicher**, obwohl in der Produktion gerade kein
Stripe-Schlüssel gesetzt ist: `stripeUnavailable()` aus Track 24 antwortet
genau dann 503 mit einem Text, der sagt, was los ist. Der Anbieter liest den
echten Zustand statt eines fest verdrahteten Versprechens — und sobald die
Schlüssel in Vercel stehen, funktioniert der Knopf ohne weitere Änderung.

Beim Testen selbst gefunden: der gemeinsame Fehlerzustand erschien unter
**beiden** Knöpfen gleichzeitig. Meldung und Ladezustand hängen jetzt an der
Aktion, die sie ausgelöst hat.

---

## 6 (P2) · Ein Lesefehler ist kein Nullumsatz

`GET /api/admin/commissions` gab es seit dem Marketplace-Commit: ohne
Oberfläche, ohne Aufrufer, ohne Test. Der Stripe-Webhook schreibt bei jeder
Zahlung eine Zeile nach `commissions` — das Geld der Plattform stand in einer
Tabelle, die kein Bildschirm liest.

1. **Kein Fehler wurde angesehen.** Beide Abfragen destrukturierten nur `data`.
   Fällt die Abfrage aus, antwortete die Route `{ summary: { total: 0 } }` mit
   Status 200. Auf dem Bildschirm eines Admins steht dann „0 €" — die Aussage
   „die Plattform hat nichts verdient", wo „wir konnten es nicht lesen" gemeint
   war. Jetzt 503.
2. **Die Summe las ungedeckelt.** Ohne `range()` liefert PostgREST höchstens
   `db-max-rows` Zeilen (Supabase: 1000). Ab der 1001. Provisionszeile war die
   Gesamtsumme zu klein, ohne Hinweis. Jetzt seitenweise, mit `truncated: true`
   an der harten Obergrenze.

Neue Seite `/admin/provisionen` samt Nav-Eintrag. „0 €" erscheint nur, wenn
wirklich null Provisionen erfasst sind.

---

## 7 (P3) · `lib/scheduling.ts` entfernt

Der Export `getAvailableSlots` hatte im gesamten Repository keinen Aufrufer und
keinen Test — er ist nie gelaufen. Trotzdem führten Kommentare in
`booking.actions.ts`, `/api/me/salon` und `opening-hours.ts` ihn als lebenden
Leser der Öffnungszeiten.

**Daran hat sich Track 21 verlesen:** „`getAvailableSlots` filtert die Belegung
auf `staff_id` — eine Terminplanung pro Person ist also vorgesehen und wird
kommen." Die Belegung prüft ausschließlich `checkConflict`, und die kennt
`staff_id` nicht. Alle vier Kommentare korrigiert.

---

## Werkzeug

Zwei Abweichungen des E2E-Nachbaus, beide gefunden, weil ein Test an ihnen
scheiterte — dasselbe Muster wie das fehlende `upsert()` in Track 23:

- **`!inner` war ein LEFT JOIN.** PostgREST schließt bei
  `salons!inner(owner_id)` die Zeile aus; der Nachbau behielt sie und hängte
  `salon: null` an. `replyToReview` greift danach auf `review.salon.owner_id`
  zu — in Produktion sicher, im Nachbau ein TypeError und 500 statt 403/404.
  Ein Test, der die Eigentümer-Prüfung belegen wollte, hätte den TypeError des
  Nachbaus gemessen.
- **`.range()` gab es gar nicht.** „range is not a function" — genau so blieb
  `/api/admin/commissions` ohne Test.

---

## Gegenprobe

Produktivcode auf `a5c0c5c` zurückgesetzt, Tests und Harness behalten
(separater Worktree):

| Datei | Ergebnis |
|---|---|
| `salon-open.test.ts` | **25 von 25** — Modul fehlt, Datei lädt nicht |
| `oeffnungszeiten-feiertage.test.ts` | **10 von 18** fallen durch |
| `DashboardClient.stripe.test.tsx` | **10 von 12** fallen durch |
| `admin-provisionen.test.ts` | **5 von 9** fallen durch |
| `bewertung-antwort-meldung.test.ts` | 15 grün — s. u. |

Die Bewertungs-Tests laufen gegen den alten Produktivcode durch, und das ist
**richtig so**: die Backends waren bereits fertig, die Lücke war das fehlende
UI (von keinem automatischen Test erfasst). Mit *zusätzlich* zurückgesetzter
Harness fällt dort einer durch — der `!inner`-Test. Diese 14 Tests belegen
also Bestandsverhalten und schreiben es fest, statt neuen Code zu beweisen.

Die 20 Tests aus Teil 5 wurden nach der Gegenprobe ergänzt; ihre Regression ist
direkt gegen die Produktion gemessen (Tabelle in Abschnitt 1).

---

## Gemessener Stand

- **Tests:** 1714 grün, 87 Dateien (Basis: 1615)
- **`tsc --noEmit`:** sauber
- **Lint:** 0 Fehler, 20 Warnungen (alle Bestand, keine aus neuen Dateien)
- **Produktionssonde:** alle Erwartungen erfüllt, inkl.
  `/api/admin/commissions → 401`
- **`npm run build`:** kompiliert und typprüft sauber; der **lokale** Lauf
  bricht beim Prerendern von `/shop` ab, weil `SUPABASE_SERVICE_ROLE_KEY` in
  `.env.local` gar nicht gesetzt ist. Umgebungsgrenze, kein Codefehler —
  `/shop` wurde in diesem Track nicht angefasst, und Vercel hat den Schlüssel.
  Der Vercel-Build ist über die live nachgemessenen Antworten belegt.

## Offen

- `salons.opening_hours` wird von keiner Stelle **vereinheitlicht**. Der Code
  liest jetzt alle drei Formate; eine Datenmigration auf ein Format wäre
  sauberer, ist aber ein Schreibvorgang auf Produktionsdaten und keine
  Entscheidung, die ein Härte-Track still trifft.
- `salons.state` wird nirgends geschrieben. Solange das so bleibt, greifen nur
  die bundesweiten Feiertage. Ein Salon in Bayern arbeitet an Fronleichnam.
- Der Einreich-Service auf `/owner/authorities` bleibt „demnächst" — das ist
  eine Produktentscheidung mit Preisen und einer Zahlungsstrecke, keine
  Completion-Lücke.
