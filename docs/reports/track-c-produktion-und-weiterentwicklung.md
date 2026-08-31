# Track C — Produktion prüfen und weiterentwickeln

**Stand:** 31.08.2026 · **Basis:** `dbd5f0d` (fix: UTC/Berlin timezone in cancel test)
**Ergebnis:** `2cb81e7` · fünf Commits, alle gepusht und per `verify-push.sh` bestätigt
**Methode:** Quelltext-Prüfung plus Messung gegen `www.chairmatch.de` —
ausschließlich lesend, ohne Dienstschlüssel. Keine Zahlung ausgelöst, kein
Preis gesetzt, kein Test entfernt.

---

## Zusammenfassung

Zwölf Bereiche waren zu prüfen. Gefunden wurden elf Befunde; alle sind behoben.
Die drei teuersten liegen dort, wo dieses Projekt sein Geld verdient: an der
Terminstrecke.

| # | Befund | Bereich | Schwere | Commit |
|---|--------|---------|---------|--------|
| 1 | Ein Salon konnte eine Terminanfrage nicht ablehnen | Terminlogik | **P1** | `6fcca4a` |
| 2 | Alle vier Statuswechsel meldeten Erfolg, auch wenn nichts geschrieben wurde | Terminlogik | **P1** | `6fcca4a` |
| 3 | Eine Absage benachrichtigte niemanden | Terminlogik | P2 | `6fcca4a` |
| 4 | Der Stadtfilter der Suche fand keine echten Salons | Suche | P2 | `6fcca4a` |
| 5 | „Nächste zuerst" sortierte echte Salons gar nicht | Suche/Karte | P2 | `6fcca4a` |
| 6 | Hochgeladene Salonbilder waren auf der Salonseite unsichtbar | Salonseiten | **P1** | `1ca5aa8` |
| 7 | Ein Lesefehler beantwortete die Salonseite mit „nicht gefunden" | Error Handling | **P1** | `1ca5aa8` |
| 8 | Feiertage und Ruhetage waren im Kalender wählbare Tage | Buchungsflow | P2 | `5c2cec6` |
| 9 | Der bezahlte Termin wurde storniert, das Geld blieb liegen | Zahlungen | **P1** | `5b333b3` |
| 10 | Die einzige Prüfung für das Edge-Bundle war der Vercel-Build | CI | P2 | `2cb81e7` |
| 11 | Zu kleine Tap-Ziele auf `/search` und `/karte` | Mobile UX | P3 | `2cb81e7` |

**Tests:** 1733 → 1773 grün (+40), 88 → 93 Dateien. Kein Test entfernt oder
abgeschwächt. `tsc --noEmit` sauber, ESLint 0 Fehler.

**Produktionssonde:** alle 22 Erwartungen erfüllt, vor und nach den Commits.

---

## 1 (P1) · Es gab keinen Weg, eine Terminanfrage abzulehnen

`VALID_TRANSITIONS` kannte `pending → cancelled` nur für den `customer`:

```ts
{ from: 'pending', to: 'confirmed', actor: 'provider' },
{ from: 'pending', to: 'cancelled', actor: 'customer' },
```

`PATCH /api/bookings/[id]` kannte den Zielstatus `cancelled` überhaupt nicht
(`default: 'Ungültiger Status'`), und der zweite Einstieg,
`POST /api/bookings/[id]/cancel`, lief für den Anbieter in
`validateTransition(...) === false` → „Stornierung nicht möglich."

Der Terminkalender des Anbieters hatte dazu passend genau einen Knopf:
`✓ Bestätigen`.

**Warum das mehr ist als eine fehlende Schaltfläche.** `pending` steht in
`BLOCKING_STATUSES`. Eine offene Anfrage sperrt den Zeitraum in
`checkConflict` und in `/api/availability` für jeden anderen Kunden — bis sie
irgendwann in der Vergangenheit liegt. Ein Salon, der eine Anfrage nicht
annehmen kann (Urlaub, Doppelbelegung außerhalb des Systems, Kunde meldet
sich nicht), konnte den Platz also nicht wieder freigeben.

**Behoben:** Transition ergänzt, `cancelled` in der PATCH-Route verdrahtet
(die Autorisierung sitzt unverändert in `cancelBooking` — die Route ist nicht
die Kontrollstelle), und im Kalender stehen jetzt `✕ Ablehnen` (offen) bzw.
`✕ Absagen` (bestätigt), mit optionalem Grund, der beim Kunden ankommt.

---

## 2 (P1) · Statuswechsel meldeten Erfolg, ohne etwas zu schreiben

Alle vier Aktionen sahen so aus:

```ts
await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId)
// … kein Blick auf das Ergebnis …
return { success: true }
```

supabase-js **wirft bei Datenbankfehlern nicht**, es gibt `{ error }` zurück.
Ein entzogenes Recht (42501), ein Verbindungsabbruch (08006) oder eine
fehlende Spalte führte damit dazu, dass die Oberfläche „Termin bestätigt"
meldete, während die Zeile unverändert auf `pending` stand. Es ist dieselbe
Klasse, die dieses Projekt an einem Dutzend anderer Stellen bereits
ausgebaut hat — hier stand sie noch am Kernprodukt.

**Behoben** durch `writeStatus()`:

* Fehler → 503 mit einem Satz, der den Grund nennt.
* `.eq('status', erwartet)` sichert gegen das Rennen ab.
* Trifft das UPDATE keine Zeile, wird **nachgelesen**: steht dort bereits der
  Zielstatus, war es ein Doppelklick — Erfolg, aber ohne zweite Mail und ohne
  zweiten Audit-Eintrag. Steht dort etwas anderes, ist es 409.

Der letzte Punkt ist der Grund, warum der bestehende Test
„doppelte Stornierung gleichzeitig" unverändert grün bleibt: die zweite
Zustellung läuft weiterhin ins Leere, sie meldet nur nichts mehr, was nicht
passiert ist.

---

## 3 (P2) · Eine Absage erreichte niemanden

`cancelBooking` schrieb den Status, legte einen Audit-Eintrag an und war
fertig. Der Salon erfuhr von der Absage seines Kunden nur beim nächsten
Neuladen des Kalenders; ein vom Salon abgesagter Termin stand beim Kunden
weiter im Terminplan. Das **Anlegen** einer Buchung verschickt seit jeher
Mails an beide Seiten — die Absage ist die dringendere Nachricht.

**Behoben:** In-App-Benachrichtigung an die Gegenseite plus Mail. Neu ist
`sendBookingCancellation` (an den Kunden); für den Salon gab es
`sendProviderNotification(type: 'cancellation')` bereits — ohne Aufrufer.
Alles best effort: eine nicht zugestellte Mail macht die geschriebene Absage
nicht rückgängig.

Ein **Betrag** steht bewusst nirgends. `bookings` hat keine Spalte, die eine
Stornogebühr aufnehmen könnte, und `booking_policies` führt nur
`no_show_fee_cents` — das ist die Gebühr fürs Nichterscheinen.

---

## 4 (P2) · Der eigene Stadtfilter fand keine echten Salons

```ts
if (city) query = query.ilike('city', city)   // ohne Platzhalter = exakt
```

`ilike` ohne `%` ist ein exakter, nur case-insensitiver Vergleich. Die
Stadt-Schnellfilter derselben Seite verlinken auf `?city=Frankfurt`; steht in
`salons.city` „Frankfurt am Main", war der Salon über den eigenen Filter nicht
zu finden. Getroffen wurden ausschließlich die Demo-Anbieter — die werden
weiter unten mit `includes()` verglichen.

**Gegenprobe an der Produktion** nach dem Deploy:

```
GET /search?city=Frank
  → /salon/blacklabel-barbershop
  → /salon/glitter-glow-nails
  → /salon/medcenter-op-raeume
  → /salon/p9            (Demo)
```

Drei echte Salons bei einem Teiltreffer, den das alte exakte `ilike` nie
geliefert hätte.

---

## 5 (P2) · „Nächste zuerst" sortierte echte Salons gar nicht

`SearchClient` holte lat/lng **ausschließlich** aus `PROVS` (den Demo-Daten):

```ts
const demo = PROVS.find(p => p.id === s.id || p.nm.toLowerCase() === s.name.toLowerCase())
const lat = demo?.lat || 0
const dist = refLocation && lat ? haversine(...) : null
```

Jeder echte Salon bekam `lat = 0` und damit `dist = null`. Die
Umkreissortierung ordnete also nur die erfundenen Einträge.

**Behoben:** die Koordinaten kommen jetzt serverseitig aus `cityToCoords()` —
dieselbe Näherung über den Städtenamen, mit der die Stuhl-Karte arbeitet
(`salons` hat live keine lat/lng-Spalten). Die ~90-Einträge-Tabelle bleibt auf
dem Server, der Client bekommt zwei Zahlen.

Zwei Nebenbefunde derselben Stelle:

* **Der Vergleich war nicht transitiv.** Fehlte *eine* Entfernung, fiel er auf
  die Bewertung zurück: A vor B nach Entfernung, B vor C nach Bewertung, C vor
  A nach Entfernung. Je nach Ausgangsreihenfolge kam etwas anderes heraus.
  Jetzt in `lib/search-sort.ts` als prüfbare Funktion, Einträge ohne Position
  ans Ende.
* **`formatDistance` schrieb „000 m".** Der Meter-Zweig war
  `(km * 10).toFixed(0) + '00 m'` — Zehntelkilometer plus zwei angehängte
  Nullen. Unter 50 Metern ergab das `000 m`; das `.replace('.', ',')` darin
  konnte nie greifen, weil `toFixed(0)` keinen Punkt enthält.

---

## 6 (P1) · Die hochgeladenen Salonbilder waren unsichtbar

Anbieter können über `/provider/bilder` Logo, Cover, Galerie, Team und
Vorher-Nachher hochladen; `POST /api/upload` legt sie in `salon_images` ab.
`/listings/[slug]` holt daraus wenigstens das Logo.

Die **öffentliche Salonseite** — die Seite, für die man Bilder überhaupt
hochlädt — hat `salon_images` nie gelesen. Sie zeigte einen Farbverlauf mit
einem Bild-Platzhalter-Symbol und als Avatar die zwei Anfangsbuchstaben des
Salonnamens.

**Behoben:** Cover (sonst das erste Galeriebild) als Kopfbild, Logo im Avatar,
Galerie als scrollbarer Streifen. Über `next/image` — die Supabase-Domain
steht längst in `remotePatterns` und in der CSP —, das Kopfbild mit `priority`
(es ist das LCP-Element dieser Seite), die Galerie mit `loading="lazy"`.

Dazu `image` im LocalBusiness-JSON-LD: ohne dieses Feld zeigt Google zum
Eintrag gar kein Bild.

---

## 7 (P1) · Ein Lesefehler wurde zu „Seite nicht gefunden"

Der gesamte Datenbankteil der Salonseite lag in

```ts
try { … } catch { notFound() }
```

und der Fehler der Abfrage wurde nicht einmal angesehen (`const { data } = …`).
Verbindungsabbruch, entzogenes Recht, Timeout, Programmierfehler — alles wurde
zu „Seite nicht gefunden", mit `robots: noindex` im Kopf. Und weil die Seite
mit ISR läuft (`revalidate = 300`), bleibt eine solche Antwort **bis zu fünf
Minuten für alle Besucher** stehen.

**Behoben:** jede Abfrage entscheidet einzeln. Keine Zeile → `notFound()`.
Fehler → geworfen, also `(public)/error.tsx` mit „bitte erneut versuchen". Die
Bilder sind ausgenommen: ihr Lesefehler wird protokolliert, die Seite bleibt
ohne Bilder vollständig bedienbar.

**Der erste Entwurf dieses Fixes war wirkungslos**, und der neue Test hat es
gezeigt: das geworfene `Salon konnte nicht geladen werden` landete noch im
umschließenden `catch` und kam als 404 heraus.

```
AssertionError: expected [Function] to throw error matching /nicht geladen/i
  but got 'NEXT_HTTP_ERROR_FALLBACK;404'
```

Nebenbefund: der Rückfall auf `.eq('id', slug)` lief für **jeden**
nicht-UUID-Slug in Postgres' `22P02` („invalid input syntax for type uuid").
Er läuft jetzt nur noch, wenn der Slug überhaupt eine UUID sein kann.

---

## 8 (P2) · Feiertage und Ruhetage waren wählbare Tage

Beide Buchungsstrecken — der Monatskalender unter `/salon/[slug]/buchen` und
der Sieben-Tage-Streifen unter `/booking/[salonId]` — kannten genau einen
Grund, einen Tag zu sperren: `iso(...) < heute`.

Serverseitig ist beides seit Track 25 dicht. Der Kunde erfuhr es aber erst
**nach** der Auswahl und einem Aufruf von `/api/availability` — und musste
danach raten, welcher Tag denn geht. Bei einem Salon mit zwei Ruhetagen sind
das zwei von sieben Versuchen ins Leere.

Die Daten dafür waren immer da: `state` und `opening_hours` stehen seit jeher
in `SALON_PUBLIC_COLUMNS` von `/api/salons/[id]`. Beide Seiten haben sie nie
angesehen.

**Behoben** über `tagGesperrt()` in `lib/booking-days.ts`, gerechnet mit
genau denselben Funktionen wie serverseitig (`istFeiertag`, `hoursForDay` aus
`lib/salon-open.ts` — reines Rechnen ohne Serverbezug), damit Anzeige und
Abweisung nicht auseinanderlaufen können. Gesperrte Tage sind durchgestrichen
und ausgegraut, mit `title`, `aria-label` und einer Legende — `title` allein
sieht auf dem Handy niemand.

**Gegenprobe an der Produktion** (NailLab by Lena, Hamburg):

```
2026-09-02 (Mi)  → 37 Slots
2026-09-06 (So)  → {"unavailable":"closed_day"}
2026-10-03 (Sa)  → {"unavailable":"holiday"}
```

Beides ist jetzt schon im Kalender zu sehen, statt erst danach.

Zwei Entscheidungen bewusst wie serverseitig: „keine Angabe" ist **nicht**
„geschlossen" (ein Salon ohne gepflegte Zeiten bleibt buchbar — sonst legt
eine leere Spalte den Betrieb still), und ohne verwertbares `salons.state`
gelten die neun bundesweiten Feiertage.

Nebenfix im Tagesstreifen: die Vorauswahl stand fest auf Index 0, also auf
heute. Fällt heute auf einen Feiertag, war die erste Auskunft der Strecke
„geschlossen", obwohl morgen offen ist.

---

## 9 (P1) · Der bezahlte Termin wurde storniert, das Geld blieb liegen

`cancelBooking` hat `payment_status` nie angesehen. Ein per Stripe bezahlter
Termin ließ sich absagen, und danach stand die Buchung auf `cancelled`,
während die Zahlung unverändert auf `paid` stand. Keine Erstattung, kein
Hinweis, kein Vermerk im Audit-Log.

Die Miet-Strecke macht es seit jeher richtig
(`/api/rental-bookings/[id]/cancel`: Erstattung prüfen, auslösen, und ein
Fehlschlag heißt **nicht stornieren**). Der Termin stand daneben. Alles Nötige
war vorhanden: `bookings` führt `stripe_payment_intent`, und `createRefund`
gibt es in `lib/stripe`.

**Wer sein Geld automatisch zurückbekommt:**

| Fall | Erstattung | Begründung |
|------|-----------|------------|
| Der Salon sagt ab | immer | Der Kunde hat sich nichts vorzuwerfen. |
| Der Kunde sagt **fristgerecht** ab | immer | Genau das sagt die Frist zu. |
| Der Kunde sagt **verspätet** ab | **nein**, und der Fall wird benannt | siehe unten |

Der dritte Fall ist die einzige interessante Entscheidung. Was dem Salon bei
einer verspäteten Absage zusteht, **weiß dieses System nicht**: `bookings` hat
keine Spalte für eine Stornogebühr, und `booking_policies` führt nur
`no_show_fee_cents` — das ist die Gebühr fürs Nichterscheinen, nicht für eine
verspätete Absage. Eine automatische Vollerstattung wäre hier genauso
erfunden wie ein einbehaltener Betrag. Der Fall geht deshalb über
`/api/admin/refund` und wird dem Kunden als das benannt, was er ist.

Scheitert die Erstattung bei Stripe, wird **nicht** storniert (502): eine
stornierte Buchung ohne Geld zurück ist der schlechteste aller Zustände.
„Bezahlt ohne Zahlungsreferenz" und „Stripe nicht konfiguriert" werden
storniert, aber ausdrücklich benannt — geraten wird nichts.

Beide Oberflächen sagen es jetzt: `/termine` hängt an die Fristmeldung an, was
mit der Zahlung passiert ist; der Anbieter-Kalender warnt **vor** dem Klick
(„Der Termin ist bezahlt — die Zahlung wird dabei vollständig erstattet") und
bestätigt danach. Das Audit-Log führt `wasPaid`, `refunded` und
`refundHinweis`.

---

## 10 (P2) · Für das Edge-Bundle gab es nur eine Prüfung: den Vercel-Build

`src/middleware.ts` läuft in der Edge-Laufzeit. Alles, was von dort aus
statisch importiert wird, landet im selben Bundle — und ein `node:`-Import
darin bricht den Vercel-Build. Weder `tsc --noEmit` noch vitest sehen das:
beide laufen unter Node, wo `node:crypto` selbstverständlich auflöst. Genau so
ist es diesem Projekt schon einmal passiert, über
`middleware.ts → modules/auth/auth.config.ts`. Gemerkt hat man es nach dem
Push, am roten Deploy.

Neu ist `src/__tests__/edge-bundle-guard.test.ts`: der Test rechnet den
statischen Importgraph ab `middleware.ts` nach und fällt bei jedem
`node:`-Import. Einer der vier Fälle prüft, dass der Graph überhaupt gefunden
wurde — ein stiller Auflöser-Ausfall wäre sonst ein grüner Test, der nichts
prüft.

**Was der Graph heute enthält** (9 Module):

```
src/middleware.ts
  → src/modules/auth/auth.config.ts
      → src/lib/totp.ts        import { createHmac, randomBytes } from 'crypto'
```

Ohne `node:`-Präfix, und der Build läuft damit (die Produktion ist live).
`verifyToken` wird ausschließlich in `authorize()` benutzt, das in der
Middleware nie läuft — dort wird nur das JWT geprüft. Diese eine Ausnahme
steht **namentlich** in der Liste `ERLAUBT`, statt die Regel aufzuweichen; ein
zweiter solcher Import fällt auf, statt mitzulaufen. Ein Eintrag in `ERLAUBT`,
den es im Graph nicht mehr gibt, lässt den Test ebenfalls fallen.

Dazu läuft ESLint jetzt in der CI. `next.config.ts` setzt
`eslint: { ignoreDuringBuilds: true }`, der Vercel-Build prüft also nichts
davon — ESLint lief bis hierher nirgends automatisch.

---

## 11 (P3) · Zu kleine Tap-Ziele

Die Stadt-Chips und die Sortierknöpfe auf `/search` waren rund 25 px hoch, der
PLZ-Knopf 36, die Filterchips auf `/karte` 30. Empfohlen sind 44 px (Apple)
bzw. 48 dp (Android), und diese Seiten werden fast ausschließlich auf dem
Handy benutzt. Jetzt 40 bzw. 44 px bei gleicher Optik, dazu `aria-pressed`
an den Sortierknöpfen und `aria-current` an den Kartenfiltern — der aktive
Zustand war bisher rein farblich.

---

## Was offen bleibt

### Der Soft-404 auf `/salon/<unbekannt>` — weiterhin 200

```
GET https://www.chairmatch.de/salon/gibtsnicht-xyz  →  200
```

Track E hat vermutet, die Suspense-Grenze aus `(public)/loading.tsx` schiebe
die Hülle samt Status hinaus, bevor `notFound()` greift. **Diese Vermutung
trägt nicht:** es gibt zusätzlich ein `src/app/loading.tsx` auf der Wurzel, das
für *jede* Route gilt — auch für `/magazin/[slug]` und `/[stadt]`, die sauber
mit 404 antworten. Die Trennlinie ist damit nicht das `loading.tsx`, sondern
`dynamicParams = false`: bei diesen Routen stehen alle gültigen Parameter zur
Bauzeit fest, ein unbekannter wird gar nicht erst gerendert.

Für `/salon` steht die Liste in der Datenbank, und ein neu freigeschalteter
Salon muss ohne Deploy erreichbar sein. Der Statuscode ist damit nicht ohne
eine Produktentscheidung zu heilen. Der SEO-Schaden ist begrenzt: die Seite
trägt `robots: noindex` (seit Track E) und einen ehrlichen Titel.

### `verifyToken` aus dem Edge-Bundle nehmen

Der saubere Schritt zu Befund 10 wäre, `lib/totp.ts` per dynamischem Import
aus dem Edge-Graph zu nehmen. Ohne einen durchgelaufenen `npm run build` ist
das nicht zu verantworten — und genau der war auf dieser Maschine nicht
durchzubekommen (Load 23+, Abbruch nach 35 Minuten). Der Guard hält den
Zustand bis dahin fest.

### Zwei Migrationen weiterhin nicht angewendet

Unverändert aus dem Migration-Ledger: **CM23** (Schema-Teil) und **CM24**
(`services`/`salon_images` anon-Lockdown). Der zweite ist der Rest des
Track-20-Befunds: die vollständige Preisliste eines gesperrten Salons ist
weiterhin unter dem öffentlichen Schlüssel lesbar. Beide brauchen einen
Datenbankzugang, den dieser Track nicht hatte.

---

## Prüfungen

```
npx vitest run          93 Dateien, 1773 Tests, alle grün   (vorher 88 / 1733)
tsc --noEmit            sauber
npm run lint            0 Fehler, 20 Warnungen (unverändert)
scripts/prod-probe.sh   alle 22 Erwartungen erfüllt
scripts/verify-push.sh  main @ 2cb81e7 ist auf origin
```

**Neue Testdateien**

| Datei | Fälle | Was sie festhält |
|-------|-------|------------------|
| `e2e/termin-absage.test.ts` | 14 | Ablehnen, Absagen, fehlgeschlagene Statuswechsel, Erstattung in fünf Lagen |
| `e2e/salonseite-bilder.test.ts` | 5 | Bilder werden durchgereicht; Lesefehler ≠ 404 |
| `lib/__tests__/search-sort.test.ts` | 4 | Sortierung, inkl. Reihenfolge-Unabhängigkeit |
| `lib/__tests__/geo-distanz.test.ts` | 6 | nie mehr „000 m" |
| `edge-bundle-guard.test.ts` | 4 | kein `node:`-Import ab `middleware.ts` |

Dazu sieben Fälle für `tagGesperrt` in `lib/__tests__/booking-days.test.ts`
(inklusive Fronleichnam, das in NRW ein Feiertag ist und in Berlin nicht) und
eine Zeile in `booking.service.test.ts` für die neue Transition.

`e2e/salonseite-bilder.test.ts` ruft die Server-Komponente wirklich auf und
prüft die Props, mit denen sie `SalonDetailClient` aufruft — bis hierher gab
es für die Seiten unter `(public)` nur Quelltext-Prüfungen.
