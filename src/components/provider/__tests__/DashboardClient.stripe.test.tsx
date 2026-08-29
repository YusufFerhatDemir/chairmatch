/**
 * Provider-Dashboard: die beiden Stripe-Knoepfe (Track 25).
 *
 * Bis hierher taten beide nichts als ein alert():
 *
 *   'Stripe noch nicht live. Bald verfuegbar.'
 *   'Stripe-Onboarding wird vorbereitet. Demnaechst verfuegbar.'
 *
 * Die Wege dahinter waren seit Track 16 bzw. 22/24 fertig und getestet;
 * `POST /api/stripe/connect` hatte im gesamten Repository keinen Aufrufer.
 * Geprueft wird deshalb genau das, was zwischen Klick und Route liegt: der
 * richtige Endpunkt, der richtige Koerper, die Weiterleitung — und dass ein
 * Fehler der Route sichtbar wird, statt verschluckt zu werden.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DashboardClient from '../DashboardClient'
import type { DashboardResponse } from '@/modules/provider/dashboard.types'

const BASIS: DashboardResponse = {
  earnings: { today: 0, month: 0, total: 0, currency: 'EUR' },
  pending: 0,
  transactions: [],
  payoutSchedule: 'monatlich',
  stripeConnected: false,
}

/** `window.location.href = …` ist in jsdom nicht schreibbar — ersetzen. */
let zielUrl: string | null = null

beforeEach(() => {
  zielUrl = null
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      set href(v: string) { zielUrl = v },
      get href() { return zielUrl ?? '' },
    },
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function antwort(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

function zeige(data: Partial<DashboardResponse> = {}, tier: 'starter' | 'premium' | 'gold' = 'starter') {
  return render(
    <DashboardClient data={{ ...BASIS, ...data }} subscriptionTier={tier} salonName="Salon Sonnenschein" />,
  )
}

describe('Stripe-Connect-Onboarding', () => {
  it('ruft POST /api/stripe/connect und folgt der Stripe-URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(200, { url: 'https://connect.stripe.com/setup/abc' }),
    )

    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Stripe-Anbindung aktivieren/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/stripe/connect')
    expect((fetchSpy.mock.calls[0][1] as RequestInit).method).toBe('POST')
    await waitFor(() => expect(zielUrl).toBe('https://connect.stripe.com/setup/abc'))
  })

  it('zeigt den Text der Route, wenn Stripe nicht konfiguriert ist (503)', async () => {
    // Genau der Zustand der Produktion nach Track 24: stripeUnavailable()
    // antwortet 503. Vorher stand hier ein fest verdrahtetes Versprechen.
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(503, { error: 'Zahlungen sind derzeit nicht verfügbar.' }),
    )

    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Stripe-Anbindung aktivieren/i }))

    expect(await screen.findByText('Zahlungen sind derzeit nicht verfügbar.')).toBeInTheDocument()
    expect(zielUrl).toBeNull()
  })

  it('meldet ein bereits fertiges Konto, statt weiterzuleiten', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(200, { alreadyOnboarded: true, message: 'Stripe-Konto ist bereits vollständig eingerichtet.' }),
    )

    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Stripe-Anbindung aktivieren/i }))

    expect(await screen.findByText(/bereits vollständig eingerichtet/i)).toBeInTheDocument()
    expect(zielUrl).toBeNull()
  })

  it('leitet nicht ins Leere, wenn Stripe keine URL liefert', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => antwort(200, {}))

    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Stripe-Anbindung aktivieren/i }))

    expect(await screen.findByText(/keine Weiterleitung/i)).toBeInTheDocument()
    expect(zielUrl).toBeNull()
  })

  it('faengt einen Netzwerkfehler ab', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    zeige()
    fireEvent.click(screen.getByRole('button', { name: /Stripe-Anbindung aktivieren/i }))

    expect(await screen.findByText(/Verbindung zu Stripe fehlgeschlagen/i)).toBeInTheDocument()
  })

  it('zeigt das Banner nicht, wenn Stripe bereits verbunden ist', () => {
    zeige({ stripeConnected: true })
    expect(screen.queryByRole('button', { name: /Stripe-Anbindung aktivieren/i })).toBeNull()
  })
})

describe('Abo-Upgrade', () => {
  it('bucht von Free die Stufe premium', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(200, { url: 'https://checkout.stripe.com/cs_1' }),
    )

    zeige({}, 'starter')
    fireEvent.click(screen.getByRole('button', { name: /Upgrade auf Premium/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(fetchSpy.mock.calls[0][0]).toBe('/api/stripe/checkout')
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      type: 'subscription',
      tier: 'premium',
    })
  })

  it('bucht von Premium die Stufe gold', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(200, { url: 'https://checkout.stripe.com/cs_2' }),
    )

    zeige({}, 'premium')
    fireEvent.click(screen.getByRole('button', { name: /Upgrade auf Gold/i }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string).tier).toBe('gold')
  })

  it('zeigt die 409 der Route, wenn schon ein Abo laeuft', async () => {
    // Track 16 fragt dafuer Stripe selbst ab. Der Anbieter muss den Grund
    // lesen koennen — sonst klickt er weiter.
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(409, { error: 'Für dieses Konto läuft bereits ein Abo.' }),
    )

    zeige({}, 'starter')
    fireEvent.click(screen.getByRole('button', { name: /Upgrade auf Premium/i }))

    expect(await screen.findByText(/läuft bereits ein Abo/i)).toBeInTheDocument()
  })

  it('bietet auf der Gold-Stufe kein Upgrade an', () => {
    zeige({}, 'gold')
    expect(screen.queryByRole('button', { name: /Upgrade/i })).toBeNull()
  })
})

describe('Transaktions-Details', () => {
  const TX = {
    id: 'txn_0000-1111-2222',
    type: 'booking' as const,
    amountCents: 5000,
    platformFeeCents: 500,
    providerShareCents: 4500,
    currency: 'eur',
    status: 'succeeded' as const,
    createdAt: '2026-08-20T10:00:00.000Z',
  }

  it('klappt die Transaktions-ID auf, statt ein alert zu zeigen', async () => {
    // Vorher: alert('Transaktion … Noch keine Details verfuegbar.') — ein
    // Knopf, der ansagt, dass er nichts kann.
    zeige({ transactions: [TX] })

    expect(screen.queryByText(TX.id)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Details' }))

    expect(await screen.findByText(TX.id)).toBeInTheDocument()
    expect(screen.getByText('EUR')).toBeInTheDocument()
  })

  it('schliesst die Zeile wieder', async () => {
    zeige({ transactions: [TX] })

    fireEvent.click(screen.getByRole('button', { name: 'Details' }))
    expect(await screen.findByText(TX.id)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Schließen' }))
    await waitFor(() => expect(screen.queryByText(TX.id)).toBeNull())
  })
})
