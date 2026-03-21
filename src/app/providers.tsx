'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { CartProvider } from '@/components/cart/CartProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CartButton } from '@/components/cart/CartButton'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        {children}
        <CartDrawer />
        <CartButton />
      </CartProvider>
    </SessionProvider>
  )
}
