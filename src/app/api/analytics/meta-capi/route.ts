import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Meta Conversions API (CAPI) — Server-Side Pixel.
 *
 * Schickt Conversion-Events von unserem Server an die Meta Graph API.
 * Vorteile gegenüber Browser-Pixel:
 *   - Funktioniert trotz Adblocker / iOS-Tracking-Prevention
 *   - Genauere Attribution (kein Drop durch Cookie-Blocking)
 *   - PII wird vor Versand gehasht (SHA-256) → DSGVO-konform
 *
 * Aktiviert wenn:
 *   META_CAPI_ACCESS_TOKEN  (server-only)
 *   NEXT_PUBLIC_META_PIXEL_ID
 * gesetzt sind. Sonst Stub-Response für lokale Entwicklung.
 *
 * Aufruf: POST { event_name, event_id?, user_data: { email?, phone?, ... }, custom_data?, action_source? }
 */

const META_API_VERSION = 'v21.0'

/**
 * Track 20: dieser Endpunkt war ein offener Briefkasten in das Werbekonto.
 *
 * Er verlangt keine Anmeldung (er muss auch keine — er wird vom Browser
 * jeder Besucherin aufgerufen), nahm aber JEDEN `event_name` und JEDES
 * `custom_data` entgegen und schickte beides mit dem Token der Plattform an
 * Meta. Ein Skript konnte damit beliebig viele erfundene „Purchase"-Events
 * mit frei gewaehltem `value` und `currency` in das Pixel schreiben.
 *
 * Der Schaden ist kein Datenabfluss, sondern ein kaufmaennischer: Metas
 * Gebotsalgorithmus optimiert auf genau diese Signale. Wer sie faelscht,
 * steuert, an wen ChairMatch seine Werbung ausspielt und mit welchem
 * angeblichen Umsatz jede Kampagne bewertet wird — der Bericht im
 * Werbemanager wird dabei zu einer Zahl, die niemand mehr pruefen kann.
 *
 * Drei Riegel: eine Positivliste der Ereignisse, die die Anwendung
 * tatsaechlich meldet, eine Obergrenze fuer `custom_data`, und ein
 * Rate-Limit pro IP. Was nicht auf der Liste steht, geht nicht raus.
 */
const ALLOWED_EVENTS = new Set([
  'PageView',
  'ViewContent',
  'Search',
  'Lead',
  'CompleteRegistration',
  'Contact',
  'Schedule',
  'InitiateCheckout',
  'AddToCart',
  'Purchase',
  'Subscribe',
  'StartTrial',
])

/** Felder, die Meta fuer diese Events auswertet — mehr braucht die App nicht. */
const ALLOWED_CUSTOM_DATA = new Set([
  'value',
  'currency',
  'content_name',
  'content_category',
  'content_ids',
  'content_type',
  'contents',
  'num_items',
  'search_string',
  'order_id',
  'predicted_ltv',
  'status',
])

/** Ein Browser meldet ein paar Ereignisse pro Seite, kein Skript Tausende. */
const RATE = { scope: 'meta-capi', max: 60, windowMs: 60_000 }

/**
 * `custom_data` auf die bekannten Felder eindampfen.
 *
 * Zusaetzlich eine Laengenbegrenzung auf Zeichenketten: ohne sie liesse sich
 * der Endpunkt als Ablage fuer beliebige Nutzlasten im Werbekonto
 * missbrauchen.
 */
function pickCustomData(input: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (!input || typeof input !== 'object') return out
  for (const [key, value] of Object.entries(input)) {
    if (!ALLOWED_CUSTOM_DATA.has(key)) continue
    if (typeof value === 'string') {
      out[key] = value.slice(0, 200)
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value
    } else if (Array.isArray(value)) {
      out[key] = value
        .slice(0, 20)
        .map(v => (typeof v === 'string' ? v.slice(0, 200) : v))
    }
  }
  return out
}

function sha256(s: string): string {
  return createHash('sha256').update(s.trim().toLowerCase()).digest('hex')
}

type CapiUserData = {
  email?: string
  phone?: string
  external_id?: string
  fbp?: string
  fbc?: string
}

type CapiBody = {
  event_name: string
  event_id?: string
  event_time?: number
  action_source?: 'website' | 'app' | 'email' | 'phone_call' | 'chat' | 'system_generated' | 'other'
  user_data?: CapiUserData
  custom_data?: Record<string, unknown>
  event_source_url?: string
}

export async function POST(req: NextRequest) {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE // optional, nur Test-Events

  const limit = checkRateLimit(clientIp(req), RATE)
  if (limit.limited) {
    return rateLimitResponse(limit, 'Zu viele Ereignisse. Bitte spaeter erneut.')
  }

  let body: CapiBody
  try {
    body = await req.json() as CapiBody
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  if (!body.event_name) {
    return NextResponse.json({ error: 'event_name required' }, { status: 400 })
  }
  if (!ALLOWED_EVENTS.has(body.event_name)) {
    return NextResponse.json({ error: 'unknown event_name' }, { status: 400 })
  }

  // Der Stub-Zweig stand bis Track 20 VOR dem Lesen des Bodys: sein
  // Kommentar behauptete „validiert Payload-Format", tatsaechlich hat er den
  // Body nie angesehen und auf jeden Aufruf `ok: true` geantwortet. Ohne
  // Meta-Zugangsdaten ist damit auch nichts gepruefbar gewesen. Jetzt laeuft
  // die Pruefung zuerst — der Stub sagt „angenommen, nicht verschickt", und
  // zwar nur fuer etwas, das auch wirklich verschickt werden koennte.
  if (!pixelId || pixelId.startsWith('XXXXX') || !accessToken) {
    return NextResponse.json({ ok: true, mode: 'stub', reason: 'meta_credentials_missing' })
  }

  // PII hashen — Meta verlangt SHA-256 in lowercase trim.
  const hashedUserData: Record<string, string | string[] | undefined> = {}
  if (body.user_data?.email) hashedUserData.em = [sha256(body.user_data.email)]
  if (body.user_data?.phone) hashedUserData.ph = [sha256(body.user_data.phone)]
  if (body.user_data?.external_id) hashedUserData.external_id = [sha256(body.user_data.external_id)]
  // fbp/fbc kommen aus den _fbp/_fbc-Cookies und werden NICHT gehasht
  if (body.user_data?.fbp) hashedUserData.fbp = body.user_data.fbp
  if (body.user_data?.fbc) hashedUserData.fbc = body.user_data.fbc

  // Client-IP + UA für besseres Matching mitschicken (Meta hasht serverseitig).
  const ip =
    req.headers.get('x-real-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    undefined
  const ua = req.headers.get('user-agent') || undefined
  if (ip) hashedUserData.client_ip_address = ip
  if (ua) hashedUserData.client_user_agent = ua

  const eventPayload = {
    event_name: body.event_name,
    event_time: body.event_time ?? Math.floor(Date.now() / 1000),
    event_id: body.event_id, // ermöglicht De-Duplikation mit Browser-Pixel
    action_source: body.action_source ?? 'website',
    event_source_url: body.event_source_url ?? req.headers.get('referer') ?? undefined,
    user_data: hashedUserData,
    custom_data: pickCustomData(body.custom_data),
  }

  const url = `https://graph.facebook.com/${META_API_VERSION}/${pixelId}/events?access_token=${accessToken}`
  const requestBody: Record<string, unknown> = { data: [eventPayload] }
  if (testEventCode) requestBody.test_event_code = testEventCode

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      // Metas Fehlerobjekt nennt Pixel-ID, Trace-IDs und den Grund der
      // Ablehnung. Das gehoert ins Log, nicht in eine Antwort, die jeder
      // anonyme Aufruf bekommt.
      console.error('[meta-capi] Meta lehnte das Ereignis ab:', data)
      return NextResponse.json({ error: 'meta_capi_error' }, { status: res.status })
    }
    return NextResponse.json({ ok: true, mode: 'live' })
  } catch (e) {
    console.error('[meta-capi] Meta nicht erreichbar:', e)
    return NextResponse.json({ error: 'meta_capi_fetch_failed' }, { status: 502 })
  }
}
