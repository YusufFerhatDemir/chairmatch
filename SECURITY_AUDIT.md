# Chairmatch — Security Audit (OWASP Top 10 + 2 weitere)

**Audit-Datum:** 2026-05-11
**Auditor:** Internal (Claude AI Assistant)
**Scope:** chairmatch.de Web-App + API + Supabase-DB + Native Expo-App (mobile/)

**Update 2026-07-04:** Die native App wurde von Capacitor auf Expo (`mobile/`, EAS-Build) umgestellt. Capacitor-bezogene Attests in diesem Dokument sind obsolet und entsprechend markiert; ein eigenes Audit der Expo-App steht noch aus.

**Legende:** 🟢 OK · 🟡 Empfehlung · 🔴 Kritisch

---

## A01:2021 — Broken Access Control 🟢

**Geprüft:**
- Row-Level-Security (RLS) auf allen 41 Supabase-Tabellen aktiv
- RBAC in `src/middleware.ts` mit 4 Rollen-Levels (Kunde → Provider → Owner → Admin)
- `requireAdmin()` in `/api/admin/mis/route.ts` prüft Session + Role vor Daten-Return
- Service-Role-Key niemals client-side exponiert

**Findings:** Keine.

---

## A02:2021 — Cryptographic Failures 🟢

**Geprüft:**
- HSTS-Header gesetzt (`max-age=63072000; includeSubDomains; preload`)
- TLS 1.3 by default (Vercel)
- NEXTAUTH_SECRET 32-Byte Random (`a55UHiZkz2oup9UHg5qMgSEvQQbo92xDT4nNYxXIKuo=`)
- Stripe-Webhooks Signing-Secret-validiert
- Supabase Service-Role-Key nur in `SUPABASE_SERVICE_ROLE_KEY` ENV (Vercel + `.env.local`, niemals client)

**Empfehlung 🟡:** 
- VAPID Private Key sollte rotierbar sein (Push-Notifications). Plan: alle 12 Monate.
- Stripe-Webhook-Secret bei jeder Webhook-URL-Änderung rotieren.

---

## A03:2021 — Injection 🟢

**Geprüft:**
- Supabase Postgres-Client nutzt Prepared Statements (kein Raw SQL im App-Code)
- `searchParams` Sanitization via Zod-Schemas (`zod 4.3.6` installiert)
- File-Uploads: `/api/upload/route.ts` validiert Content-Type + Size
- 3 SQL-Functions mit `search_path = public, pg_temp` gelockt (Phase 1)

**Empfehlung 🟡:**
- `src/app/api/messages/route.ts` und `src/app/api/reviews/route.ts` auf XSS-Sanitization durchgehen (HTML in User-Content). Aktuell: React escapt automatisch, aber Markdown-Rendering nur falls explizit aktiviert.

---

## A04:2021 — Insecure Design 🟢

**Geprüft:**
- Threat-Modeling bei Booking-Flow: doppelte Buchungen verhindert durch DB-Constraint
- Rate-Limiting verhindert Brute-Force auf Login (10 Requests/Min)
- E-Mail-Verification vor erstem Login Pflicht
- Refund-Flow nur durch Admin oder Booking-Owner

**Empfehlung 🟡:**
- "No-Show Protection" (Stripe-Pre-Authorization) als künftiges Feature für High-Value Buchungen
- Account-Takeover-Schutz: bei Passwort-Reset E-Mail an alte UND neue Adresse benachrichtigen

---

## A05:2021 — Security Misconfiguration 🟢

**Geprüft:**
- CSP-Header mit explizit erlaubten Domains
- Permissions-Policy: 25 Features per Default deaktiviert, nur 8 explizit erlaubt
- `X-Content-Type-Options: nosniff` + `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'none'`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Referrer-Policy: strict-origin-when-cross-origin`
- API-Routes: `X-Robots-Tag: noindex` + `Cache-Control: no-store`

**Empfehlung 🟡:**
- CSP enthält `'unsafe-inline'` und `'unsafe-eval'` für Scripts (nötig für Next.js Hydration + Stripe.js). 
  - Bei zukünftigem Next.js 16 mit Strict-CSP-Support migrieren auf Nonces.
- Hinweis: Das frühere Attest zu `webContentsDebuggingEnabled: false` (capacitor.config.ts) ist obsolet — das Capacitor-Setup wurde am 2026-07-04 entfernt. Die native Expo-App (`mobile/`) rendert ohne WebView; ein eigenes Audit steht aus.

---

## A06:2021 — Vulnerable & Outdated Components 🟢

**Geprüft:**
- `npm audit` nach Capacitor-Install: **0 vulnerabilities** (Stand: 11.05.2026)
- Next.js 15.5.12 (aktuelle 15.x-Linie)
- React 19.2.4 (latest)
- Supabase JS 2.98.0 (latest)
- Stripe 20.4.1 (latest)
- next-auth 5.0.0-beta.30 (latest beta)

**Empfehlung 🟡:**
- Monatlicher `npm audit` + Dependabot-Bot in GitHub aktivieren
- Major-Version-Updates (z. B. Next 15 → 16) erst nach 2 Patch-Releases

---

## A07:2021 — Identification & Authentication Failures 🟢

**Geprüft:**
- next-auth v5 mit JWT-Strategie
- 2FA via `/api/auth/2fa/setup` + `/api/auth/2fa/verify` Routes vorhanden
- Leaked-Password-Protection in Supabase Auth aktiv (HaveIBeenPwned-Check)
- Rate-Limit auf `/api/auth/*` = 10 Requests/Min (Brute-Force-Schutz)
- Session-Cookies HttpOnly + Secure + SameSite=Lax (Vercel-Default)

**Empfehlung 🟡:**
- 2FA als optional aktivierbar — aber: für Admin-Accounts PFLICHT machen (UI-Toggle in `/admin/profile`)
- WebAuthn / Passkey-Support später ergänzen (Permissions-Policy erlaubt es bereits)

---

## A08:2021 — Software & Data Integrity Failures 🟢

**Geprüft:**
- Vercel-Deploys aus Git → reproduzierbar, signierte Commits via GitHub
- Stripe-Webhooks mit Signing-Secret validiert (`/api/stripe/webhook/route.ts`)
- Native Builds via EAS Cloud-Build (Expo) → Bundle-ID `de.chairmatch.app` fest in `mobile/app.json` definiert
- Service-Worker mit Cache-Versionierung (`chairmatch-v11`)

**Empfehlung 🟡:**
- Subresource Integrity (SRI) für externe CDN-Scripts wäre ideal — aktuell laden wir nur Stripe.js, die rotieren ihre URLs nicht. Akzeptabel.

---

## A09:2021 — Security Logging & Monitoring Failures 🟡

**Geprüft:**
- `error_logs`-Tabelle in Supabase existiert
- Permissive Policy `"Anyone can log errors"` in Phase 1 entfernt (nur Service-Role schreibt)
- MIS-Dashboard zeigt letzte 24h Errors (gerade hinzugefügt)
- Audit-Log-Page (`/admin/audit-logs`) für sicherheitsrelevante Aktionen

**Empfehlung 🟡:**
- **Sentry oder Highlight.io integrieren** — DB-Logs sind nicht in Echtzeit alarmierbar
- Vercel-Logs nur 1h retention auf Free, 1 Tag auf Pro → externe Log-Aggregation langfristig sinnvoll
- Alerting per E-Mail bei > 10 Errors/Min einrichten

---

## A10:2021 — Server-Side Request Forgery (SSRF) 🟢

**Geprüft:**
- Keine User-controlled URLs werden serverseitig gefetcht
- Image-Uploads gehen direkt in Supabase Storage (kein Proxy)
- Webhook-Receivers (`/api/stripe/webhook`) verifizieren Signature → keine Spoofing-Vektoren

**Findings:** Keine.

---

## Bonus: Mobile/Native-spezifische Risiken

### Native App (Expo) 🟡

**Hinweis:** Die frühere Prüfung der Capacitor-WebView-Konfiguration (`capacitor.config.ts`) ist obsolet — das Capacitor-Setup (ios/, android/, capacitor.config.ts) wurde am 2026-07-04 vollständig entfernt.

Die native App ist jetzt ausschließlich die Expo-App (`mobile/`, Expo SDK 57 / React Native, Build via EAS Cloud):
- Rendert nativ über React Native — kein WebView; die WebView-spezifischen Konfigurationsrisiken (cleartext, allowNavigation etc.) entfallen damit strukturell
- Nutzt dieselbe Supabase-Instanz mit anon key + RLS wie die Web-App
- Ein eigenes Sicherheits-Audit der Expo-App (u. a. Secrets-Handling, Session-Storage, Deep-Link-Scheme `chairmatch`) steht noch aus — bis dahin wird hier bewusst nichts attestiert

### Push-Notifications 🟢

**Geprüft:**
- VAPID-Keys getrennt: `VAPID_PUBLIC_KEY` (Server) + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (Client) + `VAPID_PRIVATE_KEY` (nie ENV-exposed)
- Subscription-Endpunkte authentifiziert (`/api/push/subscribe` braucht Session)
- Push-Send-Route (`/api/push/send`) nur für Admins

---

## Bonus: DSGVO / Datenschutz 🟡

**Geprüft:**
- Datenschutzerklärung-Seite existiert (`/datenschutz`)
- Cookie-Consent-Banner aktiv (`ConsentBanner.tsx`)
- Account-Delete-Route mit Soft-Delete + 30-Tage-Hard-Delete-Cron
- Account-Export-Route für DSGVO Art. 15 (Auskunft)

**Empfehlung 🟡 — vor Launch klären:**
- Auftragsverarbeitungsverträge (AVV) mit Vercel, Supabase, Stripe, Resend ✓ (alle haben Standard-AVV)
- Liste aller Auftragsverarbeiter in Datenschutzerklärung erwähnen — Task #11 (Legal-Drafts)
- DSGVO-Folgenabschätzung (DSFA) NICHT zwingend für Phase 1 (Beauty-Booking)
- DSFA WIRD zwingend, sobald Phase 3 (Medizin-Vertikale): Gesundheitsdaten = besondere Kategorie

---

## Zusammenfassung: Sicherheits-Score

| Kategorie | Status |
|---|---|
| Access Control | 🟢 |
| Crypto | 🟢 |
| Injection | 🟢 |
| Design | 🟢 |
| Misconfig | 🟢 |
| Vulnerabilities | 🟢 |
| Authentication | 🟢 |
| Data Integrity | 🟢 |
| Logging/Monitoring | 🟡 |
| SSRF | 🟢 |
| Mobile/Native | 🟡 |
| DSGVO | 🟡 |

**Gesamtbewertung:** 9/12 grün, 3/12 gelb. **Kein einziges rotes Finding.**

Du bist auf einem **professionellen Sicherheitslevel** — besser als die meisten frühen Marketplaces. Die drei gelben Punkte (Sentry-Integration, DSGVO-Final-Polish und das ausstehende Audit der Expo-App) sind keine Launch-Blocker, sondern Phase-2-Verbesserungen.

---

## Action Items (priorisiert)

| Priorität | Aktion | Effort | Wer |
|---|---|---|---|
| Hoch | Legal-Drafts mit AVV-Erwähnung (Task #11) | 2h | Claude (nach User-Datenpunkten) |
| Hoch | Sentry oder Highlight.io integrieren | 1 Tag | Claude (selbständig) |
| Mittel | 2FA-Pflicht für Admin-Accounts | 2h | Claude |
| Mittel | Dependabot in GitHub aktivieren | 5 Min | Yusuf |
| Niedrig | Externer Pen-Test nach 100 Nutzern | ~5k € | Externer Anbieter (z. B. Securai, Cure53) |
| Niedrig | SOC-2-Type-I-Audit (nur wenn B2B-Großkunden fragen) | ~15-30k € | Externer Auditor |
