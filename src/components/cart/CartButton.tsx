'use client'

import { ShoppingBag } from 'lucide-react'
import { useCart } from './CartProvider'

export function CartButton() {
  const { itemCount, setIsOpen } = useCart()

  if (itemCount === 0) return null

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed bottom-20 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-[#c8a84b] to-[#e8d06a] shadow-lg shadow-[#c8a84b]/30 flex items-center justify-center text-[#1a1a2e] hover:scale-105 transition-transform"
    >
      <ShoppingBag size={22} />
      <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
        {itemCount > 9 ? '9+' : itemCount}
      </span>
    </button>
  )
}
