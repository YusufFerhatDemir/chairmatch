# Resend Domain-Verifizierung — Damit Emails wirklich ankommen

Ohne Domain-Verifizierung landen Buchungsbestätigungen im Spam — oder kommen gar nicht an.
Das hier ist wie das Briefkastennamensschild: du beweist Resend, dass `chairmatch.de` dir gehört.

---

## Was du brauchst

- Einen Resend-Account (kostenlos unter resend.com)
- Zugang zu deinen DNS-Einstellungen (Cloudflare / IONOS / Namecheap / wo auch immer die Domain liegt)
- Ca. 15 Minuten

---

## Schritt 1 — Domain in Resend hinzufügen

Direkt-Link:
```
https://resend.com/domains/add
```

1. Auf der Seite: Domain `chairmatch.de` eingeben → **Add**
2. Resend zeigt dir jetzt 3–4 DNS-Einträge, die du setzen musst

---

## Schritt 2 — DNS-Einträge setzen

Resend gibt dir konkrete Werte — hier das Muster (deine tatsächlichen Werte siehst du nach Schritt 1):

### SPF-Eintrag (verhindert Spam-Markierung)
| Typ | Name | Wert |
|-----|------|------|
| `TXT` | `chairmatch.de` | `v=spf1 include:amazonses.com ~all` |

### DKIM-Eintrag (digitale Signatur)
| Typ | Name | Wert |
|-----|------|------|
| `CNAME` | `resend._domainkey.chairmatch.de` | `resend._domainkey.resend.com` (o.ä.) |

### DMARC-Eintrag (Empfänger-Schutz)
| Typ | Name | Wert |
|-----|------|------|
| `TXT` | `_dmarc.chairmatch.de` | `v=DMARC1; p=none; rua=mailto:legal@chairmatch.de` |

> **Wichtig:** Verwende die Werte, die Resend dir direkt anzeigt — nicht die Beispiele oben.
> Die DKIM-Werte sind individuell pro Account.

### Wo eintragen?

**Cloudflare:** Dashboard → deine Domain → **DNS** → **Add record**

**IONOS:** Kundencenter → Domains → chairmatch.de → **DNS** → Eintrag hinzufügen

**Andere Anbieter:** Suche nach "DNS-Verwaltung" oder "Nameserver-Einstellungen" in deinem Hosting-Panel

---

## Schritt 3 — Verifizierung abwarten

1. Nach dem Setzen: zurück zu Resend → **Domains** → `chairmatch.de`
2. Auf **Verify** klicken oder warten bis der Status auf **Verified** springt
3. DNS-Propagierung dauert: meist 5–30 Minuten, manchmal bis zu 24 Stunden

Du kannst den Status-Check beschleunigen mit:
```bash
dig TXT chairmatch.de +short
```
Wenn du deinen SPF-Eintrag siehst → DNS ist propagiert.

---

## Schritt 4 — Resend API Key erstellen

```
https://resend.com/api-keys
```

1. **Create API Key** → Name: `ChairMatch Production`
2. Permission: **Full Access** (oder **Sending Access**)
3. Den Key (beginnt mit `re_`) sofort kopieren — wird nur einmal angezeigt!
4. In Vercel eintragen: `RESEND_API_KEY` = der Key

---

## Schritt 5 — Absender-Variable in Vercel setzen

```
RESEND_FROM_EMAIL = ChairMatch <noreply@chairmatch.de>
```

In Vercel: Settings → Environment Variables → Add New → Key + Value → Production → Save

---

## Test

Nach der Einrichtung: eine Testbuchung in der App anlegen.
Wenn eine E-Mail mit Betreff **"Buchungsbestätigung — [Salonname]"** ankommt → alles funktioniert.

Falls nichts kommt: Resend Dashboard → **Logs** → dort siehst du ob Emails versendet wurden und warum sie evtl. fehlgeschlagen sind.

---

**Weiter mit:** → [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md)
