import { test, expect } from '@playwright/test'

/**
 * Geschützte Seiten leiten Nicht-Angemeldete auf /auth um.
 *
 * ── Warum diese Datei NICHT in CI läuft ──────────────────────────────
 * Playwright braucht einen laufenden Server (`webServer` in
 * playwright.config.ts). Dieser Server benutzt dieselben Supabase-Zugangs-
 * daten wie die Produktion — Tests und Produktion teilen sich das Projekt
 * `pwdbjqfpgumyfktbfswg`. Ein CI-Lauf gegen diese Umgebung würde in echten
 * Tabellen schreiben; genau deshalb liegt die eigentliche E2E-Suite unter
 * `src/__tests__/e2e/` gegen eine In-Memory-Datenbank (siehe deren README).
 *
 * Dieselbe Zusage ist dort ohne Netz und ohne Produktionsdaten geprüft:
 * `src/__tests__/middleware-auth-decision.test.ts` und
 * `middleware-public-paths.test.ts` prüfen die Umleitungsentscheidung für
 * genau diese Pfade — und die laufen in CI.
 *
 * Diese Datei bleibt als manuelle Gegenprobe gegen eine echte Instanz:
 *     npx playwright test e2e/protected-pages.spec.ts
 *
 * Bis Track 24 stand hier `expect(url).toMatch(/auth|anmeld/i)` — das hätte
 * auch eine Seite erfüllt, die zufällig das Wort „Anmelden" im Menü trägt,
 * also auch eine ungeschützte. Geprüft wird jetzt das Ziel selbst.
 */

const protectedPages = ['/account', '/favorites', '/admin', '/provider']

for (const path of protectedPages) {
  test(`${path} leitet Nicht-Angemeldete auf /auth um`, async ({ page }) => {
    await page.goto(path)

    const ziel = new URL(page.url())

    // Auf /auth gelandet — nicht bloß „irgendwo, wo 'auth' vorkommt".
    expect(ziel.pathname).toBe('/auth')

    // Und mit Rücksprungziel, sonst landet man nach dem Login auf der
    // Startseite statt auf der Seite, die man aufrufen wollte.
    expect(ziel.searchParams.get('callbackUrl')).toBe(path)

    // Der Inhalt der geschützten Seite darf dabei nicht schon ausgeliefert
    // worden sein.
    await expect(page).toHaveURL(/\/auth\?/)
  })
}
