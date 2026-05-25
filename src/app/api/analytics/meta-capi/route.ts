import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

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

  if (!pixelId || pixelId.startsWith('XXXXX') || !accessToken) {
    // Stub-Mode: validiert Payload-Format, aber sendet nichts an Meta.
    // Hilfreich um die Integration zu testen, bevor Account live ist.
    return NextResponse.json({ ok: true, mode: 'stub', reason: 'meta_credentials_missing' })
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
    custom_data: body.custom_data ?? {},
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
      return NextResponse.json({ error: 'meta_capi_error', detail: data }, { status: res.status })
    }
    return NextResponse.json({ ok: true, mode: 'live', meta: data })
  } catch (e) {
    return NextResponse.json(
      { error: 'meta_capi_fetch_failed', message: e instanceof Error ? e.message : 'unknown' },
      { status: 502 }
    )
  }
}
