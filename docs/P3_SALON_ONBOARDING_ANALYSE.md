# P3 — Salon-Onboarding: Backend-Analyse und geschlossene Lücken

> Stand: 2026-09-02 · Projekt `pwdbjqfpgumyfktbfswg`
> Typecheck grün · `npm run build` grün · 1821 Tests grün

---

## 1. Der Hauptbefund in einem Satz

**Die drei Onboarding-Wizards endeten im Nichts.** Sie sammelten vier
Schritte lang Kategorien, Leistungen, Stammdaten, Ausstattung, Preise und
Einwilligungen — und schrieben das Ergebnis in den `localStorage` des
Browsers. Danach las es niemand mehr.

```
/anbieter/onboarding   →  localStorage  →  /auth?mode=register&role=anbieter
/vermieter/onboarding  →  localStorage  →  /auth?mode=register&role=vermieter
/mieter/onboarding     →  localStorage  →  /auth?mode=register&role=mieter
```

Es gab keine Route, keine Server Action und keinen Job, der aus einem
Entwurf eine Zeile in `salons`, `services` oder `rental_equipment` gemacht
hätte. Die einzigen zwei Leser der Entwürfe im gesamten Code:

| Datei | liest | wozu |
|---|---|---|
| `src/app/(public)/konto/page.tsx` | *ob* ein Entwurf existiert | Rolle für die Anzeige im Browser |
| `src/app/(public)/anbieter/mein-salon/page.tsx` | `obj.cats` | Hygiene-Hinweis einblenden |

Ein Anbieter, der den Wizard vollständig durchlief, hatte danach: **keinen
Salon, keine Leistung, kein Inserat, Rolle `kunde`** — und wurde von
`(provider)/layout.tsx` per `isProviderOrAbove()` wieder auf `/auth`
geworfen. Der Weg war eine Sackgasse.

Erschwerend kamen zwei Details dazu:

* **Das Weiterleitungsziel gab es nicht.** Die Wizards pushten
  `?mode=register&role=…`. Die Auth-Seite liest `?tab=register`; `mode` und
  `role` kennt sie nicht. Der Anbieter landete auf dem **Login**-Tab, ohne
  Konto.
* **`/api/auth/register` nimmt gar keine Rolle entgegen.** `registerSchema`
  hat kein Rollenfeld — jede Registrierung über `/auth` wird `kunde`. Die
  Rolle konnte strukturell nicht ankommen.

---

## 2. Was für die Salon-Registrierung existiert

### 2.1 Zwei parallele Wege

| Weg | Einstieg | Persistenz | Zustand |
|---|---|---|---|
| **A — Direktregistrierung** | `/register/anbieter` | `POST /api/register-provider` | **funktioniert** |
| **B — Wizard + Anmeldung** | `/anbieter/onboarding`, `/vermieter/onboarding` | *keine* | **war tot** — jetzt geschlossen |
| **C — OnboardingGate (Startseite)** | `src/components/OnboardingGate.tsx` | `POST /api/register-provider` | **toter Zweig**, siehe 5.1 |

Weg A ist gut gehärtet (Rate-Limit pro IP und pro Adresse, Passwort-Mail,
Aufräumen von Auth-Konto und Profil bei Fehlschlag, Einwilligungs-Protokoll
mit gehashter IP). Weg B war die komfortablere Oberfläche ohne Rückseite.

### 2.2 Bestehende Anbieter-Routen (alle angemeldet, alle intakt)

| Route | Zweck |
|---|---|
| `GET/PATCH /api/me/salon` | Stammdaten, Öffnungszeiten, Logo, Galerie |
| `GET/POST/PATCH/DELETE /api/provider/services` | Leistungen |
| `PATCH /api/provider/salon` | Salon-Felder mit Allowlist |
| `GET/PUT /api/me/payout-account` | Auszahlungskonto (gibt nur die letzten 4 Stellen zurück) |
| `GET/POST /api/me/listing` | Miet-Inserat |
| `POST /api/owner/documents` | Nachweise (Gewerbeschein, Hygiene) |
| `POST /api/stripe/connect` | Stripe-Connect-Onboarding |

**Die Nach-Onboarding-Pflege war vollständig da. Es fehlte allein der
Übergang vom Wizard dorthin.**

### 2.3 Supabase-Tabellen — vollständig vorhanden

`bash scripts/schema-probe.sh` (2026-09-02): *„Live-Schema deckt sich mit
`src/test/live-schema.ts`."*

Alles, was die Wizards abfragen, hat live eine Spalte:

| Wizard-Angabe | Ziel |
|---|---|
| Salon-Name, Kategorie, Adresse, Telefon | `salons.name/category/street/house_number/postal_code/city/phone` |
| Leistung + Dauer + Preis | `services.name/duration_minutes/price_cents/is_active` |
| Plätze, Ausstattung, Preise, Zeiten | `rental_equipment.type/name/features/price_per_{hour,day,week,month}_cents/available_{days,from,to}` |
| Einwilligungen | `audit_logs.details` |

**Das Schema war nie die Lücke.** Die Lücke war der Code dazwischen.

---

## 3. Geschlossene Lücken

### 3.1 Die Übernahme (neu)

* `src/modules/onboarding/onboarding.service.ts`
* `POST /api/onboarding/salon`
* `src/lib/onboarding-draft.ts` (Browser-Seite)
* `src/__tests__/onboarding-uebernahme.test.ts` (23 Gegenproben)

Ablauf: Wizard → Entwurf lokal → `/auth?tab=register` → nach erfolgreicher
Anmeldung `POST /api/onboarding/salon` → Salon, Leistungen, Inserate,
Protokoll → Weiterleitung nach `/anbieter/mein-salon`.

Der Entwurf bleibt bis zur Anmeldung im Browser, weil es vorher keine
Sitzung gibt, an der ein serverseitiger Entwurf hängen könnte. Er wird
**nur bei Erfolg gelöscht**; scheitert die Übernahme, versucht es der
nächste Login erneut — die Route legt keine Dubletten an.

Garantien der Route:

| Garantie | Umsetzung |
|---|---|
| Nur für die eigene Sitzung | `getServerSession()`, keine `userId` im Body (`.strict()`) |
| Salon geht **nicht** live | `is_active: false`, `is_verified: false` — wie `/api/register-provider` |
| Rolle nur nach oben bis `anbieter` | Admin bleibt Admin, Anbieter bleibt Anbieter, niemand wird herabgestuft |
| Kein zweiter Salon | `getOwnedSalon()`, Leistungen/Inserate über Namen abgeglichen |
| Protokolliert | `audit_logs.action = 'onboarding_draft_applied'` inkl. Einwilligungen |
| Gedrosselt | 10/Stunde je Nutzer+IP, **nach** der Sitzungsprüfung gezählt |

### 3.2 Zwei Kacheln, die die Datenbank nicht kennt

`rental_equipment_type_check` (Migration CM22, live verifiziert) lässt genau
`'stuhl' | 'liege' | 'raum' | 'opraum'` zu. Der Vermieter-Wizard bietet
zusätzlich **`kabine`** und **`op`** an — jeder Abschluss wäre an `23514`
gescheitert. Abbildung jetzt in `onboarding.service.ts`:

* `op` → `opraum`
* `kabine` → `raum`, **Anzeigename „Kabine" bleibt erhalten**

### 3.3 IBAN und Steuer-ID lagen im Browser

Alle drei Wizards legten ihren `legal`-Block unverändert im `localStorage`
ab — **IBAN und Steuer-ID im Klartext, unbegrenzt haltbar**, lesbar für
jedes Skript auf der Domain. Beide waren Pflichtfelder. Gelesen hat sie
niemand.

Das ist dieselbe Konstellation, die `/api/register-provider` bereits hinter
sich hat (dortiger Befund 3: „erfragt, validiert, nie verwendet") — nur eine
Stufe schlechter, weil das Bankdatum den Browser nicht einmal verließ und
trotzdem liegen blieb.

Umsetzung:
* Felder aus den Wizards entfernt, Pflicht-Gating entsprechend gelockert
* `speichereEntwurf()` filtert `iban`, `tax`, `vat`, `ustid` **aktiv** heraus, auch wenn ein Aufrufer sie mitgibt
* Hinweis im Formular: Auszahlungsdaten nach der Anmeldung über `/anbieter/mein-salon/auszahlung` → `payout_accounts`

### 3.4 `/statistik` konnte das ganze Deployment kippen

Die Seite ist ISR (`revalidate = 3600`) und rief `getSupabaseAdmin()`
**ungeschützt** auf. Fehlte der Service-Role-Key oder war die Datenbank im
Build-Moment nicht erreichbar, endete `next build` mit

```
Export encountered an error on /(public)/statistik/page
Next.js build worker exited with code: 1
```

— das gesamte Deployment fiel aus, wegen einer Marketing-Seite mit sechs
Zahlen. Die sieben anderen datengetriebenen öffentlichen Seiten (`explore`,
`search`, `rentals`, `offers`, `category`, `[stadt]`, `empfehlungen` ) fangen
genau das längst ab; hier fehlte das Muster als einziges. Nachgezogen — die
Seite degradiert jetzt zum Ladefehler-Hinweis, statt den Build zu beenden.

*So ist dieser Befund überhaupt gefunden worden: der lokale Build ohne
Service-Role-Key scheiterte genau dort.*

---

## 4. RLS — Antwort auf die Dashboard-Meldung

Der Repo-Bestand kennt `ENABLE ROW LEVEL SECURITY` für 53 Tabellen. Die
Live-Tabellenliste enthält **neun weitere, für die es im ganzen Repo keine
gibt**:

`salons`, `services`, `bookings`, `booking_policies`, `staff`,
`promo_codes`, `rental_bookings`, `error_logs`, `newsletter_sends`

**Anon-Sonde 2026-09-02 (nur lesend): alle neun antworten mit 401.** Für
nicht angemeldete Zugriffe ist damit alles zu. Nebenbefund: `services` und
`newsletter_sends` waren früher anon lesbar — das ist inzwischen
geschlossen.

**Das ist nur die halbe Frage.** Der eigentliche Schaden einer fehlenden RLS
liegt bei der Rolle `authenticated`: besteht dort ein Tabellen-GRANT und ist
RLS aus, kann jedes angemeldete Konto mit seinem eigenen JWT direkt unter
`/rest/v1/<tabelle>` lesen und schreiben — an der Anwendungslogik vorbei.
Bei `bookings` und `staff` wäre das fremdes PII, bei `salons` das
Freischalt-Flag `is_active`. Diese Probe braucht ein echtes Nutzer-JWT und
ist **nicht gelaufen**.

Vorbereitet: `supabase/migrations/20260902_rls_restliche_tabellen.sql`
(`ENABLE` + `FORCE ROW LEVEL SECURITY`, `REVOKE ALL FROM anon,
authenticated`, keine Policies — kein Client liest diese Tabellen direkt).
Die Migration ist **committet, nicht angewendet**: es gibt keinen
Migrations-Runner und diese Sitzung hat keinen DB-Schreibzugang. Vier
Gegenproben stehen am Dateiende, der Eintrag im Ledger unter „Offen".

---

## 5. Offen — Produktentscheidungen, nicht Technik

### 5.1 Welcher Onboarding-Weg gilt?

`OnboardingGate.tsx` (Startseite) hält `role` fest auf `'CUSTOMER'`: der
Setter hing an einer Funktion, die niemand aufruft. Der B2B-/Anbieter-Zweig
dieser Komponente ist toter Code, und `finish()` meldet jede Anmeldung als
Kundin. Gleichzeitig führt der Welcome-Splitter über `localStorage.cm_role`
und `window.location.assign()` zu den eigenständigen Wizards.

**Es gibt zwei Onboarding-Systeme nebeneinander.** Welches gelten soll, ist
eine Produktentscheidung und wird hier nicht stillschweigend getroffen —
diese Arbeit hat den Weg funktionsfähig gemacht, über den der Splitter
tatsächlich führt.

### 5.2 Mieter-Onboarding

Nicht geschlossen. `tenant_profiles` und `/api/me/tenant-profile` existieren,
decken den Entwurf aber nur teilweise: `display_name`, `job`,
`license_number`, `search_city`, `search_radius_km`. **Budget, Mietdauer und
Sprachen haben live keine Spalte.** Sie zu erfinden hieße, das Schema zu
raten. Korrigiert wurden dort nur die beiden Fehler ohne Ermessensspielraum:
das falsche Weiterleitungsziel und die Steuer-ID im `localStorage`.

### 5.3 Adressen ohne Stadt

Die Wizards haben **ein** Adressfeld, `salons` hat vier Spalten. Zerlegt wird
nur die eindeutige deutsche Schreibweise (`Musterstraße 12, 10115 Berlin`).
Passt sie nicht, landet der ganze Text in `street`, `city` bleibt leer und
die Antwort meldet `adresseUnvollstaendig: true`. **Eine falsch geratene
Stadt wäre schlimmer als eine fehlende** — der Salon erschiene unter dem
falschen Ort in `/[stadt]` und im Matching.

---

## 6. BUSINESS_DECISION_REQUIRED — Technik vorbereitet, keine Werte gesetzt

Sechs Stellen waren markiert, **eine siebte und achte sind dazugekommen**.
An keiner ist ein Betrag geändert worden.

| # | Ort | Inhalt | Vorbereitung |
|---|---|---|---|
| 1 | `marketplace-rules.ts:24` `COMMISSION_RULES` | Provisionssätze | Laufzeit liest `commission_rates` aus der DB; die Konstante ist nur der Notfallpfad |
| 2 | `marketplace-rules.ts:41` `SUBSCRIPTION_TIERS` | Abo-Preise | unverändert |
| 3 | `constants.ts:59` `SVC_CATALOG` | Service-Preise | siehe #7 |
| 4 | `constants.ts:137` `EQUIP_CATALOG` | Equipment-Stundensätze | unverändert |
| 5 | `constants.ts:211` `COMMISSION_DEFAULTS` | Provisions-Bandbreiten | unverändert |
| 6 | `commission.service.ts:13` `DEFAULT_RATE_PERCENT` | Notfall-Provisionssatz | unverändert |
| **7** | **`anbieter/onboarding/page.tsx` `SERVICES_BY_CAT`** | **eigener, zweiter Preiskatalog** | **entfernt — siehe unten** |
| **8** | **`statistik/page.tsx`** | **öffentliche Zusage „0% Provision für Salons"** | **markiert, Wert unverändert** |

### Zu #7 — die doppelte Erfindung

Der Anbieter-Wizard hatte einen **eigenen** Katalog mit festen Preisen
(Damenschnitt 45 €, Botox 250 €, Lippen-PMU 400 €), der dem bereits
markierten `SVC_CATALOG` **widersprach**: derselbe Herrenschnitt stand hier
mit 25 €, dort mit 28 €. Diese Beträge wären als Preise des Anbieters in
`services.price_cents` gelandet.

Gelöst ohne eine Zahl zu wählen: **der Katalog liefert nur noch Name und
Dauer, den Preis tippt der Anbieter selbst.** Wer das Feld leer lässt,
bekommt die Leistung **inaktiv** angelegt (`price_cents: 0`,
`is_active: false`) — nicht kostenlos und nicht geschätzt. Die Dauern sind
geblieben: eine Dauer ist eine fachliche Größe des Handwerks, kein
Preisschild.

Analog bei der Vermietung: fehlt der Tagespreis, wird das Inserat angelegt,
bleibt aber **offline** — genau das verlangt der Constraint
`rental_equipment_online_needs_price`.

### Zu #8

`/statistik` bewirbt öffentlich „0% Provision für Salons". Derselbe Satz
steht in `COMMISSION_RULES` und ist dort ausdrücklich als Platzhalter
markiert. Eine Zahl darf nicht an einer Stelle unbestätigt und an der
anderen beworben sein. Kommentar gesetzt, Wert unverändert.

---

## 7. Was yusuf entscheiden oder klicken muss

| # | Sache | Art |
|---|---|---|
| 1 | Migration `20260902_rls_restliche_tabellen.sql` einspielen | Supabase-Dashboard (SQL Editor) |
| 2 | Welcher Onboarding-Weg gilt: `OnboardingGate` oder die Wizards? | Produktentscheidung (5.1) |
| 3 | Die acht BUSINESS_DECISION_REQUIRED-Punkte | Geschäftsführung |
| 4 | Mieter-Onboarding: welche Felder sollen persistiert werden? | Produkt + Schema (5.2) |

Alles andere in diesem Bericht ist erledigt und im Repo.
