# ChairMatch Spec V2 — Implementierte Änderungen

Stand: März 2026

## 1. RBAC (Rollen-Hierarchie)

- **Neue Rollen:** CUSTOMER, PROVIDER, BUSINESS_OWNER, ADMIN, SUPER_ADMIN
- **Mapping:** kunde→CUSTOMER, anbieter/provider→PROVIDER, b2b→BUSINESS_OWNER, admin→ADMIN, super_admin→SUPER_ADMIN
- **lib/rbac.ts:** `toSpecRole()`, `hasRoleOrAbove()`, `isProviderOrAbove()`, `isAdminOrAbove()`, etc.
- **Middleware:** Nutzt RBAC-Helfer für Route-Guards

## 2. Datenbank (Migration 20260311_spec_v2.sql)

| Tabelle | Zweck |
|---------|-------|
| `consent_logs` | DSGVO Einwilligungen (AGB, Datenschutz, Marketing) mit user_id, type, version, timestamp |
| `cookie_consents` | TTDSG Cookie-Einwilligung, session_id, choices (necessary/statistics/marketing) |
| `availability_blocks` | Provider/Location Sperrzeiten (Urlaub etc.) |
| `login_attempts` | Brute-Force-Schutz (Rate-Limit) |
| `bookings` | Erweitert um booking_type (APPOINTMENT/RENTAL), resource_id, provider_id |

## 3. Cookie-Banner & TTDSG

- **Granulare Auswahl:** Notwendig (immer), Statistik, Marketing
- **ConsentBanner:** "Alle akzeptieren", "Nur notwendige", "Einstellungen"
- **API:** POST /api/cookies/consent (speichert in cookie_consents)
- **Seite:** /cookie-settings (Änderung jederzeit möglich)
- **Footer-Link:** Account → Cookie-Einstellungen

## 4. Compliance-Seiten

- **/impressum:** ChairMatch GmbH, legal@chairmatch.de
- **/datenschutz:** Consent-Logs, Cookie-Consents, Betroffenenrechte, AVV-Hinweise
- **/agb:** Storno-Policy (§ 4a): Kostenlos bis 24h, 50% < 24h, 100% No-Show
- **/agb-provider:** P2B-konform (Kündigungsfristen, Beschwerdeverfahren, Ranking-Kriterien)

## 5. Availability API

- **APPOINTMENT:** `GET /api/availability?salonId=&date=&serviceId=` → freie Slots (15min-Schritte)
- **RENTAL:** `GET /api/availability?resourceId=&date=&duration=` → freie Slots für Equipment
- **Logik:** Öffnungszeiten (salons.opening_hours), Konflikt mit bestehenden Buchungen

## 6. Security

- **Headers:** X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS (max-age=63072000)
- **login_attempts:** Tabelle für Rate-Limit (10/15min) — Backend-Logik noch zu implementieren

## 8. Signup Consent & Passwort-Policy

- **Registrierung:** AGB + Datenschutz (Pflicht, nicht pre-checked), Marketing (optional)
- **consent_logs:** Nach Signup werden AGB, Datenschutz, ggf. Marketing mit user_id, version, ip_hash gespeichert
- **Passwort-Policy:** Min 10 Zeichen, 1 Großbuchstabe, 1 Zahl, 1 Sonderzeichen (Zod-Validierung)
- **Anbieter-Registrierung:** Link zu /agb-provider statt /agb

## 10. Login Rate-Limit & Betroffenenrechte

- **Rate-Limit:** 10 Fehlversuche / 15 min pro IP (login_attempts), Block bei Überschreitung
- **Daten-Export:** GET /api/account/export → JSON (Profil, Buchungen, Consent-Logs)
- **Konto-Löschung:** POST /api/account/delete → Soft-Delete (is_active=false), Hard-Delete nach 30 Tagen per Cron
- **Account-Seite:** Buttons "Daten exportieren", "Konto löschen"
- **Migration:** 20260312_account_deletion.sql (deleted_at, delete_requested_at)

## 11. Offen / Phase 2

- **Auth:** E-Mail-Verifikation, MFA/TOTP, Session-Limit (max 5)
- **i18n:** next-intl, 8 Sprachen
- **Stripe Connect:** Phase 2
- **Consent bei Signup:** consent_logs beim Registrieren schreiben

## Migration ausführen

```bash
# Supabase SQL Editor oder CLI
supabase db push
# oder: SQL aus supabase/migrations/20260311_spec_v2.sql manuell ausführen
```
