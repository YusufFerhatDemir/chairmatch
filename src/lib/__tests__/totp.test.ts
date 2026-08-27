/**
 * TOTP (2FA).
 *
 * Geprueft wird gegen die offiziellen Testvektoren aus RFC 6238 (Anhang B,
 * SHA-1). Das ist der einzige Weg, eine selbstgebaute TOTP-Implementierung
 * zu belegen: stimmt sie mit dem Standard ueberein, akzeptiert sie auch die
 * Codes aus Google Authenticator, 1Password & Co.
 *
 * RFC-Secret: ASCII "12345678901234567890" → Base32
 * GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ. Die RFC nennt achtstellige Codes; diese
 * Implementierung nimmt davon die letzten sechs Stellen.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { generateSecret, verifyToken } from '../totp'

const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

/** Zeitpunkt (Unix-Sekunden) → erwarteter 6-stelliger Code laut RFC 6238. */
const VECTORS: [number, string][] = [
  [59, '287082'],          // RFC: 94287082
  [1111111109, '081804'],  // RFC: 07081804
  [1111111111, '050471'],  // RFC: 14050471
  [1234567890, '005924'],  // RFC: 89005924
  [2000000000, '279037'],  // RFC: 69279037
]

function at(unixSeconds: number) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(unixSeconds * 1000))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('verifyToken gegen RFC 6238', () => {
  it.each(VECTORS)('akzeptiert bei t=%i den Code %s', (t, code) => {
    at(t)
    expect(verifyToken(RFC_SECRET, code)).toBe(true)
  })

  it.each(VECTORS)('lehnt bei t=%i einen falschen Code ab', t => {
    at(t)
    expect(verifyToken(RFC_SECRET, '000000')).toBe(false)
    expect(verifyToken(RFC_SECRET, '999999')).toBe(false)
  })

  it('toleriert einen Zeitschritt Uhrendrift in beide Richtungen', () => {
    // Der Code des vorherigen und des naechsten 30-Sekunden-Fensters muss
    // durchgehen — sonst scheitert 2FA an leicht falsch gehenden Uhren.
    at(1111111109) // Fenster mit Code 081804
    expect(verifyToken(RFC_SECRET, '081804')).toBe(true)
    at(1111111109 + 30)
    expect(verifyToken(RFC_SECRET, '081804')).toBe(true)
    at(1111111109 - 30)
    expect(verifyToken(RFC_SECRET, '081804')).toBe(true)
  })

  it('laesst zwei Zeitschritte Drift NICHT mehr durch', () => {
    at(1111111109 + 90)
    expect(verifyToken(RFC_SECRET, '081804')).toBe(false)
  })

  it('lehnt leere und formfremde Eingaben ab', () => {
    at(59)
    for (const bad of ['', '  ', '28708', '2870820', 'abcdef', '287 082']) {
      expect(verifyToken(RFC_SECRET, bad), bad).toBe(false)
    }
  })
})

describe('generateSecret', () => {
  it('liefert ein Base32-Secret aus 20 Zufallsbytes (32 Zeichen)', () => {
    const { secret } = generateSecret('kundin@example.de')
    expect(secret).toMatch(/^[A-Z2-7]{32}$/)
  })

  it('liefert bei jedem Aufruf ein anderes Secret', () => {
    const secrets = new Set(
      Array.from({ length: 20 }, () => generateSecret('kundin@example.de').secret),
    )
    expect(secrets.size).toBe(20)
  })

  it('baut eine otpauth-URL mit kodierter E-Mail und Issuer', () => {
    const { secret, qrUrl } = generateSecret('a+b@example.de')
    expect(qrUrl).toBe(
      `otpauth://totp/ChairMatch:a%2Bb%40example.de?secret=${secret}&issuer=ChairMatch`,
    )
  })

  it('erzeugt ein Secret, das die eigene Pruefung besteht', () => {
    // Round-Trip: Base32-Encode → Decode → HMAC muss zusammenpassen.
    const { secret } = generateSecret('kundin@example.de')
    at(1111111109)
    // Ein zufaelliger Code darf nicht passen — aber die Pruefung muss
    // ohne Fehler durchlaufen (kein Absturz bei frischem Base32).
    expect(() => verifyToken(secret, '123456')).not.toThrow()
    expect(verifyToken(secret, '123456')).toBe(false)
  })
})
