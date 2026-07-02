import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Als Anbieter registrieren — Salon-Platz vermieten',
  description: 'Registriere deinen Salon, Barbershop oder deine Praxis auf ChairMatch und vermiete Stühle, Kabinen oder Räume tageweise. Kostenlos starten, verifiziert gelistet.',
  alternates: { canonical: 'https://www.chairmatch.de/register/anbieter' },
  openGraph: {
    title: 'Als Anbieter registrieren — Salon-Platz vermieten | ChairMatch',
    description: 'Vermiete Stühle, Kabinen oder Räume tageweise. Kostenlos starten, verifiziert gelistet.',
    url: 'https://www.chairmatch.de/register/anbieter',
    siteName: 'ChairMatch',
    locale: 'de_DE',
    type: 'website',
  },
}

export default function RegisterAnbieterLayout({ children }: { children: React.ReactNode }) {
  return children
}
