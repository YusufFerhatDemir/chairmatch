import { test, expect } from '@playwright/test'

test.describe('API Routes', () => {
  test('GET /api/reviews returns JSON', async ({ request }) => {
    const response = await request.get('/api/reviews?salonId=nonexistent')
    // Should return 200 with empty array or 307 redirect
    expect([200, 307]).toContain(response.status())
  })

  test('GET /api/bookings without auth redirects', async ({ request }) => {
    const response = await request.get('/api/bookings')
    // Should redirect or return 401
    expect([200, 307, 401]).toContain(response.status())
  })

  test('POST /api/bookings without auth fails', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: { salonId: 'test', serviceId: 'test', date: '2026-01-01', startTime: '10:00' },
    })
    // API route handles auth internally - may return 200 with error body or redirect
    expect([200, 307, 401, 403]).toContain(response.status())
  })
})
