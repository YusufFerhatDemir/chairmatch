/**
 * Newsletter HTML template — Schwarz-Gold-Brand-Design
 *
 * Wraps editor-provided HTML content with a brand header,
 * a structured content area and a DSGVO-konformen Footer
 * including the unsubscribe link.
 *
 * Mobile-responsive, inline-styled (für Email-Clients).
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://chairmatch.de'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Wraps content HTML into a full newsletter shell.
 *
 * @param content       HTML-Inhalt (vom Editor, schon validiert oder vertraut)
 * @param unsubscribeUrl absolute URL zum Unsubscribe-Endpoint
 * @param opts          optional: preview-Text und web-Version-URL
 */
export function wrapNewsletterHtml(
  content: string,
  unsubscribeUrl: string,
  opts: { previewText?: string; webViewUrl?: string } = {}
): string {
  const previewText = opts.previewText ? esc(opts.previewText) : ''
  const webViewUrl = opts.webViewUrl

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>ChairMatch Newsletter</title>
<style>
  @media (max-width: 600px) {
    .nl-container { width: 100% !important; max-width: 100% !important; }
    .nl-pad { padding: 20px !important; }
    .nl-headline { font-size: 22px !important; }
  }
  a { color: #D4AF37; }
  img { max-width: 100%; height: auto; display: block; }
  table { border-collapse: collapse; }
  body { margin: 0; padding: 0; }
</style>
</head>
<body style="margin:0;padding:0;background:#0B0B0F;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
${previewText ? `<div style="display:none;font-size:1px;color:#0B0B0F;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${previewText}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0F">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" class="nl-container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#111114;border-radius:16px;border:1px solid rgba(176,144,96,0.18);overflow:hidden">

    <!-- Header -->
    <tr><td class="nl-pad" style="padding:32px 32px 20px;text-align:center;background:linear-gradient(180deg,#1A1A1F 0%,#111114 100%);border-bottom:1px solid rgba(176,144,96,0.18)">
      <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:6px;color:#D4AF37">CHAIR<span style="color:#FCF6BA">MATCH</span></h1>
      <p style="margin:6px 0 0;font-size:10px;letter-spacing:4px;color:#8A7248;text-transform:uppercase">Deutschland · Newsletter</p>
    </td></tr>

    <!-- Content -->
    <tr><td class="nl-pad nl-headline" style="padding:32px;color:#F5F5F7;font-size:15px;line-height:1.7">
      ${content}
    </td></tr>

    <!-- Footer -->
    <tr><td class="nl-pad" style="padding:24px 32px 32px;background:#0B0B0F;border-top:1px solid rgba(176,144,96,0.10);text-align:center;font-size:12px;color:rgba(245,245,247,0.45);line-height:1.6">
      <p style="margin:0 0 8px;color:rgba(245,245,247,0.6);font-weight:600">ChairMatch Deutschland</p>
      <p style="margin:0 0 16px">Du erhältst diese E-Mail, weil du dich für unseren Newsletter angemeldet hast.</p>
      <p style="margin:0 0 4px">
        <a href="${unsubscribeUrl}" style="color:#D4AF37;text-decoration:underline">Newsletter abbestellen</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/datenschutz" style="color:#D4AF37;text-decoration:underline">Datenschutz</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/impressum" style="color:#D4AF37;text-decoration:underline">Impressum</a>
        ${webViewUrl ? `&nbsp;·&nbsp;<a href="${webViewUrl}" style="color:#D4AF37;text-decoration:underline">Im Browser ansehen</a>` : ''}
      </p>
      <p style="margin:12px 0 0;font-size:11px;color:rgba(245,245,247,0.35)">&copy; ${new Date().getFullYear()} ChairMatch Deutschland · <a href="${APP_URL}" style="color:#8A7248">chairmatch.de</a></p>
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`
}

/**
 * Hilfsfunktion: baut die unsubscribe-URL für ein Token.
 */
export function buildUnsubscribeUrl(token: string): string {
  return `${APP_URL}/unsubscribe?token=${encodeURIComponent(token)}`
}

/**
 * Hilfsfunktion: Plain-Text-Variante als Fallback erzeugen
 * (sehr simpel — entfernt HTML-Tags). Resend nimmt das als
 * `text` Feld für besseren Spam-Score.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
