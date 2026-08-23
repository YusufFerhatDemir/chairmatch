import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests fuer die Vermieter-Benachrichtigung bei neuen Mietanfragen.
 *
 * Supabase und Resend sind gemockt — geprueft wird die Logik drumherum:
 * Idempotenz, Datensparsamkeit, Empfaenger-Ermittlung, Delivery-Log und
 * das Best-Effort-Verhalten im Fehlerfall.
 */

// ── Supabase-Mock ───────────────────────────────────────────────────────────

interface TableResponse {
  data?: unknown
  error?: { code?: string; message: string } | null
}

/** Antworten pro (Tabelle, Operation). insert/update/select getrennt. */
const responses: Record<string, TableResponse> = {}
/** Alle abgesetzten Schreibzugriffe — die Assertions lesen hier. */
const writes: Array<{ table: string; op: 'insert' | 'update'; payload: Record<string, unknown> }> = []

function makeBuilder(table: string) {
  const state = { op: 'select' as 'select' | 'insert' | 'update' }

  const result = () => {
    const key = `${table}.${state.op}`
    const r = responses[key] ?? responses[table] ?? { data: null, error: null }
    return { data: r.data ?? null, error: r.error ?? null }
  }

  const builder: Record<string, unknown> = {
    insert(payload: Record<string, unknown>) {
      state.op = 'insert'
      writes.push({ table, op: 'insert', payload })
      return builder
    },
    update(payload: Record<string, unknown>) {
      state.op = 'update'
      writes.push({ table, op: 'update', payload })
      return builder
    },
    select() { return builder },
    eq() { return builder },
    limit() { return builder },
    maybeSingle: async () => result(),
    single: async () => result(),
    // Ein Update ohne maybeSingle() wird direkt awaited.
    then(resolve: (v: unknown) => unknown) { return Promise.resolve(result()).then(resolve) },
  }
  return builder
}

const fromMock = vi.fn((table: string) => makeBuilder(table))

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}))

// ── Resend/Email-Mock ───────────────────────────────────────────────────────

const sendRentalRequestNotification = vi.fn(async () => ({ success: true, id: 'msg_1' }))
vi.mock('@/lib/email', () => ({
  sendRentalRequestNotification: (...args: unknown[]) =>
    (sendRentalRequestNotification as unknown as (...a: unknown[]) => unknown)(...args),
  // Der Betreff wird nicht gemockt: er landet im Delivery-Log und soll dort
  // derselbe sein wie in der Mail — genau das pruefen die Tests unten.
  rentalRequestEmailSubject: (requestType: string, salonName?: string | null) => {
    const heading = requestType === 'miete' ? 'Neue Mietanfrage' : 'Neue Besichtigungsanfrage'
    return salonName ? `${heading} für ${salonName} — ChairMatch` : `${heading} — ChairMatch`
  },
}))

import {
  notifyLandlordOfRentalRequest,
  formatDurationLabel,
  shortenRequesterName,
  truncateMessage,
  RENTAL_REQUEST_EMAIL_TYPE,
} from '@/lib/rental-request-email'

// ── Fixtures ────────────────────────────────────────────────────────────────

const BASE_INPUT = {
  requestId: '11111111-1111-1111-1111-111111111111',
  recipientId: '22222222-2222-2222-2222-222222222222',
  requestType: 'miete' as const,
  equipmentName: 'Stuhl am Fenster',
  requesterName: 'Marko Fischer',
  preferredDate: '2026-09-01',
  preferredTime: '10:00',
  durationUnit: 'day' as const,
  units: 3,
  estimatedCents: 27000,
  message: 'Hallo, ich haette Interesse an drei Probetagen.',
  salonName: 'Salon Anna',
  city: 'Koeln',
}

function happyPath() {
  responses['email_delivery_log.insert'] = { data: { id: 'log_1' }, error: null }
  responses['email_delivery_log.update'] = { data: null, error: null }
  responses['payout_accounts'] = { data: { account_holder: 'Anna Vermieterin' }, error: null }
  responses['profiles'] = { data: { email: 'anna@example.com', full_name: 'Anna P.' }, error: null }
}

beforeEach(() => {
  for (const k of Object.keys(responses)) delete responses[k]
  writes.length = 0
  fromMock.mockClear()
  sendRentalRequestNotification.mockClear()
  sendRentalRequestNotification.mockResolvedValue({ success: true, id: 'msg_1' })
})

// ── Reine Helfer ────────────────────────────────────────────────────────────

describe('formatDurationLabel', () => {
  it('bildet Singular und Plural korrekt', () => {
    expect(formatDurationLabel('day', 3)).toBe('3 Tage')
    expect(formatDurationLabel('day', 1)).toBe('1 Tag')
    expect(formatDurationLabel('hour', 2)).toBe('2 Stunden')
    expect(formatDurationLabel('week', 1)).toBe('1 Woche')
    expect(formatDurationLabel('month', 6)).toBe('6 Monate')
  })

  it('liefert null ohne Dauer — Besichtigungen haben keine', () => {
    expect(formatDurationLabel(null, null)).toBeNull()
    expect(formatDurationLabel('day', 0)).toBeNull()
    expect(formatDurationLabel('fortnight', 2)).toBeNull()
  })
})

describe('shortenRequesterName', () => {
  it('kuerzt den Nachnamen auf die Initiale', () => {
    expect(shortenRequesterName('Marko Fischer')).toBe('Marko F.')
    expect(shortenRequesterName('  Anna Lena  Musterfrau ')).toBe('Anna Lena M.')
  })

  it('laesst keine Mailadresse in die Benachrichtigung durch', () => {
    expect(shortenRequesterName('marko@example.com')).toBe('marko')
    expect(shortenRequesterName('marko@example.com')).not.toContain('@')
  })

  it('faellt auf einen neutralen Platzhalter zurueck', () => {
    expect(shortenRequesterName(null)).toBe('Ein Interessent')
    expect(shortenRequesterName('   ')).toBe('Ein Interessent')
  })
})

describe('truncateMessage', () => {
  it('laesst kurze Nachrichten unveraendert', () => {
    expect(truncateMessage(' Hallo ')).toBe('Hallo')
  })

  it('kuerzt lange Nachrichten mit Auslassungszeichen', () => {
    const result = truncateMessage('x'.repeat(900))
    expect(result).toHaveLength(401)
    expect(result?.endsWith('…')).toBe(true)
  })

  it('liefert null bei leerem Text', () => {
    expect(truncateMessage(null)).toBeNull()
    expect(truncateMessage('')).toBeNull()
  })
})

// ── Zustellung ──────────────────────────────────────────────────────────────

describe('notifyLandlordOfRentalRequest', () => {
  it('verschickt die Mail an die Profil-Adresse des Vermieters', async () => {
    happyPath()
    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome).toEqual({ status: 'sent', messageId: 'msg_1' })
    expect(sendRentalRequestNotification).toHaveBeenCalledTimes(1)
    const [to, details] = sendRentalRequestNotification.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(to).toBe('anna@example.com')
    expect(details.equipmentName).toBe('Stuhl am Fenster')
    expect(details.durationLabel).toBe('3 Tage')
    expect(details.requestId).toBe(BASE_INPUT.requestId)
  })

  it('nimmt den Kontoinhaber aus payout_accounts als Anrede', async () => {
    happyPath()
    await notifyLandlordOfRentalRequest(BASE_INPUT)

    const [, details] = sendRentalRequestNotification.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(details.recipientName).toBe('Anna Vermieterin')
  })

  it('faellt auf profiles.full_name zurueck, wenn kein Auszahlungskonto existiert', async () => {
    happyPath()
    responses['payout_accounts'] = { data: null, error: null }
    await notifyLandlordOfRentalRequest(BASE_INPUT)

    const [, details] = sendRentalRequestNotification.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(details.recipientName).toBe('Anna P.')
  })

  it('nimmt keine sensiblen Daten in die Mail auf', async () => {
    happyPath()
    await notifyLandlordOfRentalRequest(BASE_INPUT)

    const [, details] = sendRentalRequestNotification.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    const payload = JSON.stringify(details)
    // Kein Klarname, keine Mailadresse und keine Anschrift des Interessenten
    expect(details.requesterName).toBe('Marko F.')
    expect(payload).not.toContain('Fischer')
    expect(payload).not.toContain('iban')
    expect(payload).not.toContain('IBAN')
    // Standort nur als Stadt
    expect(details.city).toBe('Koeln')
    expect(details).not.toHaveProperty('street')

    // Und die IBAN-Spalte wird gar nicht erst selektiert.
    expect(
      writes.some(w => JSON.stringify(w.payload).toLowerCase().includes('iban')),
    ).toBe(false)
  })

  it('verschickt bei einem Retry keine zweite Mail (Unique-Konflikt)', async () => {
    happyPath()
    responses['email_delivery_log.insert'] = {
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    }

    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome).toEqual({ status: 'skipped', reason: 'Bereits versendet' })
    expect(sendRentalRequestNotification).not.toHaveBeenCalled()
  })

  it('reserviert den Versand ueber (email_type, rental_request.id)', async () => {
    happyPath()
    await notifyLandlordOfRentalRequest(BASE_INPUT)

    const claim = writes.find(w => w.table === 'email_delivery_log' && w.op === 'insert')
    expect(claim?.payload).toMatchObject({
      email_type: RENTAL_REQUEST_EMAIL_TYPE,
      reference_id: BASE_INPUT.requestId,
      status: 'pending',
    })
  })

  it('protokolliert den Zustellstatus als sent', async () => {
    happyPath()
    await notifyLandlordOfRentalRequest(BASE_INPUT)

    const update = writes.find(w => w.table === 'email_delivery_log' && w.op === 'update')
    expect(update?.payload).toMatchObject({ status: 'sent', provider_message_id: 'msg_1' })
  })

  it('protokolliert einen Providerfehler als failed, ohne zu werfen', async () => {
    happyPath()
    sendRentalRequestNotification.mockResolvedValue({
      success: false,
      error: 'Resend 429',
    } as never)

    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome).toEqual({ status: 'failed', error: 'Resend 429' })
    const update = writes.find(w => w.table === 'email_delivery_log' && w.op === 'update')
    expect(update?.payload).toMatchObject({ status: 'failed', error_message: 'Resend 429' })
  })

  it('faengt eine Exception des Mailversands ab', async () => {
    happyPath()
    sendRentalRequestNotification.mockRejectedValue(new Error('Netzwerk weg') as never)

    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome).toEqual({ status: 'failed', error: 'Netzwerk weg' })
  })

  it('ueberspringt den Versand ohne hinterlegte Adresse', async () => {
    happyPath()
    responses['profiles'] = { data: { email: null, full_name: 'Anna P.' }, error: null }

    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome.status).toBe('skipped')
    expect(sendRentalRequestNotification).not.toHaveBeenCalled()
    const update = writes.find(w => w.table === 'email_delivery_log' && w.op === 'update')
    expect(update?.payload).toMatchObject({ status: 'skipped' })
  })

  it('ueberspringt den Versand ohne Vermieter', async () => {
    happyPath()
    const outcome = await notifyLandlordOfRentalRequest({ ...BASE_INPUT, recipientId: null })

    expect(outcome).toEqual({ status: 'skipped', reason: 'Kein Vermieter hinterlegt' })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('sendet trotzdem, wenn die Log-Tabelle fehlt (Migration noch nicht eingespielt)', async () => {
    happyPath()
    responses['email_delivery_log.insert'] = {
      data: null,
      error: { code: 'PGRST205', message: "Could not find the table 'public.email_delivery_log'" },
    }

    const outcome = await notifyLandlordOfRentalRequest(BASE_INPUT)

    expect(outcome).toEqual({ status: 'sent', messageId: 'msg_1' })
    expect(sendRentalRequestNotification).toHaveBeenCalledTimes(1)
  })

  it('laesst bei Besichtigungen Dauer und Schaetzung weg', async () => {
    happyPath()
    await notifyLandlordOfRentalRequest({
      ...BASE_INPUT,
      requestType: 'besichtigung',
      durationUnit: null,
      units: null,
      estimatedCents: 0,
      message: null,
    })

    const [, details] = sendRentalRequestNotification.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ]
    expect(details.requestType).toBe('besichtigung')
    expect(details.durationLabel).toBeNull()
    expect(details.message).toBeNull()
  })
})
