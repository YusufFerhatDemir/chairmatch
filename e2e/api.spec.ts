import { test, expect } from '@playwright/test'

/**
 * API-Routen gegen eine laufende Instanz.
 *
 * Läuft aus demselben Grund nicht in CI wie `protected-pages.spec.ts`
 * (dort steht die Begründung). Manuell:
 *     npx playwright test e2e/api.spec.ts
 *
 * Bis Track 24 stand hier durchgängig `expect([200, 307, 401, 403])
 * .toContain(response.status())`. Eine Zusicherung, die vier sich
 * gegenseitig ausschließende Antworten akzeptiert, schlägt nie an: sie hätte
 * eine offene Route ebenso durchgewinkt wie eine geschlossene. Jede Prüfung
 * hier nennt jetzt genau eine erwartete Antwort.
 */

test.describe('API-Routen', () => {
  test('GET /api/reviews antwortet mit JSON', async ({ request }) => {
    const response = await request.get('/api/reviews?salonId=00000000-0000-4000-8000-000000000000')

    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('application/json')

    const body = await response.json()
    // Unbekannter Salon → leere Liste, kein Fehler.
    expect(Array.isArray(body.reviews ?? body)).toBe(true)
  })

  test('GET /api/bookings ohne Anmeldung ist 401', async ({ request }) => {
    const response = await request.get('/api/bookings')
    expect(response.status()).toBe(401)
  })

  test('POST /api/bookings ohne Anmeldung legt nichts an', async ({ request }) => {
    const response = await request.post('/api/bookings', {
      data: {
        salonId: '00000000-0000-4000-8000-000000000000',
        serviceId: '00000000-0000-4000-8000-000000000000',
        date: '2027-01-01',
        startTime: '10:00',
      },
    })

    expect(response.status()).toBe(401)
  })

  test('die Admin-Schnittstelle ist ohne Anmeldung geschlossen', async ({ request }) => {
    // Gegenprobe zur Produktionssonde in scripts/prod-probe.sh.
    for (const pfad of ['/api/admin/kpi', '/api/admin/mis', '/api/admin/export']) {
      const response = await request.get(pfad)
      expect(response.status(), `${pfad} muss 401 liefern`).toBe(401)
    }
  })
})
