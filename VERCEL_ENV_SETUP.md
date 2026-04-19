# Vercel Umgebungsvariablen — Schritt für Schritt

Env-Vars sind wie das Schlüsselbund zu deiner App. Ohne sie starten manche Features nicht.
Vercel braucht sie einmal eingetragen — danach laufen alle Deployments automatisch damit.

---

## Direkt-Link zum Vercel-Dashboard

```
https://vercel.com/team_iJXOJqpBTNdePfg1tMV0r1ip/chairmatch/settings/environment-variables
```

---

## Option A — Schnellster Weg: `.env`-Datei hochladen (Bulk-Import)

Vercel erlaubt es, eine `.env`-Datei direkt hochzuladen:

1. Kopiere `.env.example` → `.env.local` (lokal im Projekt)
2. Trage alle echten Werte ein (ersetze die Platzhalter, s. u.)
3. Im Vercel-Dashboard: **Settings → Environment Variables → Import .env**
4. Datei auswählen → Vercel liest alle Keys automatisch ein
5. Environment auf **Production** setzen → **Save**

> ⚠️ Lade niemals `.env.local` in Git hoch! Es steht in `.gitignore`.

---

## Option B — Manuell, eine Variable nach der anderen

Für jede Zeile: **Settings → Environment Variables → Add New** → Key + Value eintragen → Environment: **Production** → **Save**

---

## Alle 19 Variablen — Komplettliste

### SUPABASE

| Key | Environment | Wert/Fundort |
|-----|-------------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase → Settings → API → **Project URL** (Format: `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production + Preview | Supabase → Settings → API → **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | Supabase → Settings → API → **service_role** ⚠️ Nur server-seitig, nie im Browser! |

So findest du sie: Supabase Dashboard → dein Projekt → **Settings** (Zahnrad links unten) → **API**

---

### STRIPE

| Key | Environment | Wert/Fundort |
|-----|-------------|--------------|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Production + Preview | Stripe → Developers → API Keys → **Publishable key** (beginnt mit `pk_live_`) |
| `STRIPE_SECRET_KEY` | Production | Stripe → Developers → API Keys → **Secret key** (beginnt mit `sk_live_`) |
| `STRIPE_WEBHOOK_SECRET` | Production | Stripe → Developers → Webhooks → dein Endpoint → **Signing secret** (beginnt mit `whsec_`) |
| `STRIPE_PRICE_STARTER` | Production | Stripe → Products → Starter-Produkt → Preis → **Price ID** (Format: `price_xxxxx`) |
| `STRIPE_PRICE_PREMIUM` | Production | Stripe → Products → Premium-Produkt → Preis → **Price ID** |
| `STRIPE_PRICE_GOLD` | Production | Stripe → Products → Gold-Produkt → Preis → **Price ID** |

> **Noch kein Stripe-Account?** Erstelle zuerst die 3 Abo-Produkte (Starter/Premium/Gold), dann hast du die Price IDs.
> Test-Keys beginnen mit `pk_test_` / `sk_test_` — für Production brauchst du Live-Keys.

---

### E-MAIL (Resend)

| Key | Environment | Wert/Fundort |
|-----|-------------|--------------|
| `RESEND_API_KEY` | Production | resend.com → API Keys → **Create API Key** (beginnt mit `re_`) |
| `RESEND_FROM_EMAIL` | Production | `ChairMatch <noreply@chairmatch.de>` — nur nach Domain-Verifizierung (→ RESEND_DOMAIN_SETUP.md) |

---

### PUSH NOTIFICATIONS (VAPID)

VAPID-Keys generierst du einmalig lokal — danach trage sie ein und sie ändern sich nie wieder:

```bash
npx web-push generate-vapid-keys
```

Output sieht so aus:
```
Public Key: BNxxxxxxx...
Private Key: xxxxxxx...
```

| Key | Environment | Wert |
|-----|-------------|------|
| `VAPID_PUBLIC_KEY` | Production + Preview | Der **Public Key** aus obigem Befehl |
| `VAPID_PRIVATE_KEY` | Production | Der **Private Key** aus obigem Befehl |
| `VAPID_EMAIL` | Production | `mailto:admin@chairmatch.de` |

---

### APP & SECURITY

| Key | Environment | Wert |
|-----|-------------|------|
| `NEXT_PUBLIC_APP_URL` | Production | `https://chairmatch.de` |
| `NEXT_PUBLIC_APP_URL` | Preview | `https://chairmatch-git-main-xxx.vercel.app` (Preview-URL) |
| `ADMIN_SETUP_KEY` | Production | Einmalig generieren: `openssl rand -hex 32` im Terminal |
| `CRON_SECRET` | Production | Einmalig generieren: `openssl rand -hex 32` im Terminal |

---

## Nach dem Eintragen

1. Vercel triggert automatisch ein neues Deployment
2. Warte bis das Deployment grün ist (ca. 1–2 Minuten)
3. Öffne `https://chairmatch.de` und prüfe ob die App lädt
4. Testbuchung anlegen → schauen ob Email ankommt (wenn Resend schon eingerichtet)

**Weiter mit:** → [RESEND_DOMAIN_SETUP.md](./RESEND_DOMAIN_SETUP.md)
