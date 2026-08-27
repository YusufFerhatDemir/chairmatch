// @vitest-environment node
/**
 * Der Ursprung, auf den eine Zahlung zurueckkehrt, darf nicht aus dem
 * Request kommen.
 *
 * Bis Track 12 stand an sechs Stellen:
 *
 *     const origin = req.headers.get('origin') || 'https://www.chairmatch.de'
 *
 * und der Wert ging unveraendert als `success_url`/`cancel_url` an Stripe
 * bzw. als `return_url`/`refresh_url` an das Connect-Onboarding. `Origin`
 * setzt bei einem Browser der Browser — dieser Endpunkt ist aber nicht auf
 * Browser angewiesen. Ein `curl -H 'Origin: https://…'` genuegte, um eine
 * echte, von uns erzeugte Stripe-Session zu bekommen, die nach der Zahlung
 * auf eine fremde Domain weiterleitet.
 */
import { describe, it, expect } from 'vitest'
import { resolveAppOrigin, allowedOrigins, DEFAULT_ORIGIN } from '@/lib/app-origin'

const PROD = {
  NODE_ENV: 'production',
  NEXT_PUBLIC_APP_URL: 'https://www.chairmatch.de',
} as unknown as NodeJS.ProcessEnv

describe('resolveAppOrigin', () => {
  it('uebernimmt den eigenen Ursprung aus dem Header', () => {
    expect(resolveAppOrigin('https://www.chairmatch.de', PROD)).toBe('https://www.chairmatch.de')
    expect(resolveAppOrigin('https://chairmatch.de', PROD)).toBe('https://chairmatch.de')
  })

  it.each([
    ['fremde Domain', 'https://evil.example'],
    ['Lookalike mit Bindestrich', 'https://chairmatch-zahlung.example'],
    ['Subdomain-Trick', 'https://www.chairmatch.de.evil.example'],
    ['Praefix-Trick', 'https://notchairmatch.de'],
    ['Suffix ohne Punkt', 'https://xchairmatch.de'],
    ['http statt https auf eigener Domain', 'http://www.chairmatch.de'],
    ['kein gueltiger Ursprung', 'nicht-mal-eine-url'],
    ['leerer Header', ''],
    ['javascript-Schema', 'javascript:alert(1)'],
  ])('weist %s zurueck und faellt auf die eigene Adresse', (_name, header) => {
    expect(resolveAppOrigin(header, PROD)).toBe('https://www.chairmatch.de')
  })

  it('faellt ohne Header auf die eigene Adresse', () => {
    expect(resolveAppOrigin(null, PROD)).toBe('https://www.chairmatch.de')
    expect(resolveAppOrigin(undefined, PROD)).toBe('https://www.chairmatch.de')
  })

  it('nimmt ohne jede Konfiguration die Produktionsadresse', () => {
    expect(resolveAppOrigin('https://evil.example', {} as NodeJS.ProcessEnv)).toBe(DEFAULT_ORIGIN)
  })

  it('ignoriert Pfad und Query im Header — nur der Ursprung zaehlt', () => {
    // Ein Header mit Pfad ist kein gueltiger Origin, aber ihn stillschweigend
    // mit Pfad durchzureichen wuerde `${origin}/rentals?...` verbiegen.
    expect(resolveAppOrigin('https://www.chairmatch.de/beliebig?x=1', PROD)).toBe(
      'https://www.chairmatch.de',
    )
  })

  it('laesst das Deployment seiner selbst zurueckkehren (Vercel-Preview)', () => {
    const preview = {
      NODE_ENV: 'production',
      VERCEL_URL: 'chairmatch-abc123.vercel.app',
    } as unknown as NodeJS.ProcessEnv
    expect(resolveAppOrigin('https://chairmatch-abc123.vercel.app', preview)).toBe(
      'https://chairmatch-abc123.vercel.app',
    )
    // Eine FREMDE vercel.app-Adresse bleibt fremd.
    expect(resolveAppOrigin('https://boeser-klon.vercel.app', preview)).toBe(DEFAULT_ORIGIN)
  })

  it('erlaubt localhost nur in der Entwicklung', () => {
    const dev = { NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv
    expect(resolveAppOrigin('http://localhost:3000', dev)).toBe('http://localhost:3000')
    expect(resolveAppOrigin('http://localhost:3000', PROD)).toBe('https://www.chairmatch.de')
  })

  it('verkraftet ein kaputtes NEXT_PUBLIC_APP_URL, ohne die Zahlung zu blockieren', () => {
    const kaputt = {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'kein-schema.chairmatch.de',
    } as unknown as NodeJS.ProcessEnv
    expect(resolveAppOrigin('https://evil.example', kaputt)).toBe(DEFAULT_ORIGIN)
  })
})

describe('allowedOrigins', () => {
  it('fuehrt jede Adresse nur einmal, unabhaengig vom Schraegstrich', () => {
    const env = {
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://www.chairmatch.de/',
    } as unknown as NodeJS.ProcessEnv
    const liste = allowedOrigins(env)
    expect(liste.filter((o) => o === 'https://www.chairmatch.de')).toHaveLength(1)
  })

  it('nimmt in Produktion kein localhost auf', () => {
    expect(allowedOrigins(PROD)).not.toContain('http://localhost:3000')
  })
})
