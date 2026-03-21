'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface CartItem {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number
  products?: {
    id: string
    name: string
    slug: string
    price_cents: number
    images: { url: string; alt: string }[]
    seller_id: string
    salon_id: string | null
  }
  product_variants?: {
    id: string
    name: string
    price_cents: number
  } | null
}

interface CartContextType {
  items: CartItem[]
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  itemCount: number
  totalCents: number
  addItem: (productId: string, variantId?: string | null, quantity?: number) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  refreshCart: () => Promise<void>
  loading: boolean
}

const CartContext = createContext<CartContextType | null>(null)

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const totalCents = items.reduce((sum, i) => {
    const price = i.product_variants?.price_cents || i.products?.price_cents || 0
    return sum + price * i.quantity
  }, 0)

  const refreshCart = useCallback(async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/cart')
      if (res.ok) {
        const data = await res.json()
        setItems(data)
      }
    } catch { /* ignore */ }
  }, [session?.user])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const addItem = useCallback(async (productId: string, variantId?: string | null, quantity = 1) => {
    if (!session?.user) return
    setLoading(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, variantId, quantity }),
      })
      if (res.ok) {
        await refreshCart()
        setIsOpen(true)
      }
    } finally {
      setLoading(false)
    }
  }, [session?.user, refreshCart])

  const removeItem = useCallback(async (itemId: string) => {
    setLoading(true)
    try {
      await fetch('/api/cart', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      })
      await refreshCart()
    } finally {
      setLoading(false)
    }
  }, [refreshCart])

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    setLoading(true)
    try {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, quantity }),
      })
      await refreshCart()
    } finally {
      setLoading(false)
    }
  }, [refreshCart])

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, itemCount, totalCents, addItem, removeItem, updateQuantity, refreshCart, loading }}>
      {children}
    </CartContext.Provider>
  )
}
