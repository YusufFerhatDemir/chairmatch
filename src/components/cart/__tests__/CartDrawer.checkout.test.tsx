/**
 * Shop-Checkout: die Lieferadresse (Track E).
 *
 * Bis hierher fragte `handleCheckout` sie ueber vier `prompt()`-Dialoge ab —
 * „Liefername:", „Straße + Nr:", „Stadt:", „PLZ:" — und meldete jeden Fehler
 * mit `alert()`.
 *
 * Das ist keine Kosmetik: ein `prompt()` hat kein Zurueck (ein Tippfehler im
 * dritten Feld heisst von vorn anfangen), kennt keine Browser-Vorschlaege,
 * keine Zahlentastatur — und Safari sowie mehrere mobile Browser unterdruecken
 * es nach dem ersten Dialog oder ganz. Auf genau der Strecke, auf der danach
 * Geld fliesst, hing die Bestellung an einem Dialog, den der Browser
 * abschalten darf.
 *
 * Zweitens warf der Aufruf die Auskunft des Servers weg: `/api/orders`
 * antwortet bei unvollstaendiger Adresse mit 400 und einem `details`-Objekt je
 * Feld, im Code stand `throw new Error('Order fehlgeschlagen')`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const cartState = vi.hoisted(() => ({
  items: [{ id: 'ci_1', quantity: 1, products: { id: 'p1', name: 'Schere', price_cents: 6900 } }] as unknown[],
  totalCents: 6900,
}))

vi.mock('../CartProvider', () => ({
  useCart: () => ({
    items: cartState.items,
    isOpen: true,
    setIsOpen: () => {},
    totalCents: cartState.totalCents,
    removeItem: () => {},
    updateQuantity: () => {},
    loading: false,
  }),
}))

import { CartDrawer } from '../CartDrawer'

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

function fuelleAdresse(werte: Partial<Record<string, string>> = {}) {
  const standard: Record<string, string> = {
    'Name': 'Lena Sommer',
    'Straße + Nr.': 'Jungfernstieg 7',
    'PLZ': '20095',
    'Ort': 'Hamburg',
  }
  for (const [label, wert] of Object.entries({ ...standard, ...werte })) {
    fireEvent.change(screen.getByLabelText(label), { target: { value: wert } })
  }
}

describe('Die Adresse wird im Drawer erfasst, nicht in prompt()', () => {
  it('zeigt vier beschriftete Eingabefelder', () => {
    render(<CartDrawer />)
    for (const label of ['Name', 'Straße + Nr.', 'PLZ', 'Ort']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('ruft prompt() nicht mehr auf', async () => {
    const prompt = vi.spyOn(window, 'prompt')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      String(url).includes('/api/orders')
        ? antwort(200, { id: 'o_1' })
        : antwort(200, { url: 'https://checkout.stripe.com/c/pay/xyz' }),
    )

    render(<CartDrawer />)
    fuelleAdresse()
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    await waitFor(() => expect(zielUrl).toBe('https://checkout.stripe.com/c/pay/xyz'))
    expect(prompt).not.toHaveBeenCalled()
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('schickt die getrimmten Felder an /api/orders', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      String(url).includes('/api/orders')
        ? antwort(200, { id: 'o_1' })
        : antwort(200, { url: 'https://checkout.stripe.com/c/pay/xyz' }),
    )

    render(<CartDrawer />)
    fuelleAdresse({ Name: '  Lena Sommer  ' })
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const [, init] = fetchSpy.mock.calls[0]
    expect(JSON.parse(String(init?.body))).toEqual({
      name: 'Lena Sommer',
      street: 'Jungfernstieg 7',
      postalCode: '20095',
      city: 'Hamburg',
    })
  })
})

describe('Fehler stehen am Feld, nicht in einem alert()', () => {
  it('haelt eine unvollstaendige Adresse zurueck, ohne den Server zu fragen', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    render(<CartDrawer />)
    fuelleAdresse({ 'PLZ': '' })
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    expect(await screen.findByText('Bitte PLZ angeben.')).toBeInTheDocument()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uebernimmt die Feldfehler, die /api/orders zurueckmeldet', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      antwort(400, {
        error: 'Lieferadresse unvollständig',
        details: { street: ['Straße zu kurz'] },
      }),
    )

    render(<CartDrawer />)
    fuelleAdresse()
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    expect(await screen.findByText('Straße zu kurz')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Lieferadresse unvollständig')
  })

  it('zeigt den Text der Bezahlroute, statt ihn zu verschlucken', async () => {
    // 503 heisst seit Track 24: Stripe ist in dieser Umgebung nicht
    // eingerichtet. Vorher stand hier `alert('Checkout fehlgeschlagen')`.
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) =>
      String(url).includes('/api/orders')
        ? antwort(200, { id: 'o_1' })
        : antwort(503, { error: 'Zahlungen sind derzeit nicht verfügbar.' }),
    )

    render(<CartDrawer />)
    fuelleAdresse()
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Zahlungen sind derzeit nicht verfügbar.',
    )
    expect(zielUrl).toBeNull()
  })

  it('meldet einen Verbindungsfehler, statt still stehenzubleiben', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))

    render(<CartDrawer />)
    fuelleAdresse()
    fireEvent.click(screen.getByRole('button', { name: 'Zur Kasse' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Verbindungsfehler')
    // Der Knopf ist wieder bedienbar — `finally` setzt den Ladezustand zurueck.
    expect(screen.getByRole('button', { name: 'Zur Kasse' })).not.toBeDisabled()
  })
})
