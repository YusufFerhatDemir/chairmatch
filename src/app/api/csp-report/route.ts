import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * POST /api/csp-report — Sammelstelle fuer die Report-Only-CSP.
 *
 * Die durchgesetzte Policy (next.config.ts) ist nonce-frei und laesst
 * Inline-Scripts weiterhin zu; die strikte Zielpolicy mit Nonce laeuft
 * parallel im Report-Only-Modus auf dem `/provider`-Teilbaum (siehe
 * `src/lib/csp.ts` und `CSP_NONCE_CANARY_PREFIXES` in der Middleware).
 * Hier landet, was unter der Zielpolicy blockiert WUERDE — die Liste ist die
 * Arbeitsgrundlage dafuer, sie irgendwann scharf zu schalten.
 *
 * Bewusst ohne Datenbank: die Reports sind Diagnose, kein Geschaeftsdatum, und
 * eine offen erreichbare Schreib-Route auf eine Tabelle waere genau die Art
 * Endpunkt, die man sich nicht in die Angriffsflaeche legt. Ausgabe geht in
 * die Vercel-Logs.
 */
export const runtime = 'nodejs'

const RATE = { scope: 'csp-report', max: 30, windowMs: 60_000 }

/** Groesster Body, den wir ueberhaupt lesen. Reports sind wenige hundert Byte. */
const MAX_BODY_BYTES = 8_192

function str(v: unknown, max = 300): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v.slice(0, max) : undefined
}

export async function POST(request: NextRequest) {
  // Ein einziger Browser mit einer kaputten Extension kann pro Seitenaufruf
  // dutzende Reports schicken. Ohne Deckel ist das ein Log-Flood-Vektor.
  const limit = checkRateLimit(clientIp(request), RATE)
  if (limit.limited) return rateLimitResponse(limit, 'Zu viele CSP-Reports.')

  const declared = Number(request.headers.get('content-length') ?? '0')
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 413 })
  }

  const raw = await request.text().catch(() => '')
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 })

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Kein gueltiges JSON — verwerfen, aber nicht als Fehler melden. Der
    // Browser wiederholt Reports nicht, ein 4xx bringt hier niemandem etwas.
    return new NextResponse(null, { status: 204 })
  }

  // report-uri liefert `{ "csp-report": {...} }`, das neuere Reporting-API-
  // Format ein Array von `{ type, body }`. Beides hier abfangen.
  const container = parsed as { 'csp-report'?: Record<string, unknown> }
  const reports: Record<string, unknown>[] = Array.isArray(parsed)
    ? (parsed as { body?: Record<string, unknown> }[]).map((e) => e?.body ?? {})
    : [container?.['csp-report'] ?? (parsed as Record<string, unknown>)]

  for (const r of reports.slice(0, 5)) {
    const violated = str(r['violated-directive'] ?? r['effectiveDirective'], 80)
    const blocked = str(r['blocked-uri'] ?? r['blockedURL'])
    const doc = str(r['document-uri'] ?? r['documentURL'])
    // `script-sample` kann Teile des blockierten Codes enthalten — hart kuerzen,
    // damit hier keine Nutzerdaten aus einem Formular in den Logs landen.
    const sample = str(r['script-sample'] ?? r['sample'], 120)

    if (!violated) continue

    console.warn('[csp-report]', JSON.stringify({ violated, blocked, doc, sample }))
  }

  // 204: der Browser erwartet keinen Inhalt.
  return new NextResponse(null, { status: 204 })
}
