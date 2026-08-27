// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

/**
 * Der Meldeendpunkt der Report-Only-CSP.
 *
 * Er ist bewusst ohne Session erreichbar — der Browser schickt CSP-Reports
 * ohne Credentials. Das macht ihn zu einer offenen Schreib-Route, und die
 * einzige Sache, die man dort falsch machen kann, ist sie unbegrenzt
 * mitschreiben zu lassen. Deshalb pruefen diese Tests vor allem die Deckel:
 * Groesse, Anzahl, und dass ein `script-sample` nicht in voller Laenge in die
 * Logs laeuft (es kann Formularinhalte des Nutzers enthalten).
 */

function reportRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://chairmatch.de/api/csp-report', {
    method: 'POST',
    headers: { 'content-type': 'application/csp-report', 'x-forwarded-for': '203.0.113.7', ...headers },
    body,
  })
}

let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  warn.mockRestore()
})

describe('POST /api/csp-report', () => {
  it('nimmt das report-uri-Format an und protokolliert die Direktive', async () => {
    const res = await POST(
      reportRequest(
        JSON.stringify({
          'csp-report': {
            'violated-directive': "script-src-elem 'nonce-…'",
            'blocked-uri': 'inline',
            'document-uri': 'https://chairmatch.de/karte',
          },
        }),
      ),
    )

    expect(res.status).toBe(204)
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0][1])).toContain('script-src-elem')
  })

  it('versteht auch das neuere Reporting-API-Format (Array aus {type, body})', async () => {
    const res = await POST(
      reportRequest(
        JSON.stringify([
          { type: 'csp-violation', body: { effectiveDirective: 'script-src-attr', blockedURL: 'inline' } },
        ]),
      ),
    )

    expect(res.status).toBe(204)
    expect(String(warn.mock.calls[0][1])).toContain('script-src-attr')
  })

  it('kuerzt script-sample, damit keine Formulareingaben in den Logs landen', async () => {
    await POST(
      reportRequest(
        JSON.stringify({
          'csp-report': {
            'violated-directive': 'script-src',
            'script-sample': 'x'.repeat(5000),
          },
        }),
      ),
    )

    const geloggt = JSON.parse(String(warn.mock.calls[0][1]))
    expect(geloggt.sample.length).toBe(120)
  })

  it('verwirft ueberlange Bodies, ohne sie zu lesen', async () => {
    const res = await POST(reportRequest('{}', { 'content-length': '99999' }))
    expect(res.status).toBe(413)
    expect(warn).not.toHaveBeenCalled()
  })

  it('schluckt kaputtes JSON stillschweigend', async () => {
    const res = await POST(reportRequest('das ist kein json'))
    expect(res.status).toBe(204)
    expect(warn).not.toHaveBeenCalled()
  })

  it('protokolliert hoechstens 5 Reports pro Anfrage', async () => {
    const viele = Array.from({ length: 40 }, (_, i) => ({
      type: 'csp-violation',
      body: { effectiveDirective: `script-src-${i}` },
    }))
    await POST(reportRequest(JSON.stringify(viele)))
    expect(warn.mock.calls.length).toBe(5)
  })

  it('ignoriert Eintraege ohne Direktive', async () => {
    const res = await POST(reportRequest(JSON.stringify({ 'csp-report': { 'blocked-uri': 'inline' } })))
    expect(res.status).toBe(204)
    expect(warn).not.toHaveBeenCalled()
  })
})
