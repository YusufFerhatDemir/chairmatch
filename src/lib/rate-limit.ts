/**
 * Bester-Aufwand-Rate-Limit fuer Routen ohne Auth.
 *
 * Der Zaehler liegt im Speicher der Lambda-Instanz. Was das heisst — und
 * warum es trotzdem drin ist:
 *
 *   Es haelt NICHT einen verteilten Angriff auf. Vercel startet mehrere
 *   Instanzen; ein Angreifer, der Verbindungen streut, landet in
 *   verschiedenen Zaehlern. Ein echter Riegel braucht einen gemeinsamen
 *   Speicher (Upstash/Redis) oder eine DB-Tabelle — so wie es
 *   /api/auth/phone/send ueber `phone_verifications` macht, weil dort jede
 *   Anfrage Geld kostet.
 *
 *   Es haelt AUF: das naive Skript, den Formular-Doppelklick und die
 *   Schleife aus einer einzelnen Quelle. Das ist der ueberwiegende Teil
 *   dessen, was auf einem oeffentlichen Endpunkt ankommt.
 *
 * Diese Datei ist die gemeinsame Fassung dessen, was vorher nur in
 * /api/newsletter stand — als einziger von 97 Routen ueberhaupt.
 */

interface Bucket {
  hits: number[]
}

const buckets = new Map<string, Bucket>()

/** Ab so vielen Schluesseln wird beim naechsten Zugriff aufgeraeumt. */
const CLEANUP_THRESHOLD = 5000

export interface RateLimitOptions {
  /** Logischer Name des Endpunkts — trennt die Zaehler voneinander. */
  scope: string
  /** Erlaubte Anfragen je Fenster. */
  max: number
  /** Fensterbreite in Millisekunden. */
  windowMs: number
}

export interface RateLimitResult {
  limited: boolean
  /** Verbleibende Anfragen im aktuellen Fenster (0, wenn limitiert). */
  remaining: number
  /** Sekunden bis zur naechsten freien Anfrage — fuer den Retry-After-Header. */
  retryAfterSeconds: number
}

/**
 * Zaehlt eine Anfrage und sagt, ob sie ueber dem Limit liegt.
 *
 * Eine limitierte Anfrage wird NICHT mitgezaehlt. Sonst haelt ein Angreifer,
 * der stur weiterfeuert, das Fenster dauerhaft offen und sperrt damit auch
 * den legitimen Nutzer hinter derselben IP aus.
 */
export function checkRateLimit(identifier: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const key = `${opts.scope}:${identifier}`

  const bucket = buckets.get(key) ?? { hits: [] }
  const fresh = bucket.hits.filter((t) => now - t < opts.windowMs)

  if (fresh.length >= opts.max) {
    bucket.hits = fresh
    buckets.set(key, bucket)
    const oldest = fresh[0] ?? now
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((opts.windowMs - (now - oldest)) / 1000)),
    }
  }

  fresh.push(now)
  bucket.hits = fresh
  buckets.set(key, bucket)

  if (buckets.size > CLEANUP_THRESHOLD) sweep(now, opts.windowMs)

  return {
    limited: false,
    remaining: opts.max - fresh.length,
    retryAfterSeconds: 0,
  }
}

/** Abgelaufene Eintraege entfernen, damit die Map nicht unbegrenzt waechst. */
function sweep(now: number, windowMs: number): void {
  for (const [key, bucket] of buckets) {
    const fresh = bucket.hits.filter((t) => now - t < windowMs)
    if (fresh.length === 0) buckets.delete(key)
    else bucket.hits = fresh
  }
}

/**
 * Client-IP aus den Proxy-Headern.
 *
 * Hinter Vercel ist der erste Eintrag in `x-forwarded-for` die echte
 * Client-IP; die Plattform setzt den Header selbst und ueberschreibt einen
 * mitgeschickten. Ohne Proxy ist der Wert faelschbar — genau deshalb steht
 * oben, dass dieses Limit ein Riegel gegen Versehen ist, nicht gegen einen
 * entschlossenen Angreifer.
 */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) {
    const first = fwd.split(',')[0]?.trim()
    if (first) return first
  }
  return req.headers.get('x-real-ip') || 'unknown'
}

/** Standard-Antwort fuer eine limitierte Anfrage. */
export function rateLimitResponse(result: RateLimitResult, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'content-type': 'application/json',
      'retry-after': String(result.retryAfterSeconds),
    },
  })
}

/** Nur fuer Tests — setzt alle Zaehler zurueck. */
export function __resetRateLimits(): void {
  buckets.clear()
}
