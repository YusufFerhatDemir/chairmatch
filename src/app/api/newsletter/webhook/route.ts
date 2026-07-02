import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/**
 * Resend Webhook handler.
 *
 * Erwartete Events:
 *   email.sent, email.delivered, email.opened, email.clicked,
 *   email.bounced, email.complained
 *
 * Konfiguration: in Resend-Dashboard -> Webhooks
 *   Endpoint: https://www.chairmatch.de/api/newsletter/webhook
 *
 * Signatur-Verifikation (Svix): aktiv sobald RESEND_WEBHOOK_SECRET
 * gesetzt ist (Wert "whsec_..." aus dem Resend-Dashboard). Ohne Secret
 * werden Events weiterhin unverifiziert akzeptiert (Übergangsmodus).
 */

interface ResendEvent {
  type: string
  data: {
    email_id?: string
    to?: string[]
    [key: string]: unknown
  }
}

/** Svix-Signatur prüfen: HMAC-SHA256 über "id.timestamp.body". */
function verifySvixSignature(req: NextRequest, rawBody: string, secret: string): boolean {
  const id = req.headers.get('svix-id')
  const timestamp = req.headers.get('svix-timestamp')
  const sigHeader = req.headers.get('svix-signature')
  if (!id || !timestamp || !sigHeader) return false

  // Replay-Schutz: Timestamp max. 5 Minuten alt
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()

  // Header-Format: "v1,<base64> v1,<base64> ..."
  return sigHeader.split(' ').some((part) => {
    const [, sig] = part.split(',')
    if (!sig) return false
    try {
      const given = Buffer.from(sig, 'base64')
      return given.length === expected.length && timingSafeEqual(given, expected)
    } catch {
      return false
    }
  })
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET
  if (webhookSecret && !verifySvixSignature(req, rawBody, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: ResendEvent
  try {
    payload = JSON.parse(rawBody) as ResendEvent
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const emailId = payload?.data?.email_id
  if (!emailId) {
    return NextResponse.json({ ok: true, note: 'no email_id' })
  }

  const sb = getSupabaseAdmin()
  const now = new Date().toISOString()

  const eventType = String(payload.type || '')
  const updates: Record<string, unknown> = {}
  const campaignField: 'total_opened' | 'total_clicked' | 'total_bounced' | null =
    eventType === 'email.opened' ? 'total_opened'
      : eventType === 'email.clicked' ? 'total_clicked'
      : eventType === 'email.bounced' || eventType === 'email.complained' ? 'total_bounced'
      : null

  switch (eventType) {
    case 'email.delivered':
      updates.status = 'delivered'
      break
    case 'email.opened':
      updates.status = 'opened'
      updates.opened_at = now
      break
    case 'email.clicked':
      updates.status = 'clicked'
      updates.clicked_at = now
      break
    case 'email.bounced':
      updates.status = 'bounced'
      updates.error_message = 'Bounced'
      break
    case 'email.complained':
      updates.status = 'complained'
      updates.error_message = 'Complaint'
      break
    default:
      return NextResponse.json({ ok: true, ignored: eventType })
  }

  const { data: sendRow } = await sb
    .from('newsletter_sends')
    .update(updates)
    .eq('resend_email_id', emailId)
    .select('campaign_id, subscriber_id')
    .maybeSingle()

  if (sendRow) {
    // Kampagnen-Zähler
    if (campaignField && sendRow.campaign_id) {
      // Atomic increment via RPC nicht vorhanden — wir holen und schreiben zurück.
      const { data: c } = await sb
        .from('newsletter_campaigns')
        .select(campaignField)
        .eq('id', sendRow.campaign_id)
        .maybeSingle()
      const current = ((c as Record<string, number | null> | null)?.[campaignField]) ?? 0
      await sb
        .from('newsletter_campaigns')
        .update({ [campaignField]: current + 1 })
        .eq('id', sendRow.campaign_id)
    }

    // Bei Bounce/Complaint: Subscriber auf 'bounced' setzen
    if ((eventType === 'email.bounced' || eventType === 'email.complained') && sendRow.subscriber_id) {
      await sb
        .from('newsletter_subscribers')
        .update({ status: 'bounced' })
        .eq('id', sendRow.subscriber_id)
    }
  }

  return NextResponse.json({ ok: true })
}
