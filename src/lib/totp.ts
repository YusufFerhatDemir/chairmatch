import { createHmac, randomBytes } from 'crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encode a buffer to base32 (RFC 4648).
 */
function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decode a base32 string back to a Buffer.
 */
function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase()
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_CHARS.indexOf(cleaned[i])
    if (idx === -1) continue

    value = (value << 5) | idx
    bits += 5

    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }

  return Buffer.from(output)
}

/**
 * Generate a TOTP secret and otpauth QR URL for a given email.
 */
export function generateSecret(email: string): { secret: string; qrUrl: string } {
  const buffer = randomBytes(20)
  const secret = base32Encode(buffer)

  const qrUrl = `otpauth://totp/ChairMatch:${encodeURIComponent(email)}?secret=${secret}&issuer=ChairMatch`

  return { secret, qrUrl }
}

/**
 * Generate a TOTP code for a given secret and time counter.
 */
function generateTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret)

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    counterBuffer[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const hmac = createHmac('sha1', key)
  hmac.update(counterBuffer)
  const hash = hmac.digest()

  // Dynamic truncation (RFC 4226)
  const offset = hash[hash.length - 1] & 0x0f
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff)

  return (code % 1_000_000).toString().padStart(6, '0')
}

/**
 * Verify a 6-digit TOTP token against a secret.
 * Allows +/- 1 time step (30 seconds) for clock drift.
 */
export function verifyToken(secret: string, token: string): boolean {
  const timeStep = 30
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep)

  // Check current, previous, and next time step for clock drift tolerance
  for (let i = -1; i <= 1; i++) {
    const expected = generateTOTP(secret, currentCounter + i)
    if (expected === token) {
      return true
    }
  }

  return false
}
