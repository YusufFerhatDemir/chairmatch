// @vitest-environment node
/**
 * Keine fremde Markup-Eingabe in einer Mail, die von uns kommt.
 *
 * DER BEFUND (Track 12): `sendBookingConfirmation` und `sendBookingReminder`
 * setzten `bookingId`, `startTime` und `endTime` ROH ins HTML — waehrend
 * `salonName`, `serviceName` und `customerName` danebenstanden und escapet
 * wurden. Es war also kein Versaeumnis am Konzept, sondern drei vergessene
 * Felder.
 *
 * Erreichbar war das nicht nur intern: POST /api/email nahm den vollstaendigen
 * Mailinhalt aus dem Request entgegen, liess den Empfaenger frei waehlen und
 * erlaubte den Typ `booking_confirmation` der Rolle `anbieter` — einer Rolle,
 * die sich ueber die oeffentliche Route /api/register-provider jeder selbst
 * anlegen kann. Damit liess sich beliebiges Markup samt Link in eine Mail
 * schreiben, die von `noreply@chairmatch.de` kommt, DKIM-signiert ist und
 * unser Layout traegt.
 *
 * Der Test rendert die echten Vorlagen ueber den echten Versandweg und faengt
 * den fertigen HTML-Text am Resend-Client ab.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mail = vi.hoisted(() => ({
  sent: [] as Array<{ from: string; to: string; subject: string; html: string }>,
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { from: string; to: string; subject: string; html: string }) => {
        mail.sent.push(payload)
        return { data: { id: 'msg_test' }, error: null }
      },
    }
  },
}))

vi.mock('@/lib/supabase-server', () => ({ getSupabaseAdmin: () => ({}) }))

process.env.RESEND_API_KEY ??= 're_test_key'

const {
  sendBookingConfirmation,
  sendBookingReminder,
  sendPasswordReset,
  sendComplianceAlert,
  sendProviderNotification,
} = await import('@/lib/email')

/** Der Angriffsstring: oeffnet ein Tag UND einen Link. */
const NUTZLAST = '<a href="https://phishing.example">Jetzt Konto bestaetigen</a>'
/** Ausbruch aus einem einfach-gequoteten Attribut. */
const ATTRIBUT_NUTZLAST = "x' onmouseover='alert(1)"

const basis = {
  bookingId: 'b-1',
  salonName: 'Salon Nord',
  serviceName: 'Schnitt',
  date: '2026-09-01',
  startTime: '14:00',
  endTime: '14:45',
  priceCents: 4500,
}

function letzteMail() {
  return mail.sent[mail.sent.length - 1]
}

beforeEach(() => {
  mail.sent.length = 0
})

describe('Buchungsbestaetigung', () => {
  it.each([
    'bookingId',
    'salonName',
    'serviceName',
    'startTime',
    'endTime',
    'customerName',
    'staffName',
  ])('escapet %s', async (feld) => {
    await sendBookingConfirmation('kundin@example.com', { ...basis, [feld]: NUTZLAST })
    const { html } = letzteMail()

    expect(html).not.toContain(NUTZLAST)
    expect(html).toContain('&lt;a href=')
    // Genau EIN Link bleibt: der eigene Button.
    expect(html.match(/<a href="https:\/\/phishing\.example"/g)).toBeNull()
  })

  it('escapet den Datums-Rueckfall, wenn das Datum unlesbar ist', async () => {
    await sendBookingConfirmation('kundin@example.com', { ...basis, date: NUTZLAST })
    expect(letzteMail().html).not.toContain(NUTZLAST)
  })

  it('escapet einfache Anfuehrungszeichen (Attribut-Ausbruch)', async () => {
    await sendBookingConfirmation('kundin@example.com', { ...basis, bookingId: ATTRIBUT_NUTZLAST })
    const { html } = letzteMail()
    expect(html).not.toContain("onmouseover='alert(1)")
    expect(html).toContain('&#39;')
  })

  it('escapet den Salonnamen auch im <title>', async () => {
    await sendBookingConfirmation('kundin@example.com', { ...basis, salonName: '</title><script>x' })
    const { html } = letzteMail()
    expect(html).not.toContain('</title><script>')
  })

  it('verlinkt die Terminliste, nicht das Buchungsformular', async () => {
    // Der Button zeigte auf `/booking/${bookingId}`. Die Route dort ist
    // `/booking/[salonId]` — das Buchungsformular fuer einen Salon. Mit einer
    // Buchungs-ID darin fuehrte „Buchung ansehen" also in ein Formular fuer
    // einen Salon, den es nicht gibt. Die eigenen Termine stehen unter
    // /termine (src/app/(public)/termine/page.tsx).
    await sendBookingConfirmation('kundin@example.com', basis)
    const { html } = letzteMail()
    expect(html).toContain('/termine')
    expect(html).not.toContain(`/booking/${basis.bookingId}`)
  })
})

describe('Terminerinnerung', () => {
  it('escapet die Uhrzeit', async () => {
    await sendBookingReminder('kundin@example.com', { ...basis, startTime: NUTZLAST })
    expect(letzteMail().html).not.toContain(NUTZLAST)
  })

  it('nennt ohne bekannte Frist keine Stundenzahl', async () => {
    // Bis Track 12 stand hier fest „bis 24h vorher kostenlos stornieren" — fuer
    // JEDEN Salon, obwohl die Frist in `booking_policies.cancellation_hours`
    // pro Salon gepflegt wird. Track 6 hat genau diesen Satz aus dem
    // Buchungsformular entfernt; in der Mail stand er weiter.
    await sendBookingReminder('kundin@example.com', basis)
    const { html } = letzteMail()
    expect(html).not.toMatch(/\d+\s*(h|Stunden) vor/)
    expect(html).toContain('steht dort am Termin')
  })

  it('nennt die Frist, wenn sie uebergeben wird', async () => {
    await sendBookingReminder('kundin@example.com', { ...basis, cancellationHours: 48 })
    expect(letzteMail().html).toContain('Bis 48 Stunden vor dem Termin')
  })
})

describe('Weitere Vorlagen', () => {
  it('laesst kein javascript: in einen Button', async () => {
    await sendPasswordReset('kundin@example.com', 'javascript:alert(document.cookie)')
    const { html } = letzteMail()
    expect(html).not.toContain('href="javascript:')
  })

  it('escapet die Reset-URL auch im Klartext-Hinweis', async () => {
    await sendPasswordReset('kundin@example.com', `https://example.com/r?x=${encodeURIComponent('"><img src=x>')}`)
    expect(letzteMail().html).not.toContain('"><img src=x>')
  })

  it('escapet den Dokumenttyp im Compliance-Hinweis', async () => {
    await sendComplianceAlert('anbieter@example.com', NUTZLAST, 'expired')
    expect(letzteMail().html).not.toContain(NUTZLAST)
  })

  it('escapet Salonname und Nachricht in der Anbieter-Benachrichtigung', async () => {
    await sendProviderNotification('anbieter@example.com', 'general', {
      salonName: NUTZLAST,
      customerName: NUTZLAST,
      message: NUTZLAST,
    })
    expect(letzteMail().html).not.toContain(NUTZLAST)
  })
})
