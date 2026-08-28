/**
 * Dieselbe Pseudonymisierung wie in @/lib/ip-hash — nur ohne `node:crypto`.
 *
 * `src/middleware.ts` importiert `auth` aus `@/modules/auth/auth.config`. Die
 * Middleware laeuft auf der Edge-Runtime, und webpack zieht dafuer das ganze
 * Modul in das Edge-Bundle. Ein `import { createHmac } from 'node:crypto'`
 * darin bricht den Build:
 *
 *     Module build failed: UnhandledSchemeError:
 *     Reading from "node:crypto" is not handled by plugins
 *
 * Web Crypto (`crypto.subtle`) gibt es in beiden Laufzeiten — in Node seit 18
 * global, auf der Edge ohnehin. Der Preis ist, dass die Funktion asynchron
 * ist; an der einen Aufrufstelle in auth.config.ts stoert das nicht.
 *
 * Das Ergebnis ist bitgleich mit `hashIp()`: HMAC-SHA-256 ueber dieselbe
 * Zeichenkette mit demselben Geheimnis, hex-kodiert. Ein Test in
 * src/lib/__tests__/ haelt beide Fassungen aneinander fest, damit sie nicht
 * auseinanderlaufen — sonst waere derselbe Besucher in zwei Tabellen zwei
 * verschiedene Kennwerte.
 */

function ipHashSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.CONSENT_IP_SALT || env.NEXTAUTH_SECRET || env.AUTH_SECRET || null
}

/**
 * IP-Adresse zu einem nicht umkehrbaren Kennwert machen.
 *
 * Gibt `null` zurueck, wenn keine IP vorliegt ODER kein Geheimnis gesetzt ist —
 * dieselbe Regel wie in @/lib/ip-hash: eine leere Spalte ist ehrlich, ein
 * schwacher Wert unter dem Namen `ip_hash` ist es nicht.
 */
export async function hashIpWeb(
  ip: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const clean = (ip || '').trim()
  if (!clean) return null

  const secret = ipHashSecret(env)
  if (!secret) {
    console.error(
      '[ip-hash] Weder CONSENT_IP_SALT noch NEXTAUTH_SECRET gesetzt — ip_hash bleibt leer.',
    )
    return null
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(clean))
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
