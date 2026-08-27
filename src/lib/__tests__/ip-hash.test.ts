// @vitest-environment node
/**
 * `ip_hash` muss ein Hash sein.
 *
 * Bis Track 12 stand in `/api/auth/register`:
 *
 *     const ipHash = ip ? Buffer.from(ip).toString('base64').slice(0, 32) : null
 *
 * Base64 ist eine Kodierung. In der Spalte `ip_hash` lag damit die IP jeder
 * registrierten Person, nur anders geschrieben. Der Bestandstest war gruen,
 * weil er `not.toContain(ip)` prueft — und die base64-Zeichenkette die IP
 * tatsaechlich nicht als Teilkette enthaelt.
 */
import { describe, it, expect } from 'vitest'
import { hashIp, requestIp } from '@/lib/ip-hash'

const ENV = { CONSENT_IP_SALT: 'salz-fuer-den-test' } as unknown as NodeJS.ProcessEnv
const IP = '198.51.100.23'

describe('hashIp', () => {
  it('liefert einen SHA-256-HMAC in Hex', () => {
    expect(hashIp(IP, ENV)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('ist deterministisch', () => {
    expect(hashIp(IP, ENV)).toBe(hashIp(IP, ENV))
  })

  it('trennt verschiedene Adressen', () => {
    expect(hashIp(IP, ENV)).not.toBe(hashIp('203.0.113.7', ENV))
    // Auch benachbarte Adressen — ein Hash, der /24-Nachbarn zusammenwirft,
    // waere fuer die Missbrauchsanalyse wertlos.
    expect(hashIp('198.51.100.23', ENV)).not.toBe(hashIp('198.51.100.24', ENV))
  })

  it('ist ohne das Geheimnis nicht nachzubauen', () => {
    const anderesSalz = { CONSENT_IP_SALT: 'anderes-salz' } as unknown as NodeJS.ProcessEnv
    expect(hashIp(IP, ENV)).not.toBe(hashIp(IP, anderesSalz))
  })

  it.each([
    ['base64', 'base64'],
    ['base64url', 'base64url'],
    ['hex', 'hex'],
  ] as const)('laesst sich nicht per %s zurueckrechnen', (_name, kodierung) => {
    const wert = hashIp(IP, ENV) as string
    let entschluesselt = ''
    try {
      entschluesselt = Buffer.from(wert, kodierung).toString('utf8')
    } catch {
      /* nicht dekodierbar ist das gewuenschte Ergebnis */
    }
    expect(entschluesselt).not.toContain(IP)
  })

  it('faengt die alte Implementierung: base64 haette diesen Test nicht bestanden', () => {
    const alt = Buffer.from(IP).toString('base64').slice(0, 32)
    // Beweis, dass der Bestandstest den Defekt nicht sehen konnte …
    expect(alt).not.toContain(IP)
    // … und dass die Pruefung oben ihn sieht.
    expect(Buffer.from(alt, 'base64').toString('utf8')).toContain(IP)
    expect(alt).not.toMatch(/^[0-9a-f]{64}$/)
  })

  it.each([
    ['leerer String', ''],
    ['nur Leerzeichen', '   '],
    ['null', null],
    ['undefined', undefined],
  ])('gibt bei %s null zurueck', (_name, eingabe) => {
    expect(hashIp(eingabe, ENV)).toBeNull()
  })

  it('gibt lieber null zurueck als einen ungesalzenen Wert', () => {
    // Ein blosser SHA-256 ohne Schluessel waere hier wertlos: der gesamte
    // IPv4-Raum ist in Minuten durchgerechnet. Ohne Geheimnis bleibt die
    // Spalte deshalb leer.
    expect(hashIp(IP, {} as NodeJS.ProcessEnv)).toBeNull()
  })

  it('nutzt das Auth-Geheimnis als Rueckfall', () => {
    const fallback = { NEXTAUTH_SECRET: 'auth-geheimnis' } as unknown as NodeJS.ProcessEnv
    expect(hashIp(IP, fallback)).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe('requestIp', () => {
  const req = (headers: Record<string, string>) => ({
    headers: { get: (name: string) => headers[name] ?? null },
  })

  it('nimmt den ersten Eintrag aus x-forwarded-for', () => {
    expect(requestIp(req({ 'x-forwarded-for': '198.51.100.23, 10.0.0.1' }))).toBe('198.51.100.23')
  })

  it('faellt auf x-real-ip zurueck', () => {
    expect(requestIp(req({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7')
  })

  it('gibt ohne Header null zurueck — nicht den String "unknown"', () => {
    // Ein Platzhalter wuerde zu einem echten Hashwert fuehren, unter dem alle
    // Aufrufer ohne Proxy-Header zusammenfallen.
    expect(requestIp(req({}))).toBeNull()
  })
})
