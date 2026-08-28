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
import {
  wrapNewsletterHtml,
  buildUnsubscribeUrl,
  buildOneClickUnsubscribeUrl,
  htmlToPlainText,
} from '@/lib/newsletter-template'

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
/**
 * Warum ein Code und nicht nur ein Text: der Aufrufer soll „laeuft schon"
 * von „ist kaputt" unterscheiden koennen, ohne eine deutsche Fehlermeldung
 * zu zerlegen. Die Route macht daraus 409 statt 200.
 */
export type SendCampaignCode = 'not_found' | 'already_running' | 'failed'

export interface SendCampaignResult {
  success: boolean
  totalRecipients: number
  totalSent: number
  totalFailed: number
  error?: string
  code?: SendCampaignCode
}

export async function sendCampaign(campaignId: string): Promise<SendCampaignResult> {
  const supabase = getSupabaseAdmin()

  // 1. Kampagne laden
  const { data: campaignData, error: campaignErr } = await supabase
    .from('newsletter_campaigns')
    .select('id, subject, preview_text, html_content, audience_filter, status')
    .eq('id', campaignId)
    .maybeSingle()

  if (campaignErr || !campaignData) {
    return { success: false, totalRecipients: 0, totalSent: 0, totalFailed: 0, error: 'Kampagne nicht gefunden', code: 'not_found' }
  }

  const campaign = campaignData as CampaignRow

  if (campaign.status === 'sending' || campaign.status === 'sent') {
    return {
      success: false,
      totalRecipients: 0,
      totalSent: 0,
      totalFailed: 0,
      error: `Kampagne ist bereits ${campaign.status}`,
      code: 'already_running',
    }
  }

  /*
   * 2. Den Versand BEANSPRUCHEN, nicht nur anmelden.
   *
   * Hier stand bis Track 20 ein Lesen, ein Pruefen und ein Schreiben in drei
   * Schritten — der Riegel darueber war damit eine Momentaufnahme. Zwei
   * gleichzeitige Klicks auf „Senden" (zwei Tabs, ein Doppelklick, ein
   * wiederholter Request nach einem Timeout) lasen beide `status = 'draft'`,
   * kamen beide durch die Pruefung und schrieben beide `sending`. Danach
   * liefen ZWEI vollstaendige Versandlaeufe: jeder Abonnent bekam dieselbe
   * Mail zweimal, `newsletter_sends` bekam zwei Zeilen je Empfaenger, und
   * `total_sent` wurde vom zweiten Lauf ueberschrieben.
   *
   * Bei einer Empfaengerliste, die ueber Resend abgerechnet wird und deren
   * Empfaenger sich beim zweiten Exemplar abmelden oder als Spam melden, ist
   * das kein Schoenheitsfehler. Deshalb dieselbe Bauform wie auf den
   * Geldstrecken (Track 16): ein bedingtes UPDATE, das den ZUSTAND
   * mitprueft, den wir gelesen haben. Wer keine Zeile zurueckbekommt, hat
   * das Rennen verloren und sendet nicht.
   */
  const { data: claimed, error: claimError } = await supabase
    .from('newsletter_campaigns')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', campaignId)
    .eq('status', campaign.status)
    .select('id')

  if (claimError) {
    console.error('[Newsletter] claim failed:', claimError)
    return {
      success: false,
      totalRecipients: 0,
      totalSent: 0,
      totalFailed: 0,
      error: 'Kampagne konnte nicht gestartet werden',
      code: 'failed',
    }
  }
  if (!claimed || claimed.length === 0) {
    return {
      success: false,
      totalRecipients: 0,
      totalSent: 0,
      totalFailed: 0,
      error: 'Kampagne wird bereits versendet',
      code: 'already_running',
    }
  }

  // 3. Empfänger holen
  const audience = (campaign.audience_filter || {}) as AudienceFilter
  const { data: subscribersRaw, error: subsErr } = await buildAudienceQuery(audience)

  if (subsErr) {
    await supabase
      .from('newsletter_campaigns')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('id', campaignId)
    // Die rohe PostgREST-Meldung nennt Tabelle, Spalte und Policy — sie
    // gehoert ins Log, nicht in die Antwort (Track 18).
    console.error('[Newsletter] audience query failed:', subsErr)
    return {
      success: false,
      totalRecipients: 0,
      totalSent: 0,
      totalFailed: 0,
      error: 'Empfaengerliste konnte nicht geladen werden',
      code: 'failed',
    }
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
    console.error('[Newsletter] send rows insert failed:', insertErr)
    return {
      success: false,
      totalRecipients: subscribers.length,
      totalSent: 0,
      totalFailed: 0,
      error: 'Versand konnte nicht vorbereitet werden',
      code: 'failed',
    }
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
      // Der sichtbare Link fuehrt auf die Bestaetigungsseite, der Header auf
      // den POST-Endpunkt: nur der eine darf abmelden, und nur der andere
      // wird von Linkscannern im Postfach aufgerufen.
      const oneClickUrl = buildOneClickUnsubscribeUrl(s.unsubscribe_token)
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
          'List-Unsubscribe': `<${oneClickUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }
    })

    if (!resend) {
      // Dry-Run-Modus: simulieren
      console.log(`[Newsletter] DRY-RUN: would send ${emails.length} emails (RESEND_API_KEY not set)`)
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
        console.error('[Newsletter] Batch error:', errMsg)
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
      console.error('[Newsletter] Batch exception:', errMsg)
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
    console.log(`[Newsletter] DRY-RUN: would send test mail to ${testEmail}`)
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
