# Google Search Console + Bing Webmaster Setup

**Ziel:** ChairMatch in Google + Bing indexieren, sitemap.xml einreichen, Brand-Search "chairmatch" für #1-Ranking.

## 1. Google Search Console (10 Min)

### Schritt 1 — Property anlegen
1. Öffne https://search.google.com/search-console
2. Klick **"Property hinzufügen"** → wähle **"Domain"** (nicht URL-Prefix!)
3. Trage ein: `chairmatch.de`
4. Google zeigt dir einen **TXT-Eintrag** an (z.B. `google-site-verification=abc123...`)

### Schritt 2 — DNS verifizieren
1. Logge dich bei deinem Domain-Registrar ein (wo `chairmatch.de` registriert ist)
2. Gehe in die DNS-Verwaltung
3. **Neuen TXT-Eintrag** anlegen:
   - Name: `@` (oder leer)
   - Wert: `google-site-verification=DEIN_CODE`
   - TTL: 3600
4. Speichern → bei Google Search Console auf **"Verifizieren"** klicken
5. (DNS-Propagation kann 5-30 Min dauern)

### Schritt 3 — Sitemap einreichen
1. In Search Console links: **Sitemaps**
2. URL eintragen: `sitemap.xml`
3. **Senden** klicken
4. Status sollte nach 1-2 Stunden "Erfolgreich" sein

### Schritt 4 — URL-Inspektion für Brand-Keyword
1. Oben in der Suchleiste eintragen: `https://chairmatch.de`
2. **"Indexierung anfordern"** klicken
3. Wiederholen für die wichtigsten Pages:
   - `/was-ist-chairmatch`
   - `/provisionsmodell`
   - `/magazin`
   - jedes Vertical-Hub (`/barbershop-deutschland`, …)

## 2. Bing Webmaster Tools (5 Min)

Wichtig für: Bing, Yahoo, DuckDuckGo + **Microsoft Copilot AI**.

1. https://www.bing.com/webmasters/
2. Mit Microsoft- oder Google-Account einloggen
3. **"Site hinzufügen"** → `chairmatch.de`
4. **Import aus Google Search Console** wählen (spart das DNS-Setup nochmal)
5. Sitemap submitten: `sitemap.xml`

## 3. IndexNow API (sofortiges Crawling)

ChairMatch hat IndexNow-Setup im Code. Sobald du eine neue Seite hinzufügst, wird automatisch:
- Bing
- Yandex
- Naver
- DuckDuckGo (über Bing)

benachrichtigt. Kein Manual-Submit nötig.

## 4. Knowledge Panel bei Google ("chairmatch" gesucht)

Damit bei `"chairmatch"` Google-Search **rechts oben ein Knowledge Panel** mit Logo, Beschreibung und Social-Links erscheint, brauchst du:

### A) Google Business Profile
1. https://business.google.com
2. **Unternehmensprofil erstellen** → ChairMatch
3. Kategorie: "Marketingdienstleistung" oder "Computerdienst"
4. Standort: Adresse (Impressum-Adresse)
5. Telefon, Email, Website
6. Beschreibung kopiere aus `/was-ist-chairmatch`
7. Verifizierung via Postkarte (dauert 5-14 Tage)

### B) Social Profile-URLs sammeln
Sobald du LinkedIn / Instagram / X angelegt hast, schick mir die URLs — ich trage sie in `lib/seo.ts` → `organizationSchema()` → `sameAs` ein. Google verbindet die alle als "ChairMatch-Entity".

### C) Wikipedia (später, ab Traction)
Wenn ChairMatch in Magazinen erwähnt wird (PR-Coverage), ist Wikipedia-Eintrag möglich. **Authority-Boost #1.**

## 5. Erwartete Timeline

| Zeit ab Submit | Was passiert |
|---|---|
| 1-2 Stunden | Sitemap als "gelesen" markiert |
| 24-48 Stunden | erste Pages indexiert |
| 1 Woche | meiste Pages in Google-Index |
| 2-4 Wochen | Brand-Suche "chairmatch" zeigt deine Site #1 (wenn keine Konkurrenz mit gleichem Namen) |
| 1-3 Monate | Stadt × Vertical-Pages ranken bei Long-Tail-Keywords |
| 3-6 Monate | Knowledge Panel erscheint (nach Google Business Profile + Backlinks) |

## 6. Daily-Check (5 Min)

Jeden Morgen einmal in Search Console schauen:
- **Leistung**: wie viele Impressionen / Klicks?
- **Indexierung**: Fehler? Gibt es Pages mit 404 oder noindex?
- **Mobile Usability**: Probleme auf Smartphones?

## Hilfsmittel-URLs

| Tool | URL |
|---|---|
| Google Search Console | https://search.google.com/search-console |
| Bing Webmaster | https://www.bing.com/webmasters |
| Google Business | https://business.google.com |
| PageSpeed Insights | https://pagespeed.web.dev/ |
| Rich Results Test | https://search.google.com/test/rich-results |
| Schema.org Validator | https://validator.schema.org/ |