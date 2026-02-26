# CLAUDE.md — ChairMatch Proje Kuralları

## Deployment
- Her push sonrası Vercel preview otomatik oluşur — kullanıcıdan onay isteme
- Push → PR → Merge akışını mümkünse otomatik yap

## Stil
- Seçenekli sorularda her zaman kısa artı/eksi tablosu göster
- Türkçe iletişim (kullanıcı tercih etti)

## Teknik
- Proje: Tek dosya vanilla JS SPA (index.html)
- Deploy: Vercel (otomatik, main branch)
- CSS: Custom properties ile responsive (--pad, --font-xs/sm/md/lg/xl, --shell-max)
- SSH key kurulu, HTTPS token değil
