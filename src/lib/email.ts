import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Resend client — gracefully falls back to console.log if API key is not set
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY
// Absender-Adresse: per Env-Var überschreibbar (z. B. in Preview-Umgebungen).
// Fallback auf die verifizierte Prod-Adresse.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'ChairMatch <noreply@chairmatch.de>'

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingEmailDetails {
  bookingId: string
  salonName: string
  serviceName: string
  date: string       // e.g. "2026-03-20"
  startTime: string  // e.g. "14:00"
  endTime: string    // e.g. "14:45"
  priceCents: number
  customerName?: string
  staffName?: string
  notes?: string
}

export interface ComplianceAlertDetails {
  documentType: string
  status: 'expired' | 'expiring_soon' | 'rejected' | 'approved' | 'action_required'
  salonName?: string
  expiresAt?: string
  message?: string
}

export interface ProviderNotificationDetails {
  salonName?: string
  customerName?: string
  bookingId?: string
  message?: string
  [key: string]: unknown
}

export type EmailType =
  | 'booking_confirmation'
  | 'booking_reminder'
  | 'welcome'
  | 'password_reset'
  | 'provider_notification'
  | 'compliance_alert'

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function formatDate(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a">
<tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#242424;border-radius:12px;border:1px solid #333">
  <!-- Header -->
  <tr><td style="padding:32px 32px 16px;text-align:center;border-bottom:1px solid #333">
    <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;letter-spacing:3px;color:#D4AF37">CHAIR<span style="color:#E8D06A">MATCH</span></h1>
    <p style="margin:4px 0 0;font-size:10px;letter-spacing:3px;color:#999;text-transform:uppercase">Deutschland</p>
  </td></tr>
  <!-- Content -->
  <tr><td style="padding:32px;color:#e0e0e0;font-size:15px;line-height:1.6">
    ${content}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:24px 32px;text-align:center;border-top:1px solid #333;font-size:12px;color:#777">
    <p style="margin:0">&copy; ${new Date().getFullYear()} ChairMatch Deutschland</p>
    <p style="margin:4px 0 0"><a href="https://chairmatch.de" style="color:#D4AF37;text-decoration:none">chairmatch.de</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function goldButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto">
<tr><td style="background:linear-gradient(135deg,#D4AF37,#E8D06A);border-radius:8px;padding:14px 32px;text-align:center">
  <a href="${url}" style="color:#1a1a1a;font-weight:700;font-size:15px;text-decoration:none;display:inline-block">${text}</a>
</td></tr></table>`
}

async function send(to: string, subject: string, html: string): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    logger.warn('email.dev_fallback', { to, subject, htmlBytes: html.length })
    return { success: true, id: `local_${Date.now()}` }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject,
      html,
    })

    if (error) {
      logger.error('email.resend_failed', new Error(error.message), { to, subject })
      return { success: false, error: error.message }
    }
    logger.info('email.sent', { to, subject, id: data?.id })
    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    logger.error('email.exception', err, { to, subject })
    return { success: false, error: message }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Send a booking confirmation email to the customer.
 */
export async function sendBookingConfirmation(to: string, details: BookingEmailDetails) {
  const subject = `Buchungsbestätigung — ${details.salonName}`
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Buchung bestätigt</h2>
    <p>Hallo${details.customerName ? ` ${esc(details.customerName)}` : ''},</p>
    <p>deine Buchung wurde erfolgreich bestätigt. Hier die Details:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;background:#1a1a1a;border-radius:8px;border:1px solid #444">
      <tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Salon</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;font-weight:600;border-bottom:1px solid #333">${esc(details.salonName)}</td></tr>
      <tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Service</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${esc(details.serviceName)}</td></tr>
      <tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Datum</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${formatDate(details.date)}</td></tr>
      <tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Uhrzeit</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${details.startTime} – ${details.endTime}</td></tr>
      ${details.staffName ? `<tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Mitarbeiter</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${esc(details.staffName)}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;color:#999;font-size:13px">Preis</td>
          <td style="padding:12px 16px;color:#D4AF37;font-size:14px;font-weight:700">${formatPrice(details.priceCents)}</td></tr>
    </table>
    <p style="font-size:13px;color:#999">Buchungs-ID: ${details.bookingId}</p>
    ${goldButton('Buchung ansehen', `https://chairmatch.de/booking/${details.bookingId}`)}
    <p style="font-size:13px;color:#777;margin-top:24px">Falls du Fragen hast, kontaktiere uns unter <a href="mailto:support@chairmatch.de" style="color:#D4AF37">support@chairmatch.de</a>.</p>
  `)

  return send(to, subject, html)
}

/**
 * Send a booking reminder email (typically 24h before appointment).
 */
export async function sendBookingReminder(to: string, details: BookingEmailDetails) {
  const subject = `Erinnerung: Termin morgen bei ${details.salonName}`
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Terminerinnerung</h2>
    <p>Hallo${details.customerName ? ` ${esc(details.customerName)}` : ''},</p>
    <p>dein Termin ist morgen. Vergiss nicht:</p>
    <div style="background:#1a1a1a;border-radius:8px;border-left:4px solid #D4AF37;padding:20px;margin:20px 0">
      <p style="margin:0;color:#D4AF37;font-weight:700;font-size:16px">${esc(details.serviceName)}</p>
      <p style="margin:6px 0 0;color:#e0e0e0">${esc(details.salonName)}</p>
      <p style="margin:6px 0 0;color:#e0e0e0">${formatDate(details.date)} um ${details.startTime} Uhr</p>
      ${details.staffName ? `<p style="margin:6px 0 0;color:#999">Mitarbeiter: ${esc(details.staffName)}</p>` : ''}
    </div>
    ${goldButton('Buchung ansehen', `https://chairmatch.de/booking/${details.bookingId}`)}
    <p style="font-size:13px;color:#777;margin-top:24px">Musst du umbuchen? Du kannst den Termin bis 24h vorher kostenlos stornieren.</p>
  `)

  return send(to, subject, html)
}

/**
 * Send a welcome email to a newly registered user.
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const subject = 'Willkommen bei ChairMatch!'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Willkommen, ${esc(name)}!</h2>
    <p>Schön, dass du dabei bist. ChairMatch verbindet dich mit den besten Salons und Beauty-Experten in ganz Deutschland.</p>
    <div style="margin:24px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="padding:12px;text-align:center;background:#1a1a1a;border-radius:8px;margin-bottom:8px">
            <p style="margin:0;color:#D4AF37;font-size:24px">1</p>
            <p style="margin:4px 0 0;color:#e0e0e0;font-size:13px">Salon entdecken</p>
          </td>
          <td style="width:12px"></td>
          <td style="padding:12px;text-align:center;background:#1a1a1a;border-radius:8px">
            <p style="margin:0;color:#D4AF37;font-size:24px">2</p>
            <p style="margin:4px 0 0;color:#e0e0e0;font-size:13px">Termin buchen</p>
          </td>
          <td style="width:12px"></td>
          <td style="padding:12px;text-align:center;background:#1a1a1a;border-radius:8px">
            <p style="margin:0;color:#D4AF37;font-size:24px">3</p>
            <p style="margin:4px 0 0;color:#e0e0e0;font-size:13px">Beauty geniessen</p>
          </td>
        </tr>
      </table>
    </div>
    ${goldButton('Jetzt entdecken', 'https://chairmatch.de')}
    <p style="font-size:13px;color:#777;margin-top:24px">Nutze den Code <strong style="color:#D4AF37">WELCOME10</strong> für 10% auf deine erste Buchung!</p>
  `)

  return send(to, subject, html)
}

/**
 * Day-3 Engagement-Mail: Tipps für neue Kunden, drei Tage nach Registrierung.
 * Wird vom Cron-Job ausgelöst — durchsucht profiles WHERE created_at zwischen
 * 3 und 4 Tagen alt UND day3_email_sent_at IS NULL.
 */
export async function sendDay3OnboardingEmail(to: string, name: string) {
  const subject = 'So holst du das Beste aus ChairMatch raus'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Hi ${esc(name)} 👋</h2>
    <p>Du bist jetzt drei Tage dabei. Hier sind die Top-3-Tricks, die unsere aktivsten Kunden nutzen:</p>
    <div style="margin:20px 0;padding:14px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37">
      <p style="margin:0;color:#D4AF37;font-weight:700">🎯 Tipp 1: Favoriten markieren</p>
      <p style="margin:6px 0 0;color:#aaa;font-size:13px">Drück das Herz bei jedem Salon den du magst — bei Last-Minute-Slots kriegst du Push-Benachrichtigung.</p>
    </div>
    <div style="margin:14px 0;padding:14px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37">
      <p style="margin:0;color:#D4AF37;font-weight:700">⭐ Tipp 2: Bewertungen lesen</p>
      <p style="margin:6px 0 0;color:#aaa;font-size:13px">Echte Kunden-Feedbacks unter jedem Salon. Niemand soll dich enttäuschen.</p>
    </div>
    <div style="margin:14px 0;padding:14px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37">
      <p style="margin:0;color:#D4AF37;font-weight:700">💎 Tipp 3: Loyalty-Punkte sammeln</p>
      <p style="margin:6px 0 0;color:#aaa;font-size:13px">Bei jeder Buchung kriegst du Punkte. 10 Punkte = 1 € Rabatt bei der nächsten Buchung.</p>
    </div>
    ${goldButton('Jetzt entdecken', 'https://chairmatch.de/explore')}
    <p style="font-size:13px;color:#777;margin-top:24px">Fragen? Antworte einfach auf diese Mail.</p>
  `)
  return send(to, subject, html)
}

/**
 * Re-Engagement-Mail nach 14 Tagen Inaktivität.
 * Bringt Kunden zurück mit speziellem Rabattcode.
 */
export async function sendReEngagementEmail(to: string, name: string) {
  const subject = 'Wir vermissen dich — 15 % auf deine nächste Buchung'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Wir vermissen dich, ${esc(name)}</h2>
    <p>Du warst eine Weile nicht da — und es gibt frische Salons in deiner Nähe, die du noch nicht entdeckt hast.</p>
    <div style="margin:24px 0;padding:24px;background:linear-gradient(135deg,rgba(212,175,55,0.15),rgba(176,144,96,0.05));border-radius:12px;border:1px solid rgba(212,175,55,0.3);text-align:center">
      <p style="margin:0 0 6px;color:#aaa;font-size:12px;letter-spacing:2px">EXKLUSIV FÜR DICH</p>
      <p style="margin:0 0 8px;color:#D4AF37;font-size:32px;font-weight:bold;letter-spacing:3px;font-family:monospace">COMEBACK15</p>
      <p style="margin:0;color:#fff;font-size:14px">15 % auf deine nächste Buchung — gültig 7 Tage.</p>
    </div>
    ${goldButton('Termin suchen', 'https://chairmatch.de/explore')}
    <p style="font-size:13px;color:#777;margin-top:24px">Keine Lust mehr? <a href="https://chairmatch.de/unsubscribe" style="color:#888">Abmelden</a></p>
  `)
  return send(to, subject, html)
}

/**
 * Provider-spezifische Willkommens-Mail mit Initial-Passwort.
 *
 * Wird beim Provider-Onboarding aufgerufen, damit der frische Provider sich
 * sofort einloggen kann. Initial-Passwort sollte vom User beim ersten Login
 * geändert werden (TODO: Force-Change-Screen).
 */
export async function sendProviderWelcomeEmail(to: string, name: string, password: string) {
  const subject = 'Willkommen bei ChairMatch — dein Provider-Zugang'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Willkommen, ${esc(name)}!</h2>
    <p>Dein Provider-Account ist angelegt. Logge dich mit folgenden Daten ein:</p>
    <div style="margin:20px 0;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37">
      <p style="margin:0 0 8px;color:#aaa;font-size:12px">EMAIL</p>
      <p style="margin:0 0 16px;color:#fff;font-size:14px;font-family:monospace">${esc(to)}</p>
      <p style="margin:0 0 8px;color:#aaa;font-size:12px">INITIAL-PASSWORT</p>
      <p style="margin:0;color:#D4AF37;font-size:16px;font-family:monospace;font-weight:bold">${esc(password)}</p>
    </div>
    <p style="font-size:13px;color:#aaa">Bitte ändere das Passwort sofort nach dem ersten Login in deinem Account.</p>
    ${goldButton('Jetzt einloggen', 'https://chairmatch.de/auth')}
    <p style="font-size:13px;color:#777;margin-top:24px">Hilfe? Antworte einfach auf diese E-Mail.</p>
  `)
  return send(to, subject, html)
}

/**
 * Send a password reset email with a secure link.
 */
export async function sendPasswordReset(to: string, resetUrl: string) {
  const subject = 'Passwort zurücksetzen — ChairMatch'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Passwort zurücksetzen</h2>
    <p>Du hast angefordert, dein Passwort zurückzusetzen. Klicke auf den Button unten, um ein neues Passwort festzulegen:</p>
    ${goldButton('Neues Passwort festlegen', resetUrl)}
    <p style="font-size:13px;color:#777;margin-top:24px">Dieser Link ist <strong>1 Stunde</strong> gültig. Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>
    <p style="font-size:12px;color:#555;margin-top:16px;word-break:break-all">Link: ${resetUrl}</p>
  `)

  return send(to, subject, html)
}

/**
 * Send a notification to a provider (new booking, cancellation, review, etc.).
 */
export async function sendProviderNotification(
  to: string,
  type: 'new_booking' | 'cancellation' | 'review' | 'payout' | 'general',
  details: ProviderNotificationDetails,
) {
  const titles: Record<string, string> = {
    new_booking: 'Neue Buchung eingegangen',
    cancellation: 'Buchung storniert',
    review: 'Neue Bewertung erhalten',
    payout: 'Auszahlung verarbeitet',
    general: 'Benachrichtigung',
  }

  const icons: Record<string, string> = {
    new_booking: '&#x1F4C5;',
    cancellation: '&#x274C;',
    review: '&#x2B50;',
    payout: '&#x1F4B0;',
    general: '&#x1F514;',
  }

  const title = titles[type] || titles.general
  const icon = icons[type] || icons.general
  const subject = `${title} — ChairMatch`

  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">${icon} ${title}</h2>
    ${details.salonName ? `<p style="color:#999;font-size:13px;margin:0 0 12px">Salon: <strong style="color:#e0e0e0">${esc(details.salonName)}</strong></p>` : ''}
    ${details.customerName ? `<p>Kunde: <strong>${esc(details.customerName)}</strong></p>` : ''}
    ${details.message ? `<div style="background:#1a1a1a;border-radius:8px;border-left:4px solid #D4AF37;padding:16px;margin:16px 0">
      <p style="margin:0;color:#e0e0e0">${esc(details.message)}</p>
    </div>` : ''}
    ${details.bookingId ? goldButton('Details ansehen', `https://chairmatch.de/provider#booking-${details.bookingId}`) : goldButton('Dashboard öffnen', 'https://chairmatch.de/provider')}
    <p style="font-size:13px;color:#777;margin-top:24px">Du erhältst diese E-Mail, weil du als Anbieter bei ChairMatch registriert bist.</p>
  `)

  return send(to, subject, html)
}

/**
 * Send a compliance alert to a provider about document status changes.
 */
export async function sendComplianceAlert(
  to: string,
  documentType: string,
  status: ComplianceAlertDetails['status'],
) {
  const statusLabels: Record<string, { label: string; color: string; description: string }> = {
    expired: {
      label: 'Abgelaufen',
      color: '#ef4444',
      description: 'Dein Dokument ist abgelaufen. Bitte lade eine aktuelle Version hoch, um deinen Salon aktiv zu halten.',
    },
    expiring_soon: {
      label: 'Läuft bald ab',
      color: '#f59e0b',
      description: 'Dein Dokument läuft in Kürze ab. Bitte erneuere es rechtzeitig.',
    },
    rejected: {
      label: 'Abgelehnt',
      color: '#ef4444',
      description: 'Dein Dokument wurde abgelehnt. Bitte überprüfe die Anforderungen und lade es erneut hoch.',
    },
    approved: {
      label: 'Genehmigt',
      color: '#22c55e',
      description: 'Dein Dokument wurde erfolgreich geprüft und genehmigt.',
    },
    action_required: {
      label: 'Handlung erforderlich',
      color: '#f59e0b',
      description: 'Für dein Dokument ist eine Aktion erforderlich. Bitte überprüfe die Details in deinem Dashboard.',
    },
  }

  const info = statusLabels[status] || statusLabels.action_required
  const subject = `Compliance: ${documentType} — ${info.label}`

  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Compliance-Update</h2>
    <div style="background:#1a1a1a;border-radius:8px;border:1px solid #444;padding:20px;margin:16px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
        <tr>
          <td style="color:#999;font-size:13px;padding-bottom:8px">Dokument</td>
          <td style="color:#e0e0e0;font-size:14px;font-weight:600;padding-bottom:8px;text-align:right">${documentType}</td>
        </tr>
        <tr>
          <td style="color:#999;font-size:13px">Status</td>
          <td style="text-align:right">
            <span style="background:${info.color}22;color:${info.color};padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600">${info.label}</span>
          </td>
        </tr>
      </table>
    </div>
    <p>${info.description}</p>
    ${goldButton('Compliance-Dashboard öffnen', 'https://chairmatch.de/owner/compliance')}
    <p style="font-size:13px;color:#777;margin-top:24px">Die Einhaltung der Vorschriften ist wichtig, um deinen Salon auf ChairMatch aktiv zu halten.</p>
  `)

  return send(to, subject, html)
}

// ---------------------------------------------------------------------------
// Affiliate post-booking recommendations
// ---------------------------------------------------------------------------

/**
 * Map einer Service-Kategorie auf passende Affiliate-Produktkategorien.
 * Reihenfolge entspricht der Priorität bei der Auswahl.
 */
const SERVICE_TO_AFFILIATE_CATEGORIES: Record<string, string[]> = {
  friseur:   ['Haarpflege', 'Tools'],
  barber:    ['Haarpflege', 'Tools'],
  kosmetik:  ['Gesichtspflege', 'Make-up'],
  aesthetik: ['Gesichtspflege'],
  nail:      ['Tools', 'Make-up'],
  massage:   ['Gesichtspflege'],
  lash:      ['Make-up'],
  arzt:      ['Gesichtspflege'],
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chairmatch.de'

interface AffiliateProductRow {
  id: string
  product_name: string
  product_url: string
  image_url: string | null
  price_cents: number | null
  category: string | null
  partner: string
}

function affiliateProductBlock(product: AffiliateProductRow, trackingUrl: string): string {
  const price = product.price_cents != null ? formatPrice(product.price_cents) : ''
  const image = product.image_url
    ? `<img src="${esc(product.image_url)}" alt="${esc(product.product_name)}" width="120" height="120" style="display:block;width:120px;height:120px;object-fit:cover;border-radius:8px;border:1px solid #333" />`
    : `<div style="width:120px;height:120px;background:#2a2a2a;border-radius:8px;border:1px solid #333;display:flex;align-items:center;justify-content:center;color:#777">🛍️</div>`

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0;background:#1a1a1a;border-radius:10px;border:1px solid #333">
      <tr>
        <td style="padding:14px;width:136px;vertical-align:top">${image}</td>
        <td style="padding:14px 14px 14px 0;vertical-align:top">
          <p style="margin:0 0 4px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#D4AF37">${esc(product.partner)}</p>
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#e0e0e0;line-height:1.3">${esc(product.product_name)}</p>
          ${price ? `<p style="margin:0 0 10px;font-size:14px;font-weight:700;color:#D4AF37">${price}</p>` : ''}
          <a href="${trackingUrl}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8D06A);color:#1a1a1a;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">Jetzt ansehen →</a>
        </td>
      </tr>
    </table>
  `
}

function categoryLabel(slug: string): string {
  const map: Record<string, string> = {
    friseur: 'Friseur-Behandlung',
    barber: 'Barber-Behandlung',
    kosmetik: 'Kosmetik-Behandlung',
    aesthetik: 'Ästhetik-Behandlung',
    nail: 'Nagel-Behandlung',
    massage: 'Massage',
    lash: 'Wimpern-Behandlung',
    arzt: 'medizinische Behandlung',
  }
  return map[slug.toLowerCase()] || 'Behandlung'
}

/**
 * Schicke nach einer abgeschlossenen Buchung eine E-Mail mit
 * 3–5 passenden Affiliate-Produkten zur Service-Kategorie.
 *
 * @param userId    Profil-ID des Kunden (für Empfänger-Lookup)
 * @param bookingId Buchungs-ID (für Email-Subject + Logging)
 * @param category  Service-Kategorie-Slug (z. B. 'friseur', 'kosmetik')
 */
export async function sendPostBookingAffiliateRecommendations(
  userId: string,
  bookingId: string,
  category: string,
) {
  const supabase = getSupabaseAdmin()

  // Empfänger holen
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, first_name')
    .eq('id', userId)
    .maybeSingle()

  const to = profile?.email
  if (!to) {
    logger.warn('email.affiliate_recs.no_email', { userId })
    return { success: false, error: 'Kein E-Mail-Empfänger' }
  }

  // passende Affiliate-Kategorien ermitteln
  const slug = (category || '').toLowerCase()
  const affiliateCategories = SERVICE_TO_AFFILIATE_CATEGORIES[slug] || ['Haarpflege', 'Gesichtspflege']

  // 3–5 Produkte aus den passenden Kategorien holen
  const { data: products } = await supabase
    .from('affiliate_products')
    .select('id, product_name, product_url, image_url, price_cents, category, partner')
    .in('category', affiliateCategories)
    .eq('is_active', true)
    .order('commission_rate', { ascending: false })
    .limit(5)

  const productList: AffiliateProductRow[] = (products ?? []) as AffiliateProductRow[]

  if (productList.length < 3) {
    // Fallback: irgendwelche aktiven Produkte
    const { data: fallback } = await supabase
      .from('affiliate_products')
      .select('id, product_name, product_url, image_url, price_cents, category, partner')
      .eq('is_active', true)
      .order('commission_rate', { ascending: false })
      .limit(5 - productList.length)
    for (const p of (fallback ?? []) as AffiliateProductRow[]) {
      if (!productList.find(x => x.id === p.id)) productList.push(p)
    }
  }

  if (productList.length === 0) {
    logger.info('email.affiliate_recs.no_products', {})
    return { success: false, error: 'Keine Affiliate-Produkte verfügbar' }
  }

  const serviceLabel = categoryLabel(slug)
  const subject = `Mach das Beste aus deiner ${serviceLabel}`
  const greetingName = profile?.first_name || profile?.full_name || ''

  const productBlocks = productList
    .map(p => {
      const trackingUrl = `${APP_URL}/api/affiliate/track/${p.id}?source=email_post_booking_${encodeURIComponent(bookingId)}`
      return affiliateProductBlock(p, trackingUrl)
    })
    .join('')

  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:20px;font-family:Georgia,'Times New Roman',serif">Pflegeset für deine neue ${esc(serviceLabel)}</h2>
    <p>Hallo${greetingName ? ` ${esc(greetingName)}` : ''},</p>
    <p>danke, dass du über ChairMatch gebucht hast! Damit das Ergebnis deiner ${esc(serviceLabel)} möglichst lange schön bleibt, haben wir ein paar Pflege-Empfehlungen für dich kuratiert:</p>

    <div style="margin:20px 0">
      ${productBlocks}
    </div>

    ${goldButton('Alle Empfehlungen ansehen', `${APP_URL}/empfehlungen`)}

    <p style="font-size:12px;color:#777;margin-top:24px;line-height:1.5">
      Diese E-Mail enthält Affiliate-Links. Beim Kauf über einen dieser Links erhält ChairMatch
      eine kleine Provision — dich kostet das nichts extra.
    </p>
    <p style="font-size:12px;color:#555;margin-top:6px">Buchungs-ID: ${esc(bookingId)}</p>
  `)

  return send(to, subject, html)
}
