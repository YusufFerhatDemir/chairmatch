/**
 * Newsletter bulk-sender via Resend Batch API.
 *
 * Holt aktive Subscriber, baut newsletter_sends-Einträge,
 * sendet in Batches (max 100) und aktualisiert Status.
 *
 * Funktioniert auch ohne RESEND_API_KEY — dann wird nur
 * geloggt und der Status auf 'sent' gesetzt (Dry-Run).
 */

import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { wrapNewsletterHtml, buildUnsubscribeUrl, htmlToPlainText } from '@/lib/newsletter-template'
import { logger } from '@/lib/logger'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'ChairMatch <noreply@chairmatch.de>'
const REPLY_TO = process.env.RESEND_REPLY_TO || 'support@chairmatch.de'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

export function isResendActive(): boolean {
  return resend !== null
}

const BATCH_SIZE = 100

interface SubscriberRow {
  id: string
  email: string
  name: string | null
  unsubscribe_token: string
  tags: string[] | null
  status: string
}

interface CampaignRow {
  id: string
  subject: string
  preview_text: string | null
  html_content: string
  audience_filter: Record<string, unknown> | null
  status: string
}

interface AudienceFilter {
  tags?: string[]        // OR: irgendein passender Tag
  source?: string        // gleich-source
  exclude_tags?: string[] // ausschließen
}

/** Build Supabase-Query basierend auf audience_filter */
function buildAudienceQuery(audience: AudienceFilter | null | undefined) {
  const sb = getSupabaseAdmin()
  let q = sb
    .from('newsletter_subscribers')
    .select('id, email, name, unsubscribe_token, tags, status')
    .eq('status', 'active')

  if (audience?.source) {
    q = q.eq('source', audience.source)
  }
  if (audience?.tags && audience.tags.length > 0) {
    // tags && audience.tags ist Postgres array-overlap (&&)
    q = q.overlaps('tags', audience.tags)
  }
  return q
}

/**
 * Hauptfunktion: Sende eine Kampagne an alle passenden Subscriber.
 */
export async function sendCampaign(campaignId: string): Promise<{
  success: boolean
  totalRecipients: number
  totalSent: number
  totalFailed: number
  error?: string
}> {
  const supabase = getSupabaseAdmin()

  // 1. Kampagne laden
  const { data: campaignData, error: campaignErr } = await supabase
    .from('newsletter_campaigns')
    .select('id, subject, preview_text, html_content, audience_filter, status')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignErr || !campaignData) {
    return { success: false, totalRecipients: 0, totalSent: 0, totalFailed: 0, error: 'Kampagne nicht gefunden' }
  }

  const campaign = campaignData as CampaignRow

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return { success: false, totalRecipients: 0, totalSent: 0, totalFailed: 0, error: `Kampagne ist bereits ${campaign.status}` }
  }

  // 2. Status auf 'sending'
  await supabase
    .from('newsletter_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaignId)

  // 3. Empfänger holen
  const audience = (campaign.audience_filter || {}) as AudienceFilter
  const { data: subscribersRaw, error: subsErr } = await buildAudienceQuery(audience)

  if (subsErr) {
    await supabase
      .from('newsletter_campaigns')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', campaignId)
    return { success: false, totalRecipients: 0, totalSent: 0, totalFailed: 0, error: subsErr.message }
  }

  let subscribers = (subscribersRaw || []) as SubscriberRow[]
  if (audience?.exclude_tags && audience.exclude_tags.length > 0) {
    const excl = new Set(audience.exclude_tags)
    subscribers = subscribers.filter(s => !(s.tags || []).some(t => excl.has(t)))
  }

  if (subscribers.length === 0) {
    await supabase
      .from('newsletter_campaigns')
      .update({
        status: 'sent',
        total_recipients: 0,
        total_sent: 0,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', campaignId)
    return { success: true, totalRecipients: 0, totalSent: 0, totalFailed: 0 }
  }

  // 4. newsletter_sends-Einträge erstellen
  const sendRows = subscribers.map(s => ({
    campaign_id: campaignId,
    subscriber_id: s.id,
    status: 'queued' as const,
  }))
  const { data: sendsInserted, error: insertErr } = await supabase
    .from('newsletter_sends')
    .insert(sendRows)
    .select('id, subscriber_id')

  if (insertErr) {
    await supabase
      .from('newsletter_campaigns')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', campaignId)
    return { success: false, totalRecipients: subscribers.length, totalSent: 0, totalFailed: 0, error: insertErr.message }
  }

  const sendIdBySubscriber = new Map<string, string>()
  for (const row of (sendsInserted || []) as Array<{ id: string; subscriber_id: string }>) {
    sendIdBySubscriber.set(row.subscriber_id, row.id)
  }

  // 5. In Batches versenden
  let totalSent = 0
  let totalFailed = 0
  const now = new Date().toISOString()

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)

    const emails = batch.map(s => {
      const unsubscribeUrl = buildUnsubscribeUrl(s.unsubscribe_token)
      const html = wrapNewsletterHtml(campaign.html_content, unsubscribeUrl, {
        previewText: campaign.preview_text || undefined,
      })
      const text = htmlToPlainText(campaign.html_content) +
        `\n\n— —\nNewsletter abbestellen: ${unsubscribeUrl}`

      return {
        from: FROM_ADDRESS,
        to: [s.email],
        subject: campaign.subject,
        html,
        text,
        replyTo: REPLY_TO,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    if (!resend) {
      // Dry-Run-Modus: simulieren
      logger.warn('newsletter.dry_run', { count: emails.length })
      for (const s of batch) {
        const sendId = sendIdBySubscriber.get(s.id)
        if (!sendId) continue
        await supabase
          .from('newsletter_sends')
          .update({ status: 'sent', sent_at: now, resend_email_id: `dry_${Date.now()}_${s.id.slice(0, 8)}` })
          .eq('id', sendId)
        totalSent++
      }
      continue
    }

    try {
      const result = await resend.batch.send(emails)
      // Resend gibt entweder { data: { data: [{id}, ...] }, error: null } zurück
      // (Struktur variiert leicht; wir behandeln defensiv)
      const rawData = (result as { data?: unknown }).data
      // mögliche Strukturen: { data: [{id}, ...] } oder direkt [{id}, ...]
      let items: Array<{ id?: string }> = []
      if (rawData && typeof rawData === 'object') {
        const maybeArr = (rawData as { data?: unknown }).data ?? rawData
        if (Array.isArray(maybeArr)) {
          items = maybeArr as Array<{ id?: string }>
        }
      }
      const error = (result as { error?: unknown }).error

      if (error) {
        const errMsg = typeof error === 'object' && error && 'message' in error
          ? String((error as { message?: unknown }).message)
          : String(error)
        logger.error('newsletter.batch_failed', new Error(errMsg))
        // alle als failed markieren
        for (const s of batch) {
          const sendId = sendIdBySubscriber.get(s.id)
          if (!sendId) continue
          await supabase
            .from('newsletter_sends')
            .update({ status: 'bounced', error_message: errMsg })
            .eq('id', sendId)
          totalFailed++
        }
        continue
      }

      // Erfolg: Pro Empfänger den Resend-ID speichern
      for (let j = 0; j < batch.length; j++) {
        const s = batch[j]
        const sendId = sendIdBySubscriber.get(s.id)
        if (!sendId) continue
        const resendId = items[j]?.id || null
        await supabase
          .from('newsletter_sends')
          .update({
            status: 'sent',
            sent_at: now,
            resend_email_id: resendId,
          })
          .eq('id', sendId)

        // last_sent_at am Subscriber aktualisieren
        await supabase
          .from('newsletter_subscribers')
          .update({ last_sent_at: now })
          .eq('id', s.id)

        totalSent++
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown send error'
      logger.error('newsletter.batch_exception', err, { msg: errMsg })
      for (const s of batch) {
        const sendId = sendIdBySubscriber.get(s.id)
        if (!sendId) continue
        await supabase
          .from('newsletter_sends')
          .update({ status: 'bounced', error_message: errMsg })
          .eq('id', sendId)
        totalFailed++
      }
    }

    // Kleine Pause zwischen Batches (Rate-Limit-Schutz)
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise(r => setTimeout(r, 1100))
    }
  }

  // 6. Kampagnen-Status aktualisieren
  await supabase
    .from('newsletter_campaigns')
    .update({
      status: totalFailed > 0 && totalSent === 0 ? 'failed' : 'sent',
      total_recipients: subscribers.length,
      total_sent: totalSent,
      total_bounced: totalFailed,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', campaignId)

  return {
    success: totalSent > 0,
    totalRecipients: subscribers.length,
    totalSent,
    totalFailed,
  }
}

/**
 * Test-Versand an eine einzelne Email — kein newsletter_sends-Eintrag.
 */
export async function sendTestEmail(
  campaignId: string,
  testEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseAdmin()
  const { data: campaign, error } = await supabase
    .from('newsletter_campaigns')
    .select('subject, preview_text, html_content')
    .eq('id', campaignId)
    .maybeSingle()
  if (error || !campaign) return { success: false, error: 'Kampagne nicht gefunden' }

  const fakeToken = 'preview_' + campaignId
  const unsubscribeUrl = buildUnsubscribeUrl(fakeToken)
  const html = wrapNewsletterHtml(campaign.html_content, unsubscribeUrl, {
    previewText: campaign.preview_text || undefined,
  })
  const subject = `[TEST] ${campaign.subject}`

  if (!resend) {
    logger.warn('newsletter.test.dry_run', { testEmail })
    return { success: true }
  }
  try {
    const { error: sendErr } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: testEmail,
      subject,
      html,
      replyTo: REPLY_TO,
    })
    if (sendErr) {
      return { success: false, error: sendErr.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
