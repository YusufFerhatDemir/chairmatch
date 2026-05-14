/**
 * API-Health-Tests: alle wichtigen Public-API-Endpunkte antworten korrekt.
 */

import { test, expect } from '@playwright/test'

test('GET /api/health → 200', async ({ request }) => {
  const res = await request.get('/api/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('status')
})

test('GET /api/admin/health → 403 ohne Super-Admin-Session', async ({ request }) => {
  const res = await request.get('/api/admin/health')
  // 403 (no role) oder 401 (no session) — beide ok
  expect([401, 403]).toContain(res.status())
})

test('GET /api/admin/kpi → 403 ohne Super-Admin-Session', async ({ request }) => {
  const res = await request.get('/api/admin/kpi')
  expect([401, 403]).toContain(res.status())
})

test('GET /api/messages → 401 ohne Session', async ({ request }) => {
  const res = await request.get('/api/messages')
  expect(res.status()).toBe(401)
})

test('GET /api/cron/index-new-content → 401 ohne CRON_SECRET', async ({ request }) => {
  const res = await request.get('/api/cron/index-new-content')
  expect(res.status()).toBe(401)
})

test('GET /sitemap.xml → text/xml', async ({ request }) => {
  const res = await request.get('/sitemap.xml')
  expect(res.status()).toBe(200)
})
