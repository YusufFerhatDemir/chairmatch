'use client'

import { useCart } from './CartProvider'
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useState } from 'react'

export function CartDrawer() {
  const { items, isOpen, setIsOpen, totalCents, removeItem, updateQuantity, loading } = useCart()
  const [checkingOut, setCheckingOut] = useState(false)

  if (!isOpen) return null

  const shippingCents = totalCents >= 5000 ? 0 : 499
  const grandTotal = totalCents + shippingCents

  async function handleCheckout() {
    setCheckingOut(true)
    try {
      // Step 1: create order
      const name = prompt('Liefername:')
      const street = prompt('Straße + Nr:')
      const city = prompt('Stadt:')
      const postalCode = prompt('PLZ:')
      if (!name || !street || !city || !postalCode) {
        setCheckingOut(false)
        return
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, street, city, postalCode }),
      })
      if (!orderRes.ok) throw new Error('Order fehlgeschlagen')
      const order = await orderRes.json()

      // Step 2: Stripe checkout
      const stripeRes = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'product_order', orderId: order.id }),
      })
      if (!stripeRes.ok) throw new Error('Checkout fehlgeschlagen')
      const { url } = await stripeRes.json()
      if (url) window.location.href = url
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Fehler beim Checkout')
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
          <button onClick={() => setIsOpen(false)} className="text-white/60 hover:text-white">
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
              const price = variant?.price_cents || product?.price_cents || 0
              const image = product?.images?.[0]?.url

              return (
                <div key={item.id} className="flex gap-3 bg-white/5 rounded-xl p-3">
                  {image && (
                    <img src={image} alt={product?.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{product?.name}</p>
                    {variant && <p className="text-white/50 text-xs">{variant.name}</p>}
                    <p className="text-[#c8a84b] text-sm font-semibold mt-1">
                      {(price / 100).toFixed(2)} €
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        disabled={loading}
                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-white text-sm w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={loading}
                        className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
                      >
                        <Plus size={14} />
                      </button>
                      <button
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
