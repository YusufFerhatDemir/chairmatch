import { test, expect } from '@playwright/test'

test.describe('HomePage', () => {
  test('shows ChairMatch title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ChairMatch/)
  })

  test('shows navigation bar', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('nav')).toBeVisible()
  })

  test('navigates to explore page', async ({ page }) => {
    await page.goto('/')
    await page.click('text=TERMIN')
    await expect(page).toHaveURL(/explore/)
  })

  test('shows category cards on home', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.catcard').first()).toBeVisible()
  })
})
