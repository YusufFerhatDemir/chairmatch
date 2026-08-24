// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, clientIp, rateLimitResponse, __resetRateLimits } from '@/lib/rate-limit'

/**
 * Rate-Limit — die Eigenschaften, auf die sich die Routen verlassen.
 *
 * Bis 2026-08-24 gab es diesen Deckel nur in /api/newsletter, als einzige von
 * 97 Routen. Ungeschuetzt waren unter anderem /api/auth/forgot-password (loest
 * fremden Mailversand aus) und /api/setup/promote-admin (vergibt die hoechste
 * Rolle der Anwendung).
 */

const WINDOW = { scope: 'test', max: 3, windowMs: 60_000 }

beforeEach(() => {
  __resetRateLimits()
})

describe('checkRateLimit', () => {
  it('laesst genau `max` Anfragen durch und blockt die naechste', () => {
    const results = [1, 2, 3, 4].map(() => checkRateLimit('1.2.3.4', WINDOW))

    expect(results.map(r => r.limited)).toEqual([false, false, false, true])
    expect(results[0].remaining).toBe(2)
    expect(results[2].remaining).toBe(0)
  })

  it('zaehlt eine geblockte Anfrage NICHT mit', () => {
    // Sonst haelt ein Angreifer, der stur weiterfeuert, das Fenster dauerhaft
    // offen — und sperrt damit den legitimen Nutzer hinter derselben IP aus.
    for (let i = 0; i < 3; i++) checkRateLimit('5.6.7.8', WINDOW)

    const first = checkRateLimit('5.6.7.8', WINDOW)
    const second = checkRateLimit('5.6.7.8', WINDOW)

    expect(first.limited).toBe(true)
    expect(second.limited).toBe(true)
    // Beide melden dieselbe Wartezeit — das Fenster ist nicht weitergerueckt.
    expect(second.retryAfterSeconds).toBeLessThanOrEqual(first.retryAfterSeconds)
  })

  it('trennt Zaehler nach Identifier', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('9.9.9.9', WINDOW)

    expect(checkRateLimit('9.9.9.9', WINDOW).limited).toBe(true)
    expect(checkRateLimit('8.8.8.8', WINDOW).limited).toBe(false)
  })

  it('trennt Zaehler nach Scope — zwei Endpunkte teilen kein Budget', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('7.7.7.7', WINDOW)

    expect(checkRateLimit('7.7.7.7', WINDOW).limited).toBe(true)
    expect(checkRateLimit('7.7.7.7', { ...WINDOW, scope: 'anderer' }).limited).toBe(false)
  })

  it('gibt eine Wartezeit an, die im Fenster liegt', () => {
    for (let i = 0; i < 3; i++) checkRateLimit('6.6.6.6', WINDOW)
    const blocked = checkRateLimit('6.6.6.6', WINDOW)

    expect(blocked.retryAfterSeconds).toBeGreaterThan(0)
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60)
  })
})

describe('clientIp', () => {
  const req = (headers: Record<string, string>) => ({
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
  })

  it('nimmt den ersten Eintrag aus x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18' }))).toBe('203.0.113.7')
  })

  it('faellt auf x-real-ip zurueck', () => {
    expect(clientIp(req({ 'x-real-ip': '198.51.100.4' }))).toBe('198.51.100.4')
  })

  it('liefert einen Platzhalter statt undefined, wenn nichts da ist', () => {
    // Ohne das teilen sich alle header-losen Anfragen den Schluessel
    // `undefined` — der Zaehler waere zufaellig global statt pro Client.
    expect(clientIp(req({}))).toBe('unknown')
  })

  it('ignoriert einen leeren x-forwarded-for', () => {
    expect(clientIp(req({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9')
  })
})

describe('rateLimitResponse', () => {
  it('antwortet 429 mit Retry-After', async () => {
    for (let i = 0; i < 3; i++) checkRateLimit('4.4.4.4', WINDOW)
    const blocked = checkRateLimit('4.4.4.4', WINDOW)

    const res = rateLimitResponse(blocked, 'Zu viele Anfragen.')

    expect(res.status).toBe(429)
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0)
    await expect(res.json()).resolves.toEqual({ error: 'Zu viele Anfragen.' })
  })
})
