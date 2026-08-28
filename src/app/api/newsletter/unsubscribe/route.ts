import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { isSchemaMismatch } from '@/lib/pg-errors'
import { checkRateLimit, clientIp, rateLimitResponse } from '@/lib/rate-limit'

/**
 * Abmeldung und Wiederanmeldung — als POST, nicht als GET.
 *
 * Bis Track 19 hat die Seite /unsubscribe die Abmeldung im GET erledigt:
 * `?token=…` meldete ab, `&action=resubscribe` meldete wieder an. Ein GET darf
 * nichts aendern, und hier war das keine Formfrage:
 *
 *  1. Postfaecher und Sicherheitsprodukte OEFFNEN Links in E-Mails, ohne dass
 *     jemand klickt — Microsoft Defender for Office (Safe Links), Barracuda,
 *     Proofpoint und diverse Virenscanner rufen jede URL einer eingehenden
 *     Mail auf. Jede dieser Pruefungen hat den Empfaenger abgemeldet. Der
 *     Newsletter hoerte auf zu kommen, und niemand hatte etwas getan.
 *
 *  2. Der Newsletter setzt `List-Unsubscribe-Post: List-Unsubscribe=One-Click`
 *     (RFC 8058). Damit sagt ChairMatch jedem Mailanbieter zu, dass die in
 *     `List-Unsubscribe` genannte Adresse ein POST entgegennimmt. Genannt war
 *     aber die Seite — eine Next.js-Page, die kein POST kennt. Der
 *     "Abmelden"-Knopf in Gmail und Outlook lief damit ins Leere, und mit ihm
 *     die Zusage, die im Header steht.
 *
 * Beides loest dieser Endpunkt: er nimmt den Token per Query (One-Click) oder
 * aus dem Formular der Bestaetigungsseite entgegen und aendert nur auf POST.
 * Ein Browser-Formular bekommt eine 303 zurueck auf die Seite, ein
 * Mailanbieter eine kurze JSON-Antwort.
 *
 * Die E-Mail-Adresse steht bewusst NICHT in der Antwort und nicht im Redirect:
 * der Token wandert durch Referrer, Proxy-Logs und Browserverlauf, und aus
 * "Token X gehoert zu adresse@example.de" wird sonst eine Auskunft an jeden,
 * der die URL sieht.
 */

const RATE = { scope: 'newsletter-unsubscribe', max: 20, windowMs: 60_000 }

/** Aus Query ODER Formularfeld — One-Click schickt nur den Body von RFC 8058. */
async function readToken(req: NextRequest): Promise<{ token: string; action: string }> {
  const url = new URL(req.url)
  let token = (url.searchParams.get('token') || '').trim()
  let action = url.searchParams.get('action') || 'unsubscribe'

  const contentType = req.headers.get('content-type') || ''
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const form = await req.formData().catch(() => null)
    if (form) {
      const formToken = form.get('token')
      if (typeof formToken === 'string' && formToken.trim()) token = formToken.trim()
      const formAction = form.get('action')
      if (typeof formAction === 'string' && formAction.trim()) action = formAction.trim()
    }
  }

  return { token, action: action === 'resubscribe' ? 'resubscribe' : 'unsubscribe' }
}

export async function POST(req: NextRequest) {
  // Der Token ist das einzige Geheimnis dieser Route — ohne Deckel liesse er
  // sich durchprobieren.
  const limit = checkRateLimit(clientIp(req), RATE)
  if (limit.limited) return rateLimitResponse(limit, 'Zu viele Anfragen.')

  const { token, action } = await readToken(req)

  const wantsHtml = (req.headers.get('accept') || '').includes('text/html')
  const done = (state: string, status = 200) =>
    wantsHtml
      ? NextResponse.redirect(new URL(`/unsubscribe?state=${state}`, req.url), 303)
      : NextResponse.json({ ok: state === 'success' || state === 'reactivated', state }, { status })

  if (!token) return done('invalid', 400)

  const sb = getSupabaseAdmin()
  const { data: sub, error: lookupErr } = await sb
    .from('newsletter_subscribers')
    .select('id, status')
    .eq('unsubscribe_token', token)
    .maybeSingle()

  if (lookupErr) {
    console.error(
      '[Unsubscribe] Lookup fehlgeschlagen:',
      lookupErr.code,
      isSchemaMismatch(lookupErr) ? 'Schema passt nicht zur DB' : lookupErr.message,
    )
    return done('error', 500)
  }
  if (!sub) return done('invalid', 404)

  const updates =
    action === 'resubscribe'
      ? { status: 'active', unsubscribed_at: null }
      : { status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }

  const { error } = await sb
    .from('newsletter_subscribers')
    .update(updates)
    .eq('id', sub.id)

  if (error) {
    console.error('[Unsubscribe] Update fehlgeschlagen:', error.code, error.message)
    return done('error', 500)
  }

  return done(action === 'resubscribe' ? 'reactivated' : 'success')
}

/**
 * Ein GET auf diese Adresse aendert nichts — es sagt nur, wie es geht. Genau
 * das ist der Punkt: der Scanner, der die Adresse aus der Mail aufruft, darf
 * niemanden abmelden.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  return NextResponse.redirect(
    new URL(`/unsubscribe${token ? `?token=${encodeURIComponent(token)}` : ''}`, req.url),
    303,
  )
}
