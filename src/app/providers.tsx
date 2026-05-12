'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'
import { CartProvider } from '@/components/cart/CartProvider'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CartButton } from '@/components/cart/CartButton'
import { I18nProvider } from '@/i18n/client'
import type { Locale } from '@/i18n/config'

export function Providers({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <SessionProvider>
        <CartProvider>
          {children}
          <CartDrawer />
          <CartButton />
        </CartProvider>
      </SessionProvider>
    </I18nProvider>
  )
}
