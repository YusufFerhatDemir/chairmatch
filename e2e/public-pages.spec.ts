import { test, expect } from '@playwright/test'

const publicPages = [
  { path: '/', titleMatch: /ChairMatch/ },
  { path: '/explore', titleMatch: /ChairMatch/ },
  { path: '/offers', titleMatch: /ChairMatch/ },
  { path: '/rentals', titleMatch: /ChairMatch/ },
  { path: '/search', titleMatch: /ChairMatch/ },
  { path: '/auth', titleMatch: /ChairMatch/ },
  { path: '/datenschutz', titleMatch: /ChairMatch/ },
  { path: '/impressum', titleMatch: /ChairMatch/ },
  { path: '/agb', titleMatch: /ChairMatch/ },
  { path: '/was-ist-chairmatch', titleMatch: /ChairMatch/ },
  { path: '/anbieter/wie-es-funktioniert', titleMatch: /ChairMatch/ },
  { path: '/mieter/wie-es-funktioniert', titleMatch: /ChairMatch/ },
  { path: '/provisionsmodell', titleMatch: /ChairMatch/ },
  { path: '/magazin', titleMatch: /ChairMatch/ },
  { path: '/freelancer-rechner', titleMatch: /ChairMatch/ },
  // SEO-Money-Pages
  { path: '/friseur-deutschland', titleMatch: /Friseur|ChairMatch/ },
  { path: '/barbershop-deutschland', titleMatch: /Barber|ChairMatch/ },
  { path: '/kosmetik-deutschland', titleMatch: /Kosmetik|ChairMatch/ },
  // Magazin-Artikel
  { path: '/magazin/wie-funktioniert-stuhl-miete', titleMatch: /Stuhl-Miete|ChairMatch/ },
  { path: '/magazin/steuern-bei-stuhl-miete', titleMatch: /Steuern|ChairMatch/ },
]

for (const { path, titleMatch } of publicPages) {
  test(`${path} loads successfully`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(titleMatch)
  })
}
