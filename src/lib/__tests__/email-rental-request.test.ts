import { describe, it, expect, vi, beforeAll } from 'vitest'
import type { RentalRequestEmailDetails } from '@/lib/email'

/**
 * Rendering-Test fuer die Mietanfrage-Mail: Absender, Deep-Link und
 * Datensparsamkeit werden am tatsaechlich erzeugten HTML geprueft.
 */

const sent: Array<{ from: string; to: string; subject: string; html: string }> = []

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (payload: { from: string; to: string; subject: string; html: string }) => {
        sent.push(payload)
        return { data: { id: 'msg_test' }, error: null }
      },
    }
  },
}))

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: () => ({}) }),
}))

type SendRentalRequestNotification =
  typeof import('@/lib/email')['sendRentalRequestNotification']

let sendRentalRequestNotification: SendRentalRequestNotification

beforeAll(async () => {
  // Der Resend-Client wird beim Modul-Import gebaut — Env muss vorher stehen.
  process.env.RESEND_API_KEY = 're_test_key'
  process.env.NEXT_PUBLIC_APP_URL = 'https://www.chairmatch.de'
  const mod = await import('@/lib/email')
  sendRentalRequestNotification = mod.sendRentalRequestNotification
})

const DETAILS: RentalRequestEmailDetails = {
  requestId: 'req-123',
  requestType: 'miete' as const,
  equipmentName: 'Stuhl am Fenster',
  requesterName: 'Marko F.',
  preferredDate: '2026-09-01',
  preferredTime: '10:00',
  durationLabel: '3 Tage',
  estimatedCents: 27000,
  message: 'Ich haette Interesse an drei Probetagen.',
  salonName: 'Salon Anna',
  city: 'Koeln',
  recipientName: 'Anna Vermieterin',
}

async function render(overrides: Partial<RentalRequestEmailDetails> = {}) {
  sent.length = 0
  const result = await sendRentalRequestNotification('anna@example.com', {
    ...DETAILS,
    ...overrides,
  })
  expect(result.success).toBe(true)
  return sent[0]
}

describe('sendRentalRequestNotification', () => {
  it('verschickt unter dem Absender ChairMatch, nicht unter einem Personennamen', async () => {
    const mail = await render()
    expect(mail.from).toContain('ChairMatch')
    expect(mail.from).not.toMatch(/yusuf/i)
  })

  it('betreffzeile nennt Anfrage und Salon auf Deutsch', async () => {
    const mail = await render()
    expect(mail.subject).toBe('Neue Mietanfrage für Salon Anna — ChairMatch')
  })

  it('verlinkt direkt auf die Anfragen-Seite des Vermieters', async () => {
    const mail = await render()
    expect(mail.html).toContain('https://www.chairmatch.de/vermieter/mein-inserat/anfragen')
  })

  it('zeigt Termin, Dauer und Kostenschaetzung', async () => {
    const mail = await render()
    expect(mail.html).toContain('Stuhl am Fenster')
    expect(mail.html).toContain('3 Tage')
    expect(mail.html).toContain('10:00')
    expect(mail.html).toContain('270,00')
    expect(mail.html).toContain('req-123')
  })

  it('enthaelt weder IBAN noch vollstaendige Anschrift', async () => {
    const mail = await render()
    expect(mail.html).not.toMatch(/iban/i)
    expect(mail.html).not.toMatch(/DE\d{2}\s?\d{4}/)
    // Nur die Stadt, keine Strasse/Hausnummer
    expect(mail.html).toContain('Koeln')
    expect(mail.html).not.toMatch(/stra(ss|ß)e/i)
  })

  it('escaped Nutzereingaben — kein HTML-Durchgriff aus der Nachricht', async () => {
    const mail = await render({ message: '<script>alert(1)</script>' })
    expect(mail.html).not.toContain('<script>alert(1)</script>')
    expect(mail.html).toContain('&lt;script&gt;')
  })

  it('laesst Preisblock und Nachricht bei Besichtigungen weg', async () => {
    const mail = await render({
      requestType: 'besichtigung',
      durationLabel: null,
      estimatedCents: 0,
      message: null,
      salonName: null,
    })
    expect(mail.subject).toBe('Neue Besichtigungsanfrage — ChairMatch')
    expect(mail.html).toContain('Besichtigung')
    expect(mail.html).not.toContain('Schätzung')
    expect(mail.html).not.toContain('Nachricht')
  })
})
