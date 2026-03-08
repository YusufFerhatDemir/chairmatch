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
]

for (const { path, titleMatch } of publicPages) {
  test(`${path} loads successfully`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page).toHaveTitle(titleMatch)
  })
}
