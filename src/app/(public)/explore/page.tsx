export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import ExploreClient from './ExploreClient'

export const metadata: Metadata = {
  title: 'Salons, Studios & Praxen entdecken — Stuhlmiete, Termine, Beauty-Workspace | ChairMatch',
  description: 'Entdecke verifizierte Salons, Barbershops, Kosmetikstudios, Nail- und Lash-Studios in Deutschland. Tageweise Stuhlmiete, Behandlungsraum oder direkt online Termin buchen. Friseurstuhl mieten, Kosmetik-Kabine, OP-Raum — bundesweit gefiltert nach Stadt, Kategorie, Preis und Bewertung.',
  keywords: 'salons entdecken, stuhlmiete deutschland, beauty workspace, friseurstuhl mieten, kosmetik kabine mieten, barbershop finden, salonplatz, chair rental deutschland, beauty coworking, termine online buchen',
  alternates: { canonical: 'https://chairmatch.de/explore' },
  openGraph: {
    title: 'Salons & Stuhlmiete entdecken | ChairMatch',
    description: 'Bundesweit verifizierte Salons, Stuhlmiete-Angebote und Online-Termine. Filterbar nach Stadt, Kategorie und Preis.',
    url: 'https://chairmatch.de/explore',
    type: 'website',
    locale: 'de_DE',
    siteName: 'ChairMatch',
  },
}

interface Salon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  avg_rating: number
  services: { id: string; name: string }[]
}

export default async function ExplorePage() {
  let salons: Salon[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, avg_rating, services(id, name)')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as unknown as Salon[]
  } catch {
    // DB connection failed — render empty state
  }

  return <ExploreClient salons={salons} />
}
