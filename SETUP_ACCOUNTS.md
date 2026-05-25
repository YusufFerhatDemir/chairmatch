# SETUP_ACCOUNTS.md — Account-Anlage für Welle 1 (Analytics/SEO/GEO)

Diese Checkliste fasst alles zusammen, was du **einmalig manuell** anlegen
musst, damit die in Welle 1 gebauten Integrationen scharf werden. Jeder
Schritt ~2 Minuten. Sortiert nach Priorität — oben zuerst.

Für **jeden** Eintrag gilt: du holst dir aus der UI **einen Wert** und
trägst ihn in **eine ENV-Variable** in Vercel ein:

> Vercel → Projekt `chairmatch` → Settings → Environment Variables
> → **alle drei Environments** (Production, Preview, Development) aktivieren
> → Save → **danach Redeploy auslösen** (Deployments → 3-Dots → Redeploy)

Code für GA4, Pixel und CAPI ist **schon im Repo** — sobald die ENV
gesetzt ist, ist die Integration live. Kein weiterer Code-Push nötig.

---

## 1. Google Analytics 4  ⏱ ~3 min  ▸ höchste Priorität

**Warum:** Standard für Web-Analytics. Sofortige Funnel-Auswertung,
Real-Time-Reports, Audience-Aufbau für Google Ads.

**Schritte:**

1. Öffne <https://analytics.google.com/> und melde dich mit deinem Google-Konto an.
2. Klick **„Verwaltung"** (Zahnrad unten links) → **„+ Erstellen"** → **„Konto"**.
   - Kontoname: `Chairmatch`
   - Datenfreigabe-Häkchen: nach Geschmack, "Vorgeschlagene Einstellungen" reicht.
3. **„Property erstellen"**: Name `Chairmatch Web`, Zeitzone `(GMT+01:00) Berlin`, Währung `EUR`.
4. **Branche:** "Schönheit & Fitness". **Größe:** "Klein".
5. **„Plattform wählen"** → **Web**.
6. URL: `https://chairmatch.de`, Stream-Name: `Chairmatch Production`. **Enhanced Measurement** anlassen.
7. Du landest auf der Stream-Detail-Seite → kopiere die **Measurement-ID** (Format `G-XXXXXXXXXX`).

**Eintragen in Vercel:**

| ENV-Variable                      | Wert            |
| --------------------------------- | --------------- |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID`  | `G-XXXXXXXXXX`  |

---

## 2. Google Search Console  ⏱ ~2 min  ▸ höchste Priorität

**Warum:** Pflicht für SEO. Zeigt welche Queries zu Klicks führen,
welche Seiten Google indexiert, technische Fehler, Sitemap-Status.

**Schritte:**

1. Öffne <https://search.google.com/search-console/welcome>.
2. **„Property hinzufügen"** → Typ **„Domain"** wählen (NICHT URL-Präfix — Domain deckt alle Subdomains + HTTP/HTTPS in einem Rutsch ab).
3. Domain eintragen: `chairmatch.de`.
4. Google zeigt einen **TXT-Record** zur DNS-Verifizierung. Form: `google-site-verification=xyz…`.
5. Kopiere den Wert (alles nach `=`).
6. Geh zu deinem Domain-Provider (z. B. Strato, Hetzner, INWX) → DNS-Verwaltung von `chairmatch.de` → **neuer TXT-Record**:
   - Name/Host: `@` (Root) oder leer lassen
   - Wert: kompletter String den Google angezeigt hat (mit `google-site-verification=` davor)
   - TTL: Standard (3600).
7. Speichern → in der Search Console **„Verifizieren"** klicken (kann 1–60 Min dauern, weil DNS).
8. Sobald verifiziert: in der Search Console links auf **„Sitemaps"** → eintragen: `sitemap.xml` → senden.

**Eintragen in Vercel:** *nichts.* Die Verifikation läuft 100% über DNS,
kein Code, keine ENV. Sitemap ist bereits unter `/sitemap.xml` aktiv.

---

## 3. Bing Webmaster Tools  ⏱ ~2 min  ▸ mittlere Priorität

**Warum:** Bing speist auch DuckDuckGo, Yahoo und ChatGPT-Search.
Reichweite die Google nicht abdeckt — kostet 2 Minuten.

**Schritte:**

1. Öffne <https://www.bing.com/webmasters/>.
2. **„Sign in"** mit Microsoft-Konto (oder Google/Facebook).
3. Auf der Startseite: **„Import your site from Google Search Console"** — der schnellste Weg, weil Bing dann die GSC-Verifikation übernimmt. (Nur möglich nachdem Schritt 2 fertig ist.)
4. Alternativ: **„Add site manually"** → `https://chairmatch.de` → DNS-TXT-Record analog zu GSC.
5. Sitemap eintragen: `https://chairmatch.de/sitemap.xml`.

**Eintragen in Vercel:** *nichts* (rein DNS-basiert).

---

## 4. Meta Business Suite + Meta Pixel  ⏱ ~5 min  ▸ mittlere Priorität

**Warum:** Pixel + Conversions API (CAPI) sind Pflicht wenn Meta-Ads
(Facebook/Instagram) geschaltet werden sollen. Auch ohne Werbung
liefert der Pixel wertvolle Audience-Daten für späteres Remarketing.

**Schritte:**

1. Meta-Business-Konto: <https://business.facebook.com/>
   - Falls noch keins: **„Konto erstellen"** → `Chairmatch`, deine Mail.
2. Im Business Manager: **„Mehr Tools"** → **„Events Manager"** → <https://business.facebook.com/events_manager2/>.
3. **„Daten verbinden"** → **„Web"** → **„Meta Pixel"** → Name `Chairmatch Web Pixel`.
4. **Bestätigen** → du landest auf der Pixel-Übersicht.
5. **Pixel-ID** (15-16-stellige Zahl) findest du oben links neben dem Pixel-Namen — kopieren.

**Eintragen in Vercel:**

| ENV-Variable                  | Wert                          |
| ----------------------------- | ----------------------------- |
| `NEXT_PUBLIC_META_PIXEL_ID`   | `1234567890123456` (Zahl)     |

**Optional — Conversions API (CAPI):** server-seitiger Pixel,
funktioniert trotz Adblocker/iOS-Tracking.

6. Im Events Manager → linke Sidebar → **„Einstellungen"** → Bereich **„Conversions-API"**.
7. **„Zugriffstoken generieren"** klicken → Token kopieren (langer String, beginnt mit `EAAB…`).

**Eintragen in Vercel:**

| ENV-Variable                  | Wert                          |
| ----------------------------- | ----------------------------- |
| `META_CAPI_ACCESS_TOKEN`      | `EAAB…` (server-only!)        |

*Optional Test-Mode:* im Events Manager → Tab **„Testereignisse"** →
Code kopieren (z. B. `TEST12345`) → in Vercel als `META_CAPI_TEST_EVENT_CODE`
eintragen. Damit landen Events im Test-Topf statt im Produktiv-Funnel.

---

## 5. Supabase-Migration für `analytics_events`  ⏱ ~1 min  ▸ Pflicht

**Warum:** Der eigene First-Party-Event-Stream (Web-Vitals, trackEvent,
Funnel-Analyse) schreibt in eine neue Tabelle, die manuell migriert werden
muss. Bis dahin antworten die API-Endpoints mit `202 migration_pending`
und Events gehen verloren.

**Schritte:**

1. Öffne <https://supabase.com/dashboard/project/_/sql/new> (du landest automatisch in deinem Projekt).
2. Öffne im Editor die Datei `supabase/migrations/20260525_analytics_events.sql` aus dem Repo (oder kopier-paste von GitHub).
3. Inhalt komplett in den SQL-Editor → **„Run"**.
4. Erwartete Ausgabe: `Success. No rows returned.`

**Eintragen in Vercel:** *nichts.* Wird sofort wirksam.

---

## 6. Bonus — Vercel Speed Insights / Analytics  ⏱ ~1 min  ▸ nice-to-have

Vercel hat eigene Web-Vitals + Visitor-Analytics. Doppelt zu unserer
First-Party-Lösung, aber kostenlos auf dem Hobby-Plan eingeschränkt.

1. Vercel-Projekt → Tab **„Analytics"** → **„Enable"**.
2. Vercel-Projekt → Tab **„Speed Insights"** → **„Enable"**.

Kein Code-Change nötig — Vercel injiziert automatisch.

---

## Reihenfolge in einer Sitzung

Wenn du alles in einem Rutsch machst:

1. **GA4** (3 min) — gibt dir sofort Funnel-Daten.
2. **Search Console** (2 min) — startet die SEO-Indexierungs-Telemetrie.
3. **Supabase-Migration** (1 min) — schaltet First-Party-Stream live.
4. **Bing** (2 min) — wenn GSC verifiziert ist, einfach importieren.
5. **Meta Pixel + CAPI** (5 min) — wenn du Meta-Ads planst.
6. **Vercel Analytics/Speed Insights** (1 min) — Bonus.

**Total ~14 Minuten.** Danach läuft die komplette Welle-1-Telemetrie scharf.

---

## ENV-Variablen — Komplett-Liste für Vercel

Diese Werte musst du in Vercel eintragen, damit Welle 1 vollständig aktiv ist:

```env
# Welle 1 — Analytics/SEO/GEO
NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_META_PIXEL_ID=1234567890123456
META_CAPI_ACCESS_TOKEN=EAAB…
# optional:
META_CAPI_TEST_EVENT_CODE=TEST12345
```

Alle drei Public-Variablen (`NEXT_PUBLIC_*`) sind im Browser sichtbar — das
ist gewollt und sicher (es sind keine Geheimnisse).
`META_CAPI_ACCESS_TOKEN` bleibt server-side, NIE im Browser.

---

## Wenn ein ENV-Wert fehlt — was passiert?

| Fehlt                              | Verhalten                                                                  |
| ---------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_GA4_MEASUREMENT_ID`   | GA4-Tag wird nicht gerendert. Kein Crash. First-Party-Events laufen weiter. |
| `NEXT_PUBLIC_META_PIXEL_ID`        | Meta-Pixel wird nicht gerendert. Kein Crash.                               |
| `META_CAPI_ACCESS_TOKEN`           | `/api/analytics/meta-capi` antwortet im Stub-Modus (validiert, sendet nicht). |
| Supabase-Migration                 | `/api/analytics/events` und `/vitals` antworten `202 migration_pending`.   |

Die App läuft in **jedem** dieser Fälle normal weiter — Welle 1 ist
defensiv gebaut. Du kannst die Accounts in eigener Reihenfolge nachziehen.
