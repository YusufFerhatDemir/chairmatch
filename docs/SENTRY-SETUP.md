# Sentry-DSN-Setup für ChairMatch

**Zweck:** Crash-Reports + Error-Tracking. Sobald Stripe live geht, willst du wissen wenn Bookings crashen.

## 1. Account anlegen (5 Min)

1. https://sentry.io/signup/
2. Mit GitHub oder Email einloggen
3. **Plan auswählen**: **Developer (kostenlos)** — 5.000 Events/Monat, reicht für Pre-Launch + erste 6 Monate

## 2. Projekt anlegen

1. Im Sentry-Dashboard: **"Create Project"**
2. **Platform**: Next.js auswählen
3. **Alert-Frequency**: "I'll create my own alerts later"
4. **Project Name**: `chairmatch-prod`
5. **Team**: default-team
6. Du bekommst einen **DSN** (Data Source Name) angezeigt — Format: `https://abc123@o12345.ingest.sentry.io/67890`

## 3. DSN in Vercel ENV-Vars eintragen

1. https://vercel.com/yusufferhatdemir/chairmatch/settings/environment-variables
2. **Add New**:
   - Key: `SENTRY_DSN`
   - Value: (dein DSN von Sentry)
   - Environments: ✓ Production, ✓ Preview, ✓ Development
3. **Save**
4. (Vercel-Deploy passiert automatisch neu — fertig)

## 4. Test

Im Browser auf chairmatch.de → DevTools öffnen → in Console eingeben:

```javascript
throw new Error('Sentry Test Error')
```

In Sentry-Dashboard → **Issues** → der Test-Error sollte nach 30 Sek erscheinen.

## 5. Empfohlene Sentry-Settings

### A) Alert-Rules anlegen
Sentry-Dashboard → **Alerts** → **Create Alert**:

1. **Email bei jedem neuen Issue**:
   - Wenn: "A new issue is created"
   - Notify: dein Email

2. **Email bei Spike** (>10 Errors in 5 Min):
   - Wenn: "Number of errors per hour > 10"
   - Notify: dein Email

### B) Release-Tracking
In `next.config.ts` kannst du später `releases` aktivieren — Sentry zeigt dir dann welcher Deploy welche Fehler verursacht hat.

### C) Performance-Monitoring
Optional — Sentry kann Page-Load-Times, API-Latencies tracken. Erstmal aus lassen (zu viele Events).

## 6. Privacy-Settings (DSGVO-konform)

Sentry-Dashboard → **Project Settings** → **Security & Privacy**:

- ✓ **Scrub IP Addresses** (DSGVO)
- ✓ **Data Scrubbing** für `password`, `email`, `phone`
- ✓ **Sensitive Fields**: `creditCard`, `cvv`, `ssn`

## 7. Was im Code schon vorbereitet ist

ChairMatch hat `src/lib/error-tracking.ts` — sobald `SENTRY_DSN` als ENV-Var gesetzt ist, werden Errors automatisch geschickt. Du musst nichts coden.

## 8. Free-Plan-Limits

| | Limit | Bei wie viel Traffic? |
|---|---|---|
| Errors | 5.000/Monat | ca. 1.000 Bookings/Monat |
| Performance | 10k Transactions | ausreichend |
| Replays | 50/Monat | Nice-to-have |

Wenn du das überschreitest, upgrade auf "Team" Plan ($26/Monat).