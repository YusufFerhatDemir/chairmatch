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
 *   Endpoint: https://chairmatch.de/api/newsletter/webhook
 *
 * Hinweis: Signatur-Verifikation (Svix) ist optional, hier weggelassen
 * — bei Bedarf via RESEND_WEBHOOK_SECRET nachrüsten.
 */

interface ResendEvent {
  type: string
  data: {
    email_id?: string
    to?: string[]
    [key: string]: unknown
  }
}

export async function POST(req: NextRequest) {
  let payload: ResendEvent
  try {
    payload = await req.json() as ResendEvent
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
