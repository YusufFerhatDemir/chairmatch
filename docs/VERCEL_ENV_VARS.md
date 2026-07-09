# Vercel Environment Variables — Soll/Ist-Analyse

> Stand: 09.07.2026. Basis: Code-Analyse (`grep process.env` über `src/`) vs. letzter
> `vercel env pull`-Stand (`.env.prod`, gezogen am 06.03.2026 — aktuellen Stand im
> Vercel-Dashboard gegenprüfen, da seitdem Variablen ergänzt worden sein können).
>
> ⚠️ In diese Datei gehören NIEMALS echte Werte — nur Variablennamen und Bezugsquellen.

## Akutes Problem: Stripe komplett unkonfiguriert

In Vercel fehlt nicht nur `STRIPE_SECRET_KEY`, sondern **alle 6 Stripe-Variablen**.
Der Code (`src/lib/stripe.ts`) initialisiert Stripe lazy und wirft zur Laufzeit
`STRIPE_SECRET_KEY ist nicht konfiguriert`, sobald eine Payment-Route benutzt wird.

**Betroffene Features (fallen ohne Keys aus):**

| Route | Feature |
|---|---|
| `/api/stripe/checkout` | Buchungs-, Abo- und Produkt-Checkout |
| `/api/stripe/webhook` | Zahlungsbestätigungen (checkout.session.completed u.a.) |
| `/api/stripe/connect` | Connect-Onboarding für Anbieter |
| `/api/rental-bookings` | Stuhl-/Raum-Miete-Checkout |
| `/api/cron/rental-payouts` | Payout-Cron (degradiert kontrolliert via `isStripeConfigured()`) |
| `/api/admin/refund` | Admin-Refunds |
| `/api/admin/health` | meldet Stripe als "not configured" |

### Stripe-Variablen (alle in Vercel setzen)

| Variable | Bezugsquelle | Hinweis |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | `sk_live_…` für Production, `sk_test_…` für Preview |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ebenda | `pk_live_…` / `pk_test_…` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Endpoint anlegen | Endpoint-URL: `https://<produktions-domain>/api/stripe/webhook` |
| `STRIPE_PRICE_STARTER` | Stripe Dashboard → Products | Price-ID des Starter-Abos. Code-Fallback `price_starter` ist KEINE gültige ID — Abo-Checkout schlägt ohne echte ID fehl |
| `STRIPE_PRICE_PREMIUM` | ebenda | dito |
| `STRIPE_PRICE_GOLD` | ebenda | dito |

**Webhook-Endpoint braucht diese Events** (aus `src/app/api/stripe/webhook/route.ts`):
`checkout.session.completed`, `checkout.session.expired`,
`checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
`invoice.payment_failed`, `customer.subscription.deleted`, `charge.refunded`,
`account.updated` (Connect).

## Weitere im Code referenzierte Variablen, die im letzten Vercel-Pull fehlten

Kritisch (Kern-Features):

| Variable | Genutzt für |
|---|---|
| `CRON_SECRET` | Auth der Vercel-Crons (`hard-delete`, `publish-reviews`, `rental-payouts`) — ohne sie laufen die Crons ins 401 |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Transaktions-E-Mails |
| `RESEND_REPLY_TO`, `RESEND_WEBHOOK_SECRET` | Reply-To bzw. Resend-Webhook-Verifikation |
| `NEXT_PUBLIC_APP_URL` | absolute URLs (Checkout-Redirects, E-Mail-Links) |

Feature-abhängig (nur nötig, wenn Feature aktiv sein soll):

| Variable | Feature |
|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Web-Push |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | SMS |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Error-Tracking (siehe `docs/SENTRY-SETUP.md`) |
| `NEXT_PUBLIC_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` | Meta-Tracking (`META_CAPI_TEST_EVENT_CODE` nur für Tests) |
| `NEXT_PUBLIC_GA` | Google Analytics |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Karten |
| `INDEXNOW_KEY`, `GOOGLE_INDEXING_SERVICE_ACCOUNT_JSON` | SEO-Indexing-Pings |
| `ADMIN_SETUP_KEY` | einmaliges Admin-Bootstrap |

Bereits in Vercel vorhanden (laut Pull vom 06.03.): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXTAUTH_SECRET`,
`AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL`.

## So werden die Variablen gesetzt (einzige manuelle Klick-Aktion)

1. Vercel Dashboard → Projekt **chairmatch** → **Settings → Environment Variables**.
2. Variable anlegen: Name exakt wie oben, Wert einfügen, Environments **Production**
   (und **Preview**, dort mit Stripe-**Test**-Keys) anhaken → Save.
3. `STRIPE_WEBHOOK_SECRET`: erst im Stripe Dashboard den Webhook-Endpoint auf
   `https://<produktions-domain>/api/stripe/webhook` mit den oben gelisteten Events
   anlegen, das dabei erzeugte `whsec_…` dann in Vercel eintragen.
4. **Redeploy auslösen** (neuester Deployment → ⋯ → Redeploy), da Env-Änderungen
   erst mit dem nächsten Build/Deploy greifen. Alternativ genügt der nächste Push.
5. Verifikation danach: `GET /api/admin/health` sollte Stripe als konfiguriert melden.

Lokal gehören dieselben Werte (Test-Keys!) in `.env.local` — Vorlage: `.env.example`.
`.env*`-Dateien sind gitignored und dürfen nie committet werden
(`scripts/precommit-guard.sh` blockt das zusätzlich).
