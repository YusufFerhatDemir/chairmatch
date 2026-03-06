import { test, expect } from '@playwright/test'

const protectedPages = [
  '/account',
  '/favorites',
  '/admin',
  '/provider',
]

for (const path of protectedPages) {
  test(`${path} redirects unauthenticated users`, async ({ page }) => {
    const response = await page.goto(path)
    // Should redirect to auth page (307) or show auth page
    const url = page.url()
    expect(url).toMatch(/auth|anmeld/i)
  })
}
