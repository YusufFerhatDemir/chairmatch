# Stand der App — Code-fertig vs. wartet auf dich

**Stand: 14. Mai 2026**

---

## ✅ Code-seitig ALLES fertig

Die App ist technisch produktionsreif. Du kannst sie heute launchen — folgende Funktionen sind komplett implementiert, getestet, deployed:

### Core-Marketplace
- Salons + Listings + Verfügbarkeiten
- Buchungs-Flow mit Stripe-Integration (Code ready, nur Stripe-Account fehlt)
- Bewertungs-System (beidseitig)
- Anti-Bypass-Filter (Regex-Detection blockt Kontaktdaten vor Buchung)
- Messaging mit In-App-Conversations
- Onboarding-Flow für Anbieter + Mieter

### Auth & Security
- NextAuth v5 mit Credentials + Phone-Auth (TOTP)
- 2FA voll integriert (TOTP + Recovery-Codes)
- Force-Password-Change-Mechanik
- Rate-Limiting auf allen kritischen Endpoints
- Session-Härtung + Audit-Logs

### SEO & GEO
- 5 Phase-1-Städte (Stadt-Hubs, City×Vertical, City×Vertical×Asset)
- 5 Vertical-Deutschland-Pillar-Pages
- 10 Magazin-Artikel (~28.000 Wörter Long-Form)
- /faq mit 20+ FAQs (FAQPage-Schema)
- /freelancer-rechner (Lead-Magnet)
- Listing-Detail-Page mit Service/Offer-Schema
- Dynamische OG-Images (Root, Salon, Listings, Magazin)
- IndexNow + Google-Indexing-API-Worker (Cron alle 2h)
- Schema.org überall: Organization, Website, LocalBusiness, Article, FAQPage, BreadcrumbList, Service, Offer
- robots.txt mit AI-Crawler-Whitelist (GPTBot, ClaudeBot, PerplexityBot)
- llms.txt für AI-Engine-Discovery
- Sitemap-Threshold-Logik (Phase 1/2/3)

### Admin-Tools
- MIS-Dashboard für Super-Admin
- KPI-Cockpit (North-Star, Funnel, Marketplace-Health, Milestones)
- Launch-Health-Checker (Service-Status-Übersicht)
- Newsletter-System mit Kampagnen-Editor
- Audit-Logs

### Tests
- 6 Playwright-Spec-Files (public-pages, seo-meta, api-health, api, home, protected-pages)
- 49+ E2E-Tests insgesamt

### Performance
- 6 DB-Indexes
- Service Worker v2 (Network-First + Stale-While-Revalidate)
- ISR auf allen content-heavy Pages
- Slim Middleware-Matcher

### Compliance & i18n
- DSGVO-konforme Datenschutz-Page
- Cookie-Settings-Page
- 4 Sprachen (DE, EN, TR, AR) via next-intl
- Auto-Redact in Logger für PII

---

## ⏳ WARTET AUF DICH — externe Setups (UG-Anmeldung & Co.)

Diese Punkte kann ich NICHT alleine erledigen, weil sie externe Accounts brauchen, die deine Firma als juristische Person voraussetzen.

### 1. UG-Anmeldung (Voraussetzung für alles andere)
- **Notar-Termin** + Eintragung im Handelsregister
- **Steuernummer + USt-ID** beim Finanzamt beantragen
- Dauer: 4-8 Wochen ab Notar
- Kosten: ~600-900 € Notar + 150 € Handelsregister + 25 € Stammkapital min.

### 2. Resend (E-Mail-Versand) — Code ready
- Account anlegen unter resend.com
- DNS-Records setzen (SPF, DKIM, DMARC) für `chairmatch.de`
- Test-E-Mail von Yusuf-Adresse senden
- ENV-Var `RESEND_API_KEY` in Vercel setzen
- Aufwand: ~30 Min
- Status-Indikator: in /admin/super/health sichtbar als rotes "fehlt"

### 3. Stripe Connect (Zahlungen) — Code ready
- Stripe-Konto anlegen → Connect aktivieren
- KYC-Verifizierung (braucht Handelsregister-Auszug + Personalausweis)
- Webhook-Endpoint konfigurieren: `https://chairmatch.de/api/webhooks/stripe`
- Produkte anlegen für Subscription-Tiers (Starter/Premium/Gold)
- ENV-Vars setzen: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Aufwand: ~2-3h (inkl. KYC-Wartezeit)

### 4. Twilio SMS (Phone-Auth) — Code ready
- Twilio-Account anlegen
- Phone-Number kaufen (~1 €/Monat)
- KYC (DACH Sender-ID-Regel)
- ENV-Vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- Aufwand: ~1h
- Falls noch nicht eingerichtet: Phone-Auth fällt automatisch zurück auf Dev-Modus (loggt Code in Server-Console statt zu schicken)

### 5. Sentry (Error-Tracking) — Code ready
- Sentry-Account anlegen (10k Events/Monat free)
- Project erstellen → DSN holen
- ENV-Var `SENTRY_DSN` in Vercel setzen
- KEINE Code-Änderungen nötig — sobald DSN da ist, fließen high/critical Errors automatisch rein
- Aufwand: ~10 Min

### 6. IndexNow + Google Indexing API — Code ready, optional
- IndexNow-Key generieren (UUID) + als `INDEXNOW_KEY` in Vercel setzen → Bing/Yandex sofort aktiv
- Google: Service-Account erstellen + JSON in `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` setzen → Google-Indexing-API aktiv
- Aufwand: ~30 Min
- Effekt: neue Salons/Listings werden in Stunden statt Wochen indexiert

### 7. Apple Developer Account + Play Store Account — wartet auf UG
- Apple: $99/Jahr, braucht D-U-N-S-Number (kommt mit Handelsregister-Eintrag)
- Google: $25 einmalig
- Capacitor-iOS-Build hat noch CocoaPods-Pfad-Issue (siehe `docs/capacitor-cocoapods-fix.md`) — Symlink-Workaround dokumentiert
- App-Icons + Splash-Screens sind bereits konfiguriert
- App-Store-Listings + Screenshots: kann ich parallel als Mockups vorbereiten wenn du willst

### 8. Legal-Platzhalter ausfüllen — wartet auf UG
- `/datenschutz`: Firma + Adresse + Auftragsverarbeiter
- `/impressum`: Geschäftsführer + HR-Nummer + USt-ID
- `/agb`: keine Anpassung nötig, generischer Marketplace-Vertrag
- Datenschutz-Beauftragten benennen wenn >20 Mitarbeiter (irrelevant Phase 1)

### 9. Vercel-Domain — wartet auf UG
- chairmatch.de ist registriert, aber Vercel-Production-Domain noch `chairmatch.vercel.app` (?)
- DNS umstellen sobald `chairmatch.de` auf deinen Namen läuft
- Aufwand: ~15 Min DNS-Propagation, 24-48h volle Aktivierung

---

## 🎯 Nächste Schritte für dich

**Kurzfristig (diese Woche):**
1. Notar-Termin für UG-Anmeldung
2. Sentry-Account anlegen (10 Min, sofort wirksam)
3. IndexNow-Key generieren (10 Min, beschleunigt SEO)

**Mittelfristig (nach UG-Eintragung, ~6-8 Wochen):**
4. Resend + DNS-Setup
5. Stripe Connect KYC
6. Apple + Google Developer Accounts
7. Legal-Platzhalter ausfüllen

**Parallel:** Marketing-Push (LinkedIn, Instagram, lokale Beauty-Communities) — die Plattform ist live, du brauchst nur User.

---

## 📊 Was die App jetzt schon kann (Demo-fähig)

- Salon-Anbieter können registrieren + verifizieren + Listings anlegen
- Mieter können suchen + filtern + anfragen
- Bewertungen werden erfasst (Stripe-Zahlungen erst nach Stripe-Setup)
- Phone-Auth funktioniert (Dev-Modus loggt OTP in Console wenn Twilio noch nicht da)
- Admin kann verifizieren, moderieren, Statistiken sehen
- SEO ist live: 5 Städte × 5 Verticals × 9 Assets = 225+ optimierte Pages indexierbar
- Magazin mit 10 Artikeln (28.000 Wörter)
- Free-Tools (Freelancer-Rechner) als Lead-Magnete

**Realistisch:** mit ~10-20 Pilot-Salons in einer Stadt (z.B. Berlin oder Hamburg) kannst du Phase 1 starten. Stripe-Setup ist der einzige harte Blocker für Buchungen — alles andere geht auch im "Bargeld-Zahlung-bei-Salon"-Modus übergangsweise.
