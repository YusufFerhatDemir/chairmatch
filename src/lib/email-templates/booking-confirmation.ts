/**
 * Email-Template: Buchungs-Bestätigung
 *
 * Wird via Resend versendet sobald in Phase 2 die Bezahlung echt durchgeht.
 * Stil: dunkel + gold (ChairMatch-Brand), wie SLIDE_bezahlung_v4.html Screen 2.
 *
 * Inline-CSS (Email-Clients ignorieren <style>). Web-fonts via Google Fonts
 * fallen in Gmail/Outlook auf system fonts zurück — fine.
 *
 * Verwendung:
 *   const html = renderBookingConfirmationEmail({
 *     customerName: 'Yusuf',
 *     salonName: 'Salon Anna',
 *     ...
 *   })
 *   await resend.emails.send({ to, subject, html })
 */

export interface BookingConfirmationData {
  customerName: string
  salonName: string
  salonTier?: 'starter' | 'premium' | 'enterprise'
  salonAddress: string
  serviceName: string
  dateLabel: string         // z.B. "Di 19. Mai 2026"
  timeLabel: string         // z.B. "14:30 Uhr"
  durationLabel: string     // z.B. "45 Min"
  bookingNumber: string     // z.B. "#CM-2026-05-12345"
  amountEuro: string        // z.B. "45,00"
  paymentMethodLabel: string // z.B. "Visa ··· 4242"
  paidAtLabel: string       // z.B. "18. Mai 2026 · 14:22"
  transactionId: string
  cancellableUntilLabel: string // z.B. "18. Mai, 14:30 Uhr"
  manageBookingUrl: string
  invoicePdfUrl: string
  helpUrl: string
  logoUrl?: string          // absolute URL — z.B. https://chairmatch.de/brand/chairmatch_logo_pin_symbol_gradient_512.png
}

export function renderBookingConfirmationEmail(d: BookingConfirmationData): string {
  const logo = d.logoUrl || 'https://chairmatch.de/brand/chairmatch_logo_pin_symbol_gradient_512.png'
  const isPremium = d.salonTier === 'premium' || d.salonTier === 'enterprise'

  return `<!DOCTYPE html>
<html lang="de"><head>
<meta charset="UTF-8">
<title>Dein Termin ist bestätigt — ChairMatch</title>
<style>
  body { margin:0; padding:0; background:#0B0B0F; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#F5F5F7; }
  .wrap { max-width:560px; margin:0 auto; padding:28px 18px 40px; }
  .card { background:#1A1A1F; border:1px solid rgba(196,168,106,0.18); border-radius:18px; overflow:hidden; }
  .head { padding:18px 22px; display:flex; align-items:center; gap:12px;
    background:linear-gradient(145deg, rgba(196,168,106,0.06), rgba(26,26,31,0.6));
    border-bottom:1px solid rgba(196,168,106,0.18); }
  .head img { width:34px; height:34px; }
  .head .brand { font-family:'Cinzel', Georgia, serif; font-size:15px; letter-spacing:3px; font-weight:600;
    color:#C4A86A; }
  .body { padding:22px 22px 24px; }
  .badge { display:inline-block; padding:6px 12px; border-radius:6px;
    background:rgba(106,191,128,0.12); border:1px solid rgba(106,191,128,0.25);
    color:#6ABF80; font-size:10px; font-weight:700; letter-spacing:1.5px; margin-bottom:14px; }
  h1 { font-family:'Cinzel', Georgia, serif; font-size:22px; font-weight:500; margin:0 0 6px; color:#C4A86A; }
  .greet { font-size:13px; color:rgba(245,245,247,0.60); margin:0 0 18px; line-height:1.55; }
  .sub-card { background:#111114; border:0.5px solid rgba(196,168,106,0.18);
    border-radius:12px; padding:14px 16px; margin-bottom:10px; }
  .name { font-weight:700; color:#F5F5F7; font-size:14px; margin-bottom:3px; }
  .premium { display:inline-block; font-size:9px; background:linear-gradient(135deg, #BF953F, #FCF6BA, #AA771C);
    color:#1a1000; padding:2px 7px; border-radius:3px; letter-spacing:1px; font-weight:700; margin-left:6px; }
  .addr { font-size:11.5px; color:rgba(245,245,247,0.60); margin-bottom:10px; }
  .row { display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:12px; }
  .row .lbl { color:rgba(245,245,247,0.60); }
  .row .val { color:#F5F5F7; font-weight:600; }
  .total { border-top:1px solid rgba(196,168,106,0.18); margin-top:6px; padding-top:8px; }
  .total .val { font-weight:700; font-size:14px; color:#C4A86A; }
  .info-gold { background:rgba(196,168,106,0.06); border:1px solid rgba(196,168,106,0.25);
    border-radius:10px; padding:11px 13px; font-size:12px; color:#F5F5F7;
    margin-bottom:14px; line-height:1.5; }
  .info-gold b { color:#C4A86A; }
  .cta { display:block; width:100%; padding:13px; text-align:center;
    background:linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%);
    color:#1a1000 !important; font-weight:700; font-size:13px;
    border-radius:10px; text-decoration:none; margin-bottom:8px; }
  .cta-outline { display:block; width:100%; padding:13px; text-align:center;
    background:transparent; color:#F5F5F7 !important; font-weight:600; font-size:13px;
    border:1px solid rgba(196,168,106,0.35); border-radius:10px; text-decoration:none; }
  .foot { text-align:center; font-size:10px; color:rgba(245,245,247,0.45);
    margin-top:18px; line-height:1.6; }
  .foot a { color:#C4A86A; text-decoration:underline; }
  .mono { font-family: 'SF Mono', Consolas, monospace; font-size:10.5px; }
</style></head>
<body>
<div class="wrap">
  <div class="card">
    <div class="head">
      <img src="${escapeHtml(logo)}" alt="ChairMatch">
      <div class="brand">CHAIRMATCH</div>
    </div>
    <div class="body">
      <span class="badge">✓ ZAHLUNG ERFOLGREICH</span>
      <h1>Dein Termin ist bestätigt</h1>
      <p class="greet">Hallo ${escapeHtml(d.customerName)}, deine Buchung wurde erfolgreich abgeschlossen.</p>

      <div class="sub-card">
        <div class="name">${escapeHtml(d.salonName)}${isPremium ? '<span class="premium">PREMIUM</span>' : ''}</div>
        <div class="addr">${escapeHtml(d.salonAddress)}</div>
        <div class="row"><span class="lbl">Service</span><span class="val">${escapeHtml(d.serviceName)}</span></div>
        <div class="row"><span class="lbl">Datum</span><span class="val">${escapeHtml(d.dateLabel)}</span></div>
        <div class="row"><span class="lbl">Uhrzeit</span><span class="val">${escapeHtml(d.timeLabel)}</span></div>
        <div class="row"><span class="lbl">Dauer</span><span class="val">${escapeHtml(d.durationLabel)}</span></div>
        <div class="row"><span class="lbl">Buchungs-Nr.</span><span class="val">${escapeHtml(d.bookingNumber)}</span></div>
        <div class="row total"><span class="lbl">Bezahlt</span><span class="val">${escapeHtml(d.amountEuro)} €</span></div>
      </div>

      <div class="sub-card">
        <div class="row"><span class="lbl">Zahlung</span><span class="val">${escapeHtml(d.paymentMethodLabel)}</span></div>
        <div class="row"><span class="lbl">Datum</span><span class="val">${escapeHtml(d.paidAtLabel)}</span></div>
        <div class="row"><span class="lbl">Transaktions-ID</span><span class="val mono">${escapeHtml(d.transactionId)}</span></div>
      </div>

      <div class="info-gold">
        <b>Kostenlose Stornierung</b> bis ${escapeHtml(d.cancellableUntilLabel)} — danach 100 % Stornogebühr.
      </div>

      <a href="${escapeHtml(d.manageBookingUrl)}" class="cta">Buchung verwalten</a>
      <a href="${escapeHtml(d.invoicePdfUrl)}" class="cta-outline">PDF-Rechnung herunterladen</a>

      <div class="foot">
        ChairMatch GmbH · Beauty Marketplace Deutschland<br>
        Diese E-Mail ist deine offizielle Rechnung gemäß § 14 UStG.<br>
        <a href="${escapeHtml(d.helpUrl)}">Hilfe &amp; Support</a>
      </div>
    </div>
  </div>
</div>
</body></html>`
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
