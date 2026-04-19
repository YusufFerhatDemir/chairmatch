# ChairMatch — Master Launch Checklist

Du hast drei Guides. Das hier ist die Schaltzentrale — die richtige Reihenfolge, mit Zeitschätzung.
Hak ab, mach weiter. Wenn etwas hängt, geh in den verlinkten Guide.

---

## Übersicht: Was wann zu tun ist

| # | Schritt | Zeit | Guide |
|---|---------|------|-------|
| 1 | Supabase Datenbank | ~15 Min | [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) |
| 2 | Vercel Env-Vars | ~20 Min | [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) |
| 3 | Resend Domain verifizieren | ~30 Min | [RESEND_DOMAIN_SETUP.md](./RESEND_DOMAIN_SETUP.md) |
| 4 | Stripe Produkte + Webhook | ~30 Min | (unten) |
| 5 | Legal-Seiten finalisieren | ~15 Min | (unten) |
| 6 | Admin-Account einrichten | ~5 Min | (unten) |
| 7 | End-to-End Test | ~1 Std | (unten) |
| 8 | Anwaltliche Freigabe | ~1–3 Tage | (unten) |

---

## Schritt 1 — Supabase Datenbank (~15 Min)

**Alle 10 Migrationen in einem Copy-Paste** → [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

- [ ] SQL-Editor öffnen (Link im Guide)
- [ ] `supabase/migrations/_BUNDLED_FOR_PROD.sql` komplett reinkopieren
- [ ] Run klicken → "Success" abwarten
- [ ] Im Table Editor prüfen: `payments`, `consent_logs`, `product_categories` sichtbar?

---

## Schritt 2 — Vercel Env-Vars (~20 Min)

**19 Keys** — am schnellsten per `.env.local`-Upload → [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)

- [ ] `.env.example` → `.env.local` kopieren, Werte eintragen
- [ ] Vercel Dashboard → Settings → Environment Variables → Import .env
- [ ] Deployment abwarten (~1–2 Min)
- [ ] App öffnen → lädt sie ohne Fehler?

**Reihenfolge innerhalb des Schritts:** Supabase-Keys zuerst (die hast du schon), dann Stripe, dann den Rest.

---

## Schritt 3 — Resend Domain + E-Mail (~30 Min)

**Domain verifizieren → API Key erstellen → in Vercel eintragen** → [RESEND_DOMAIN_SETUP.md](./RESEND_DOMAIN_SETUP.md)

- [ ] resend.com → Domain `chairmatch.de` hinzufügen
- [ ] 3 DNS-Einträge (SPF / DKIM / DMARC) beim DNS-Provider setzen
- [ ] Status in Resend: **Verified** ✓
- [ ] API Key erstellen (`re_...`) → in Vercel als `RESEND_API_KEY` eintragen
- [ ] `RESEND_FROM_EMAIL=ChairMatch <noreply@chairmatch.de>` in Vercel eintragen

---

## Schritt 4 — Stripe Produkte + Webhook (~30 Min)

Stripe Dashboard: [dashboard.stripe.com](https://dashboard.stripe.com)

### Abo-Produkte anlegen (falls noch nicht vorhanden)

1. Stripe → **Products** → **Add product**
2. Für jedes der 3 Tiers:
   - Name: `ChairMatch Starter` / `ChairMatch Premium` / `ChairMatch Gold`
   - Preis in EUR, monatlich, wiederkehrend
   - Nach Speichern: **Price ID** (`price_xxx`) kopieren
3. Price IDs in Vercel eintragen:
   - [ ] `STRIPE_PRICE_STARTER` = `price_xxx`
   - [ ] `STRIPE_PRICE_PREMIUM` = `price_xxx`
   - [ ] `STRIPE_PRICE_GOLD` = `price_xxx`

### Webhook einrichten

1. Stripe → **Developers → Webhooks → Add endpoint**
2. URL: `https://chairmatch.de/api/webhooks/stripe`
3. Events auswählen:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. **Signing secret** (`whsec_xxx`) → in Vercel als `STRIPE_WEBHOOK_SECRET` eintragen
- [ ] Webhook in Vercel eingetragen

### API Keys (Live-Mode!)

Stripe schaltet auf Live wenn du die Domain verifiziert hast:
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_xxx`
- [ ] `STRIPE_SECRET_KEY` = `sk_live_xxx`

---

## Schritt 5 — Legal-Seiten finalisieren (~15 Min)

Drei Platzhalter in den Rechtstexten müssen ersetzt werden:

### `src/app/(public)/impressum/page.tsx`

| Platzhalter | Ersetzen durch |
|-------------|----------------|
| `{{HANDELSREGISTERGERICHT}}` | z. B. `Amtsgericht Frankfurt am Main` |
| `{{HRB_NUMMER}}` | deine HRB-Nummer (nach GmbH-Eintragung) |
| `{{UMSATZSTEUER_ID}}` | deine DE-USt-IdNr. (nach Finanzamt-Vergabe) |

### `src/app/(public)/datenschutz/page.tsx`

| Platzhalter | Ersetzen durch |
|-------------|----------------|
| `{{DATENSCHUTZBEAUFTRAGTER_NAME}}` | Name des DSB — oder **ganzen Abschnitt löschen** falls nicht gesetzlich erforderlich |
| `{{DSB_EMAIL}}` | E-Mail des DSB — oder **Abschnitt löschen** |

> **Wann ist ein DSB Pflicht?** Ab 20 Personen, die regelmäßig personenbezogene Daten verarbeiten. Als kleines Team: wahrscheinlich nicht Pflicht. Anwalt fragen.

- [ ] Platzhalter ersetzt oder Abschnitte gelöscht
- [ ] Commit + Push

---

## Schritt 6 — Admin-Account einrichten (~5 Min)

Nach dem ersten Nutzer-Signup über die App:

1. Supabase Dashboard → **Table Editor** → `profiles` → die User-ID deines Accounts kopieren
2. API-Call ausführen (z. B. mit curl oder Insomnia):

```bash
curl -X POST https://chairmatch.de/api/setup/promote-admin \
  -H "x-setup-key: DEIN_ADMIN_SETUP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"userId": "DEINE_USER_ID"}'
```

3. Danach: `ADMIN_SETUP_KEY` aus Vercel **löschen** (einmaliger Gebrauch!)

- [ ] Admin-Account promoted
- [ ] `ADMIN_SETUP_KEY` aus Vercel entfernt

---

## Schritt 7 — End-to-End Test (~1 Std)

Goldene Regel: teste wie ein echter Nutzer, nicht wie ein Entwickler.

- [ ] Registrierung → kommt Welcome-Email an?
- [ ] Salon suchen → Buchung anlegen → kommt Bestätigungsmail an Kunden?
- [ ] Salon-Inhaber → kommt Provider-Notification an?
- [ ] Datenschutz-Seite → alle Abschnitte korrekt, keine `{{PLATZHALTER}}` sichtbar?
- [ ] Cookie-Banner → erscheint, Einstellungen speicherbar?
- [ ] Mobile (iOS + Android) → App installierbar als PWA?
- [ ] Stripe Testzahlung (mit Testkarte `4242 4242 4242 4242`) → Webhook empfangen?
- [ ] Push-Notifications → Einwilligung geben → Test-Push kommt an?

---

## Schritt 8 — Anwaltliche Freigabe (~1–3 Tage)

Die Legal-Seiten sind ein solides technisches Gerüst — kein Rechtsrat.
Vor Launch: einen auf IT- und Datenschutzrecht spezialisierten Anwalt drüberschauen lassen.

Checkliste für den Anwalt:
- [ ] Datenschutzerklärung: alle AVV mit Auftragsverarbeitern geschlossen?
- [ ] AGB: Widerrufsbelehrung korrekt für dein Geschäftsmodell?
- [ ] Impressum: alle Pflichtangaben (USt-ID, HRB nach GmbH-Eintragung)?
- [ ] AGB-Provider: P2B-Verordnung korrekt umgesetzt?
- [ ] DAC7-Meldepflicht ab 30 Transaktionen/Anbieter/Jahr beachtet?

Empfehlung: IT-Recht Kanzlei, e-recht24.de oder WBS.Legal

---

## DNS & Domain (falls noch nicht erledigt)

- [ ] Domain `chairmatch.de` auf Vercel gezeigt (A-Record oder CNAME)
- [ ] HTTPS-Zertifikat automatisch ausgestellt (Vercel macht das per Let's Encrypt)
- [ ] `NEXT_PUBLIC_APP_URL=https://chairmatch.de` in Vercel gesetzt

---

## Supabase — E-Mail-Bestätigung aktivieren (optional aber empfohlen)

Nach der Registrierung schickt Supabase standardmäßig eine Bestätigungs-E-Mail.
Stelle sicher, dass das in deinem Prod-Projekt aktiv ist:

1. Supabase Dashboard → dein Projekt → **Authentication → Providers → Email**
2. **"Confirm email"** auf `ON` stellen
3. Unter **Email Templates** kannst du Betreff und Text der Bestätigungs-Mail anpassen
4. Die Redirect-URL nach Bestätigung auf `https://chairmatch.de` setzen

> Wenn "Confirm email" aus ist, werden Nutzer sofort eingeloggt ohne Verifikation — funktioniert, ist aber weniger sicher.

---

## Was Code-seitig bereits erledigt ist (kein weiterer Aufwand)

Zur Info — diese Punkte sind fertig implementiert, kein Handlungsbedarf:

| Feature | Status |
|---------|--------|
| Cookie-Banner (DSGVO, Datenschutz-Link, Ablehnen-Button) | ✅ fertig |
| Password-Reset-Flow (`/auth/forgot-password` → `/auth/reset-password`) | ✅ fertig |
| Supabase-Credentials: keine hardcodierten Keys mehr | ✅ gefixt |
| Error-Boundary (`/app/error.tsx`, `/app/global-error.tsx`) | ✅ fertig |
| SEO-Metadata auf Legal-Pages (Impressum, Datenschutz, AGB) | ✅ fertig |
| Sitemap (`/sitemap.xml`) + Robots (`/robots.txt`) | ✅ fertig |
| Verified-Badge auf Salon-Karten (Tooltip + Aria-Label) | ✅ fertig |
| Buchungsbestätigung kommuniziert "Zahlung vor Ort" | ✅ fertig |
| Audit-Logs UI (`/admin/audit-logs`) | ✅ fertig |
| Visit-Logs UI (`/admin/besucher`) | ✅ fertig |
| Buchungsbestätigungs-E-Mail via Resend | ✅ fertig |

---

## Zusammenfassung

```
Supabase (15 Min) → Vercel Env (20 Min) → Resend (30 Min)
→ Stripe (30 Min) → Legal (15 Min) → Admin (5 Min) → Test (1 Std) → Anwalt (1–3 Tage)
```

**Gesamtaufwand technisch:** ca. 2–3 Stunden an einem freien Nachmittag.
**Mit Anwalt:** +1–3 Tage für Rückmeldung und Korrekturen.
