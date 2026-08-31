import { Resend } from 'resend'
import { getSupabaseAdmin } from '@/lib/supabase-server'

// ---------------------------------------------------------------------------
// Resend client — gracefully falls back to console.log if API key is not set
// ---------------------------------------------------------------------------

const RESEND_API_KEY = process.env.RESEND_API_KEY
// Absender-Adresse: per Env-Var überschreibbar (z. B. in Preview-Umgebungen).
// Fallback auf die verifizierte Prod-Adresse.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || 'ChairMatch <noreply@chairmatch.de>'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.chairmatch.de'

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
  /**
   * Stornofrist des Salons in Stunden (`booking_policies.cancellation_hours`).
   *
   * Ohne diesen Wert nennt die Erinnerung gar keine Frist. Bis Track 12 stand
   * dort fest „bis 24h vorher kostenlos stornieren" — eine Zusage, die die
   * Vorlage nie nachschlagen konnte und die fuer jeden Salon mit abweichender
   * Frist falsch war. Track 6 hat genau diesen Satz aus dem Buchungsformular
   * entfernt, in der Mail stand er weiter.
   */
  cancellationHours?: number | null
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

/**
 * HTML-Escaping fuer jeden Wert, der in eine Mail eingesetzt wird.
 *
 * `'` gehoert dazu: einfache Anfuehrungszeichen sind in HTML-Attributen ein
 * gueltiger Begrenzer, und einige der Vorlagen unten setzen Werte in
 * Attribute (href, style). Ohne `&#39;` liesse sich aus einem
 * einfach-gequoteten Attribut ausbrechen.
 */
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * URL fuer ein `href` — nur http/https, sonst nichts.
 *
 * `javascript:` und `data:` sind in E-Mail-Clients zwar meist wirkungslos,
 * aber der Weg fuehrt ueber Weiterleitungen und Webmail-Ansichten trotzdem
 * zurueck in einen Browser. Was kein http(s) ist, wird zur Startseite —
 * lieber ein harmloser Link als ein gefaehrlicher.
 */
function safeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'https://www.chairmatch.de'
    return esc(parsed.toString())
  } catch {
    return 'https://www.chairmatch.de'
  }
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
    // Der Rueckfall gibt den Rohwert aus — der kommt aus dem Request und
    // muss deshalb escapet werden, anders als die Intl-Ausgabe darueber.
    return esc(dateStr)
  }
}

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="de">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title></head>
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
    <p style="margin:4px 0 0"><a href="https://www.chairmatch.de" style="color:#D4AF37;text-decoration:none">chairmatch.de</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`
}

function goldButton(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto">
<tr><td style="background:linear-gradient(135deg,#D4AF37,#E8D06A);border-radius:8px;padding:14px 32px;text-align:center">
  <a href="${safeUrl(url)}" style="color:#1a1a1a;font-weight:700;font-size:15px;text-decoration:none;display:inline-block">${esc(text)}</a>
</td></tr></table>`
}

async function send(to: string, subject: string, html: string): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.log(`[Email] RESEND_API_KEY not set — logging instead`)
    console.log(`[Email] To: ${to}`)
    console.log(`[Email] Subject: ${subject}`)
    console.log(`[Email] HTML length: ${html.length} chars`)
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
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown email error'
    console.error('[Email] Exception:', message)
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
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${esc(details.startTime)} – ${esc(details.endTime)}</td></tr>
      ${details.staffName ? `<tr><td style="padding:12px 16px;color:#999;font-size:13px;border-bottom:1px solid #333">Mitarbeiter</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;border-bottom:1px solid #333">${esc(details.staffName)}</td></tr>` : ''}
      <tr><td style="padding:12px 16px;color:#999;font-size:13px">Preis</td>
          <td style="padding:12px 16px;color:#D4AF37;font-size:14px;font-weight:700">${formatPrice(details.priceCents)}</td></tr>
    </table>
    <p style="font-size:13px;color:#999">Buchungs-ID: ${esc(details.bookingId)}</p>
    ${goldButton('Meine Termine', `${APP_URL}/termine`)}
    <p style="font-size:13px;color:#777;margin-top:24px">Falls du Fragen hast, kontaktiere uns unter <a href="mailto:support@chairmatch.de" style="color:#D4AF37">support@chairmatch.de</a>.</p>
  `)

  return send(to, subject, html)
}

/**
 * Absage an die Kundin/den Kunden — wenn der SALON den Termin absagt.
 *
 * Diesen Weg gab es nicht. `cancelBooking` schrieb den Status, legte einen
 * Audit-Eintrag an und war fertig: wer abgesagt wurde, erfuhr es nur, wenn er
 * zufaellig die Terminliste neu lud. Fuer eine Absage durch den Betrieb ist
 * das keine Nebensache — der Kunde plant den Tag danach.
 *
 * Ein Betrag steht bewusst nicht drin (siehe `cancelBooking`): fuer eine
 * Stornogebuehr gibt es keine Spalte, jede Zahl waere erfunden.
 */
export interface BookingCancellationDetails {
  bookingId: string
  salonName: string
  serviceName: string
  date: string
  startTime: string
  customerName?: string
  cancelledBy: 'customer' | 'provider'
  reason?: string | null
}

export async function sendBookingCancellation(
  to: string,
  details: BookingCancellationDetails,
) {
  const durchSalon = details.cancelledBy === 'provider'
  const subject = `Termin abgesagt — ${details.salonName}`
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Termin abgesagt</h2>
    <p>Hallo${details.customerName ? ` ${esc(details.customerName)}` : ''},</p>
    <p>${durchSalon
      ? `dein Termin bei <strong>${esc(details.salonName)}</strong> wurde vom Salon abgesagt.`
      : `deine Absage bei <strong>${esc(details.salonName)}</strong> ist eingegangen.`}</p>
    <div style="background:#1a1a1a;border-radius:8px;border-left:4px solid #D4AF37;padding:20px;margin:20px 0">
      <p style="margin:0;color:#D4AF37;font-weight:700;font-size:16px">${esc(details.serviceName)}</p>
      <p style="margin:6px 0 0;color:#e0e0e0">${formatDate(details.date)} um ${esc(details.startTime)} Uhr</p>
    </div>
    ${details.reason ? `<p style="color:#999;font-size:13px">Grund: ${esc(details.reason)}</p>` : ''}
    <p style="font-size:13px;color:#999">Buchungs-ID: ${esc(details.bookingId)}</p>
    ${durchSalon
      ? goldButton('Neuen Termin finden', `${APP_URL}/search`)
      : goldButton('Meine Termine', `${APP_URL}/termine`)}
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
      <p style="margin:6px 0 0;color:#e0e0e0">${formatDate(details.date)} um ${esc(details.startTime)} Uhr</p>
      ${details.staffName ? `<p style="margin:6px 0 0;color:#999">Mitarbeiter: ${esc(details.staffName)}</p>` : ''}
    </div>
    ${goldButton('Meine Termine', `${APP_URL}/termine`)}
    ${
      typeof details.cancellationHours === 'number' && details.cancellationHours > 0
        ? `<p style="font-size:13px;color:#777;margin-top:24px">Musst du umbuchen? Bis ${details.cancellationHours} Stunden vor dem Termin kannst du kostenfrei stornieren.</p>`
        : `<p style="font-size:13px;color:#777;margin-top:24px">Musst du umbuchen? Du kannst den Termin in deiner Terminliste stornieren — welche Frist dein Salon dafuer setzt, steht dort am Termin.</p>`
    }
  `)

  return send(to, subject, html)
}

/**
 * Send a welcome email to a newly registered user.
 *
 * Hier stand bis Track 11: „Nutze den Code WELCOME10 für 10% auf deine erste
 * Buchung!" — an JEDEN neu registrierten Nutzer. WELCOME10 war einer von drei
 * Codes aus der Browser-Konstante `PROMO_CODES`, die Track 9 als erfunden
 * entfernt hat: der Server kennt sie nicht, er prüft die Tabelle `promo_codes`
 * und belegt dort ein Kontingent (`claimPromoCode`). Die Konstante ist weg,
 * das Versprechen war noch da — wer den Code eingab, zahlte den vollen Preis.
 *
 * Rabatte werden dort zugesagt, wo sie verwaltet werden. Diese Mail sagt
 * keinen zu.
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
    ${goldButton('Jetzt entdecken', 'https://www.chairmatch.de')}
  `)

  return send(to, subject, html)
}

/**
 * Begrüßung für neu registrierte Anbieter.
 *
 * Bis Track 11 bekamen Anbieter die Kunden-Mail von oben: "Salon entdecken →
 * Termin buchen → Beauty genießen" — der Ablauf der Gegenseite. Und sie
 * versprach einen Rabattcode, den es serverseitig nicht gibt (siehe unten).
 *
 * Diese Mail sagt stattdessen, was als Nächstes wirklich passiert: Passwort
 * setzen (die dafür nötige Mail schickt Supabase separat), Prüfung des
 * Eintrags, danach Freischaltung.
 */
export async function sendProviderWelcomeEmail(to: string, name: string, businessName: string) {
  const subject = 'Deine Anbieter-Registrierung bei ChairMatch'
  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">Willkommen, ${esc(name)}!</h2>
    <p>Wir haben die Registrierung für <strong style="color:#D4AF37">${esc(businessName)}</strong> erhalten.</p>
    <p style="margin-top:16px">So geht es weiter:</p>
    <ol style="margin:12px 0 0;padding-left:20px;color:#e0e0e0;font-size:14px;line-height:1.9">
      <li><strong>Passwort festlegen.</strong> Du bekommst dazu eine separate E-Mail von uns mit einem Link. Erst danach kannst du dich anmelden.</li>
      <li><strong>Prüfung deiner Angaben.</strong> Dein Eintrag ist bis dahin nicht öffentlich sichtbar.</li>
      <li><strong>Profil vervollständigen.</strong> Leistungen, Öffnungszeiten, Fotos und — falls du vermietest — deine Mietobjekte.</li>
    </ol>
    <p style="font-size:13px;color:#777;margin-top:24px">Keine Passwort-Mail erhalten? Fordere sie über „Passwort vergessen" auf der Anmeldeseite erneut an.</p>
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
    <p style="font-size:12px;color:#555;margin-top:16px;word-break:break-all">Link: ${esc(resetUrl)}</p>
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
    ${details.bookingId ? goldButton('Details ansehen', `https://www.chairmatch.de/provider#booking-${details.bookingId}`) : goldButton('Dashboard öffnen', 'https://www.chairmatch.de/provider')}
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
          <td style="color:#e0e0e0;font-size:14px;font-weight:600;padding-bottom:8px;text-align:right">${esc(documentType)}</td>
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
    ${goldButton('Compliance-Dashboard öffnen', 'https://www.chairmatch.de/owner/compliance')}
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
          <a href="${safeUrl(trackingUrl)}" style="display:inline-block;background:linear-gradient(135deg,#D4AF37,#E8D06A);color:#1a1a1a;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:700;text-decoration:none">Jetzt ansehen →</a>
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
    // KEIN `first_name` — die Spalte gibt es live nicht. Mit ihr lief die
    // ganze Abfrage in 42703, `profile` blieb null, und damit fiel nicht nur
    // die Anrede aus, sondern auch die Empfaengeradresse.
    .select('email, full_name')
    .eq('id', userId)
    .maybeSingle()

  const to = profile?.email
  if (!to) {
    console.warn(`[Email] sendPostBookingAffiliateRecommendations: kein E-Mail für user ${userId}`)
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
    console.log('[Email] sendPostBookingAffiliateRecommendations: keine Produkte vorhanden')
    return { success: false, error: 'Keine Affiliate-Produkte verfügbar' }
  }

  const serviceLabel = categoryLabel(slug)
  const subject = `Mach das Beste aus deiner ${serviceLabel}`
  // Vorname aus `full_name` ableiten, statt eine eigene Spalte zu erwarten.
  const greetingName = (profile?.full_name || '').trim().split(/\s+/)[0] || ''

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

// ---------------------------------------------------------------------------
// Mietanfragen (Track D) — Benachrichtigung an den Vermieter
// ---------------------------------------------------------------------------

export interface RentalRequestEmailDetails {
  /** rental_requests.id — steht als Referenz in der Mail und im Delivery-Log. */
  requestId: string
  requestType: 'miete' | 'besichtigung'
  equipmentName: string
  /** Kurzform des Interessenten-Namens, z. B. „Marko F." — nie die volle Identität. */
  requesterName: string
  preferredDate: string
  preferredTime?: string | null
  /** Vorformatierte Dauer, z. B. „3 Tage". */
  durationLabel?: string | null
  estimatedCents?: number | null
  /** Freitext des Interessenten (gekürzt), optional. */
  message?: string | null
  salonName?: string | null
  /** Nur die Stadt — nie die vollständige Anschrift. */
  city?: string | null
  /** Anrede-Name des Vermieters. */
  recipientName?: string | null
}

const RENTAL_REQUESTS_DEEP_LINK = '/vermieter/mein-inserat/anfragen'

/**
 * Betreff der Vermieter-Mail.
 *
 * Ausgelagert, weil ihn zwei Stellen brauchen: der Versand selbst und das
 * Zustelllog (`email_delivery_log.subject`). Wuerde das Log den Betreff
 * nachbauen, stuende beim naechsten Textwechsel etwas anderes im Log als in
 * der Mail — und genau das Log ist die Quelle fuer Support-Rueckfragen.
 */
export function rentalRequestEmailSubject(
  requestType: 'miete' | 'besichtigung',
  salonName?: string | null,
): string {
  const heading = requestType === 'miete' ? 'Neue Mietanfrage' : 'Neue Besichtigungsanfrage'
  return salonName ? `${heading} für ${salonName} — ChairMatch` : `${heading} — ChairMatch`
}

/**
 * Benachrichtigt den Vermieter über eine neue Miet- oder Besichtigungsanfrage.
 *
 * Bewusst datensparsam: kein IBAN/Auszahlungsbezug, keine vollständige Adresse,
 * keine Kontaktdaten des Interessenten. Wer die Details braucht, klickt in die
 * App — dort greift die Authentifizierung.
 */
export async function sendRentalRequestNotification(
  to: string,
  details: RentalRequestEmailDetails,
) {
  const isRental = details.requestType === 'miete'
  const heading = isRental ? 'Neue Mietanfrage' : 'Neue Besichtigungsanfrage'
  const subject = rentalRequestEmailSubject(details.requestType, details.salonName)

  const rows: Array<[string, string]> = [
    ['Anfrage', isRental ? 'Miete' : 'Besichtigung'],
    ['Mietobjekt', esc(details.equipmentName)],
    ['Interessent', esc(details.requesterName)],
    [
      'Wunschtermin',
      `${formatDate(details.preferredDate)}${details.preferredTime ? ` um ${esc(details.preferredTime)} Uhr` : ''}`,
    ],
  ]
  if (details.durationLabel) rows.push(['Dauer', esc(details.durationLabel)])
  if (details.city) rows.push(['Standort', esc(details.city)])
  if (isRental && details.estimatedCents != null && details.estimatedCents > 0) {
    rows.push(['Schätzung', `<span style="color:#D4AF37;font-weight:700">${formatPrice(details.estimatedCents)}</span>`])
  }

  const tableRows = rows
    .map(
      ([label, value], i) => {
        const border = i < rows.length - 1 ? 'border-bottom:1px solid #333' : ''
        return `<tr><td style="padding:12px 16px;color:#999;font-size:13px;${border}">${label}</td>
          <td style="padding:12px 16px;color:#e0e0e0;font-size:14px;${border}">${value}</td></tr>`
      },
    )
    .join('')

  const html = baseLayout(subject, `
    <h2 style="margin:0 0 16px;color:#D4AF37;font-size:18px">&#x1F4E9; ${heading}</h2>
    <p>Hallo${details.recipientName ? ` ${esc(details.recipientName)}` : ''},</p>
    <p>du hast eine neue ${isRental ? 'Mietanfrage' : 'Besichtigungsanfrage'} über ChairMatch erhalten.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;background:#1a1a1a;border-radius:8px;border:1px solid #444">
      ${tableRows}
    </table>
    ${details.message ? `<div style="background:#1a1a1a;border-radius:8px;border-left:4px solid #D4AF37;padding:16px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#999">Nachricht</p>
      <p style="margin:0;color:#e0e0e0;white-space:pre-line">${esc(details.message)}</p>
    </div>` : ''}
    ${goldButton('Anfrage in ChairMatch öffnen', `${APP_URL}${RENTAL_REQUESTS_DEEP_LINK}`)}
    <p style="font-size:13px;color:#777;margin-top:24px">
      Antworte bitte direkt in der App — so bleiben Kontaktdaten geschützt und die
      Anfrage nachvollziehbar dokumentiert.
    </p>
    <p style="font-size:12px;color:#555;margin-top:6px">Anfrage-ID: ${esc(details.requestId)}</p>
  `)

  return send(to, subject, html)
}
