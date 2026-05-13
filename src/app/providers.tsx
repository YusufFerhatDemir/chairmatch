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
      {/*
        M3-Fix: Session-Polling drosseln.
        - refetchInterval=0: kein periodisches Polling (das war alle 60s default).
        - refetchOnWindowFocus=false: Mobile-Tab-Wechsel löst KEIN Session-Refetch aus,
          das sonst auf langsamem Netz wie "App hängt" wirkt.
        - refetchWhenOffline=false: keine sinnlosen Requests wenn offline.
        Session-Cookie wird vom Server bei jeder Seitennavigation eh validiert,
        also kein Sicherheitsverlust.
      */}
      <SessionProvider refetchInterval={0} refetchOnWindowFocus={false} refetchWhenOffline={false}>
        <CartProvider>
          {children}
          <CartDrawer />
          <CartButton />
        </CartProvider>
      </SessionProvider>
    </I18nProvider>
  )
}
