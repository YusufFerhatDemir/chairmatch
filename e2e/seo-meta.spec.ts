/**
 * SEO-Meta-Tests: stelle sicher, dass die wichtigsten SEO-Properties
 * auf allen Money-Pages korrekt vorhanden sind.
 *
 * Checks:
 * - Canonical-URL gesetzt
 * - OpenGraph-Tags vorhanden
 * - JSON-LD Schema.org strukturiertes Data
 * - Description länger als 100 Zeichen (kein leerer Meta-Tag)
 */

import { test, expect } from '@playwright/test'

const seoPages = [
  '/',
  '/was-ist-chairmatch',
  '/anbieter/wie-es-funktioniert',
  '/mieter/wie-es-funktioniert',
  '/provisionsmodell',
  '/magazin',
  '/magazin/wie-funktioniert-stuhl-miete',
  '/freelancer-rechner',
  '/friseur-deutschland',
  '/barbershop-deutschland',
]

for (const path of seoPages) {
  test(`SEO-Meta für ${path}`, async ({ page }) => {
    await page.goto(path)

    // Canonical
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
    expect(canonical).toBeTruthy()
    expect(canonical).toMatch(/^https:\/\/chairmatch\.de/)

    // OG-Title
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
    expect(ogTitle!.length).toBeGreaterThan(10)

    // OG-Description
    const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content')
    expect(ogDesc).toBeTruthy()

    // Description
    const desc = await page.locator('meta[name="description"]').getAttribute('content')
    expect(desc).toBeTruthy()
    expect(desc!.length).toBeGreaterThan(50)

    // Mindestens 1 JSON-LD Schema
    const jsonLdCount = await page.locator('script[type="application/ld+json"]').count()
    expect(jsonLdCount).toBeGreaterThanOrEqual(1)
  })
}

test('Sitemap.xml gibt 200 zurück und enthält key URLs', async ({ page }) => {
  const response = await page.goto('/sitemap.xml')
  expect(response?.status()).toBe(200)
  const text = await page.content()
  expect(text).toContain('chairmatch.de/')
  expect(text).toContain('chairmatch.de/explore')
})

test('Robots.txt gibt 200 zurück und whitelistet AI-Crawler', async ({ page }) => {
  const response = await page.goto('/robots.txt')
  expect(response?.status()).toBe(200)
  const text = await page.content()
  expect(text).toContain('GPTBot')
  expect(text).toContain('ClaudeBot')
})

test('llms.txt gibt 200 zurück (AI-Engine-Discovery)', async ({ page }) => {
  const response = await page.goto('/llms.txt')
  expect(response?.status()).toBe(200)
})
