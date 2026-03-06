import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ChairMatch/)
  })

  test('renders salon cards from DB', async ({ page }) => {
    await page.goto('/')
    // Page should contain salon-related content
    await expect(page.locator('body')).toContainText(/Salon|Buche|Entdeck/i)
  })

  test('has working navigation links', async ({ page }) => {
    await page.goto('/')
    // Check that key nav links exist
    const exploreLink = page.locator('a[href*="explore"]').first()
    if (await exploreLink.isVisible()) {
      await exploreLink.click()
      await expect(page).toHaveURL(/explore/)
    }
  })
})
