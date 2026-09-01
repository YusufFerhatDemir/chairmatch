'use client'

import { useCart } from './CartProvider'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'

/**
 * Die Lieferadresse — die vier Felder, die `POST /api/orders` mit zod prueft
 * (`shippingSchema`: Name ≥ 2, Strasse ≥ 3, Ort ≥ 2, PLZ ≥ 3).
 */
interface Lieferadresse {
  name: string
  street: string
  city: string
  postalCode: string
}

const LEERE_ADRESSE: Lieferadresse = { name: '', street: '', city: '', postalCode: '' }

const FELDER: Array<{ key: keyof Lieferadresse; label: string; autoComplete: string; inputMode?: 'text' | 'numeric' }> = [
  { key: 'name', label: 'Name', autoComplete: 'name' },
  { key: 'street', label: 'Straße + Nr.', autoComplete: 'street-address' },
  { key: 'postalCode', label: 'PLZ', autoComplete: 'postal-code', inputMode: 'numeric' },
  { key: 'city', label: 'Ort', autoComplete: 'address-level2' },
]

export function CartDrawer() {
  const { items, isOpen, setIsOpen, totalCents, removeItem, updateQuantity, loading } = useCart()
  const [checkingOut, setCheckingOut] = useState(false)
  /**
   * Adresse und Fehler stehen jetzt im Drawer.
   *
   * WAS HIER STAND: vier `prompt()`-Dialoge hintereinander („Liefername:",
   * „Straße + Nr:", „Stadt:", „PLZ:") und ein `alert()` fuer jeden Fehler.
   *
   * Das ist keine Kosmetik. Ein `prompt()` hat kein Zurueck — wer sich im
   * dritten Feld vertippt, faengt von vorn an; es kennt keine Vorschlaege des
   * Browsers (`autocomplete`), keine Tastatur fuer Zahlen, und Safari sowie
   * mehrere mobile Browser unterdruecken es nach dem ersten Dialog oder ganz.
   * Auf genau der Strecke, auf der anschliessend Geld fliesst, hing die
   * Bestellung damit an einem Dialogfeld, das der Browser abschalten darf.
   *
   * Dazu warf der Aufruf die Auskunft des Servers weg: `/api/orders` antwortet
   * bei einer unvollstaendigen Adresse mit 400 und einem `details`-Objekt je
   * Feld, hier stand `throw new Error('Order fehlgeschlagen')`.
   */
  const [adresse, setAdresse] = useState<Lieferadresse>(LEERE_ADRESSE)
  const [feldFehler, setFeldFehler] = useState<Partial<Record<keyof Lieferadresse, string>>>({})
  const [fehler, setFehler] = useState<string | null>(null)

  if (!isOpen) return null

  const shippingCents = totalCents >= 5000 ? 0 : 499
  const grandTotal = totalCents + shippingCents

  function setzeFeld(key: keyof Lieferadresse, wert: string) {
    setAdresse(a => ({ ...a, [key]: wert }))
    setFeldFehler(f => (f[key] ? { ...f, [key]: undefined } : f))
  }

  /** Dieselben Mindestlaengen wie `shippingSchema` — nur frueher gemeldet. */
  function pruefeLokal(a: Lieferadresse): Partial<Record<keyof Lieferadresse, string>> {
    const f: Partial<Record<keyof Lieferadresse, string>> = {}
    if (a.name.trim().length < 2) f.name = 'Bitte Namen angeben.'
    if (a.street.trim().length < 3) f.street = 'Bitte Straße und Hausnummer angeben.'
    if (a.postalCode.trim().length < 3) f.postalCode = 'Bitte PLZ angeben.'
    if (a.city.trim().length < 2) f.city = 'Bitte Ort angeben.'
    return f
  }

  async function handleCheckout() {
    setFehler(null)

    const lokal = pruefeLokal(adresse)
    if (Object.keys(lokal).length > 0) {
      setFeldFehler(lokal)
      return
    }

    setCheckingOut(true)
    try {
      // Schritt 1: Bestellung anlegen
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: adresse.name.trim(),
          street: adresse.street.trim(),
          city: adresse.city.trim(),
          postalCode: adresse.postalCode.trim(),
        }),
      })

      if (!orderRes.ok) {
        // Die Route sagt genau, was fehlt — das gehoert an die Felder.
        const body = await orderRes.json().catch(() => null)
        const details = body?.details as Record<string, string[]> | undefined
        if (details) {
          const uebernommen: Partial<Record<keyof Lieferadresse, string>> = {}
          for (const key of ['name', 'street', 'city', 'postalCode'] as const) {
            const m = details[key]?.[0]
            if (m) uebernommen[key] = m
          }
          setFeldFehler(uebernommen)
        }
        setFehler(
          typeof body?.error === 'string'
            ? body.error
            : 'Die Bestellung konnte nicht angelegt werden.',
        )
        return
      }

      const order = await orderRes.json()

      // Schritt 2: Stripe-Checkout
      const stripeRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product_order', orderId: order.id }),
      })

      if (!stripeRes.ok) {
        // 503 heisst seit Track 24: Stripe ist hier nicht eingerichtet. Der
        // Text der Route sagt das, und er ist besser als jeder eigene.
        const body = await stripeRes.json().catch(() => null)
        setFehler(
          typeof body?.error === 'string'
            ? body.error
            : 'Die Bezahlung konnte nicht gestartet werden. Deine Bestellung ist angelegt.',
        )
        return
      }

      const { url } = await stripeRes.json()
      if (url) {
        window.location.href = url
        return
      }
      setFehler('Die Bezahlseite konnte nicht geöffnet werden. Deine Bestellung ist angelegt.')
    } catch {
      setFehler('Verbindungsfehler. Bitte erneut versuchen.')
    } finally {
      setCheckingOut(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#1a1a2e] border-l border-white/10 z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-[#c8a84b]" />
            <h2 className="text-lg font-semibold text-white">Warenkorb</h2>
          </div>
          <button
            aria-label="Warenkorb schließen"
            onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-white/50 text-center py-8">Dein Warenkorb ist leer</p>
          ) : (
            items.map(item => {
              const product = item.products
              const variant = item.product_variants
              // `??` statt `||` — siehe CartProvider.
              const price = variant?.price_cents ?? product?.price_cents ?? 0
              const image = product?.images?.[0]?.url

              return (
                <div key={item.id} className="flex gap-3 bg-white/5 rounded-xl p-3">
                  {image && (
                    <img src={image} alt={product?.name} width={64} height={64} loading="lazy" decoding="async" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product?.name}</p>
                    {variant && <p className="text-white/50 text-xs">{variant.name}</p>}
                    <p className="text-[#c8a84b] text-sm font-semibold mt-1">
                      {(price / 100).toFixed(2)} €
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        aria-label="Menge verringern"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={loading}
                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        aria-label="Menge erhöhen"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={loading}
                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        aria-label="Artikel aus dem Warenkorb entfernen"
                        onClick={() => removeItem(item.id)}
                        disabled={loading}
                        className="ml-auto text-red-400/70 hover:text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 p-4 space-y-3">
            <div className="flex justify-between text-sm text-white/70">
              <span>Zwischensumme</span>
              <span>{(totalCents / 100).toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-white/70">
              <span>Versand</span>
              <span>{shippingCents === 0 ? 'Kostenlos' : `${(shippingCents / 100).toFixed(2)} €`}</span>
            </div>
            {shippingCents > 0 && (
              <p className="text-xs text-white/40">Kostenloser Versand ab 50 €</p>
            )}
            <div className="flex justify-between text-base font-semibold text-white pt-2 border-t border-white/10">
              <span>Gesamt</span>
              <span className="text-[#c8a84b]">{(grandTotal / 100).toFixed(2)} €</span>
            </div>

            {/* Lieferadresse — bis Track E vier prompt()-Dialoge, s. handleCheckout */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Lieferadresse
              </p>
              <div className="grid grid-cols-2 gap-2">
                {FELDER.map(feld => (
                  <div key={feld.key} className={feld.key === 'postalCode' ? '' : 'col-span-2'}>
                    <input
                      type="text"
                      value={adresse[feld.key]}
                      onChange={e => setzeFeld(feld.key, e.target.value)}
                      placeholder={feld.label}
                      aria-label={feld.label}
                      autoComplete={feld.autoComplete}
                      inputMode={feld.inputMode}
                      disabled={checkingOut}
                      className={`w-full px-3 py-2 rounded-lg bg-white/5 text-sm text-white placeholder-white/35 border outline-none focus:border-[#c8a84b] disabled:opacity-50 ${
                        feldFehler[feld.key] ? 'border-red-400/60' : 'border-white/10'
                      }`}
                    />
                    {feldFehler[feld.key] && (
                      <p className="mt-1 text-[11px] text-red-400">{feldFehler[feld.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {fehler && (
              <p
                role="alert"
                className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-400/30 text-xs text-red-300 leading-relaxed"
              >
                {fehler}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={checkingOut || loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#c8a84b] to-[#e8d06a] text-[#1a1a2e] font-semibold text-sm hover:opacity-90 transition disabled:opacity-50"
            >
              {checkingOut ? 'Wird verarbeitet...' : 'Zur Kasse'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
