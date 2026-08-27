import { createHmac } from 'node:crypto'

/**
 * Pseudonymisierung der IP-Adresse fuer das Einwilligungs-Protokoll.
 *
 * Die Spalte heisst `ip_hash`. Bis Track 12 stand dort etwas anderes:
 *
 *     const ipHash = ip ? Buffer.from(ip).toString('base64').slice(0, 32) : null
 *
 * Base64 ist kein Hash, sondern eine Kodierung — `MTk4LjUxLjEwMC4yMw==` laesst
 * sich in einer Zeile zurueckrechnen. In der Tabelle lag damit die IP jeder
 * registrierten Person im Klartext, nur unleserlich geschrieben, unter einem
 * Spaltennamen, der das Gegenteil behauptet. Fuer Art. 32 DSGVO ist das keine
 * Pseudonymisierung, und im Fall einer Offenlegung waere die Tabelle so zu
 * bewerten, als stuenden die Adressen offen darin.
 *
 * Gedeckt war das von einem gruenen Test:
 *
 *     expect(String(consent.ip_hash)).not.toContain('198.51.100.23')
 *
 * Die Base64-Zeichenkette enthaelt die IP tatsaechlich nicht als Teilkette.
 * Der Test prueft die Schreibweise, nicht die Unumkehrbarkeit.
 *
 * Jetzt: HMAC-SHA-256 mit einem serverseitigen Geheimnis. Ohne das Geheimnis
 * laesst sich der Wert auch mit dem vollen IPv4-Raum nicht durchprobieren —
 * ein blosser SHA-256 ohne Schluessel waere hier wertlos, weil vier Milliarden
 * Kandidaten in Minuten durchgerechnet sind.
 */

/**
 * Das Geheimnis fuer den HMAC.
 *
 * `CONSENT_IP_SALT` ist der vorgesehene Weg. Als Rueckfall dient das
 * Auth-Geheimnis, damit bestehende Umgebungen ohne neue Variable nicht
 * stillschweigend auf `null` fallen.
 */
function ipHashSecret(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.CONSENT_IP_SALT || env.NEXTAUTH_SECRET || env.AUTH_SECRET || null
}

/**
 * IP-Adresse zu einem nicht umkehrbaren Kennwert machen.
 *
 * Gibt `null` zurueck, wenn keine IP vorliegt ODER kein Geheimnis gesetzt ist.
 * Das ist Absicht: eine leere Spalte ist ehrlich, ein schwacher Wert unter dem
 * Namen `ip_hash` ist es nicht. Das Einwilligungs-Protokoll selbst — wer, was,
 * wann, welche Fassung — bleibt davon unberuehrt und vollstaendig.
 */
export function hashIp(
  ip: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const clean = (ip || '').trim()
  if (!clean) return null

  const secret = ipHashSecret(env)
  if (!secret) {
    console.error(
      '[ip-hash] Weder CONSENT_IP_SALT noch NEXTAUTH_SECRET gesetzt — ip_hash bleibt leer.',
    )
    return null
  }

  return createHmac('sha256', secret).update(clean).digest('hex')
}

/**
 * Die IP des Aufrufers aus den ueblichen Proxy-Headern lesen.
 *
 * Bewusst hier und nicht in `@/lib/rate-limit`: der Wert wird an zwei ganz
 * verschiedenen Stellen gebraucht, und beim Einwilligungs-Protokoll darf er
 * den Aufrufer nie unveraendert verlassen.
 */
export function requestIp(req: { headers: { get(name: string): string | null } }): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('x-real-ip') || null
}
