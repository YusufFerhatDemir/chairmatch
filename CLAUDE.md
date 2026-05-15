# CLAUDE.md — ChairMatch Proje Kuralları

## ‼️ Autonomie-Regel (HARTE REGEL — NIE BRECHEN) ‼️

yusuf soll NIE Terminal-Befehle eingeben müssen. NIE.

**Standardflow für JEDE Code-Änderung:**
1. Änderung machen
2. `npm run typecheck` zur Verifikation
3. `git add -A && git commit -m "..."` mit beschreibender Message
4. `git push origin main` — triggert automatisch Vercel-Deploy
5. Im Report nur das Ergebnis melden, KEINE Befehle vorschlagen die yusuf eingeben soll

**Wenn ein Lock-Problem (`.git/index.lock`) auftritt:** `rm -f .git/index.lock` und weitermachen — nicht an User delegieren.

**Wenn du in einem bindfs-Mount steckst und nicht löschen kannst:** abbrechen mit klarer Meldung, damit Dispatch einen Code-Task auf dem Host spawnen kann.

**Wenn yusuf nach einem Stand fragt:** kurze Sachinfo + nächste Aktion, NICHT Befehle zum selbst-ausführen.

**Externe Logins (Supabase Dashboard, Vercel UI, Domain-Provider, Stripe, Resend):** das sind die EINZIGEN Klick-Aktionen, die yusuf machen muss. Alles andere passiert durch dich.

Vercel-Setup: jeder Push auf `main` löst automatisch ein Deployment aus. Es gibt KEIN `vercel deploy` einzugeben.

**Bequemes Wrapper-Skript:** `./deploy.sh "commit message"` macht Lock-Cleanup + typecheck + commit + push in einem Schritt. Agents nutzen das als Default — yusuf braucht es NIE manuell.

---

## Deployment
- Her push sonrası Vercel preview otomatik oluşur — kullanıcıdan onay isteme
- Push → PR → Merge akışını mümkünse otomatik yap

## Stil
- Seçenekli sorularda her zaman kısa artı/eksi tablosu göster
- Türkçe iletişim (kullanıcı tercih etti)

## Teknik
- Stack: Next.js (App Router) + React + TypeScript + Supabase + Tailwind (`src/`)
- Legacy: `index_legacy.html` enthält den alten vanilla-JS SPA-Stand (read-only Referenz, nicht mehr aktiv)
- Deploy: Vercel (otomatik, main branch)
- SSH key kurulu, HTTPS token değil
