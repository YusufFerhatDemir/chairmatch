export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import CategoryClient from './CategoryClient'

interface Props {
  params: Promise<{ categoryId: string }>
}

const categoryMeta: Record<string, { title: string; desc: string }> = {
  barber: { title: 'Barbershop Termin buchen', desc: 'Finde die besten Barbershops in Deutschland. Herrenschnitt, Fade, Bart-Design. Jetzt Termin buchen.' },
  friseur: { title: 'Friseur Termin buchen', desc: 'Top-Friseure in deiner Nähe. Schnitt, Farbe, Styling. Online Termin buchen bei ChairMatch.' },
  kosmetik: { title: 'Kosmetikstudio buchen', desc: 'Facial, Peeling, Laserbehandlung. Die besten Kosmetikstudios in Deutschland finden und buchen.' },
  aesthetik: { title: 'Ästhetik & Beauty Behandlungen', desc: 'Botox, Filler, Anti-Aging. Premium Ästhetik-Behandlungen bei verifizierten Anbietern buchen.' },
  nail: { title: 'Nagelstudio Termin buchen', desc: 'Gel-Nägel, Nail Art, Maniküre. Die besten Nagelstudios in ganz Deutschland entdecken.' },
  massage: { title: 'Massage Termin buchen', desc: 'Klassische Massage, Thai, Hot Stone. Entspannung buchen bei Top-Masseuren in Deutschland.' },
  lash: { title: 'Lash & Brows Termin buchen', desc: 'Wimpernverlängerung, Lifting, Brow Design. Jetzt Termin bei Lash-Experten buchen.' },
  arzt: { title: 'Arzt & Klinik Termin buchen', desc: 'Dermatologie, Laserbehandlung, ärztliche Behandlungen. Online Termin buchen.' },
  opraum: { title: 'OP-Raum mieten', desc: 'Sterile OP-Räume tageweise mieten. Für Chirurgen, Ärzte und Praxen in ganz Deutschland.' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId } = await params
  const meta = categoryMeta[categoryId]

  return {
    title: meta?.title || `${categoryId} — Termin buchen`,
    description: meta?.desc || `Anbieter in der Kategorie ${categoryId} finden und Termin buchen bei ChairMatch.`,
    openGraph: {
      title: `${meta?.title || categoryId} | ChairMatch`,
      description: meta?.desc || `Anbieter in der Kategorie ${categoryId} finden.`,
      url: `https://chairmatch.de/category/${categoryId}`,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { categoryId } = await params

  let category: { id: string; slug: string; label: string; description: string | null } | null = null
  let salons: {
    id: string
    name: string
    slug: string | null
    description: string | null
    city: string | null
    avg_rating: number
    is_verified: boolean
    review_count: number
    subscription_tier: string
    services: { id: string; name: string; sort_order: number }[]
  }[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: cat } = await supabase
      .from('categories')
      .select('id, slug, label, description')
      .eq('slug', categoryId)
      .limit(1)
      .single()

    if (cat) category = cat

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, avg_rating, is_verified, review_count, subscription_tier, services(id, name, sort_order)')
      .eq('category', categoryId)
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as typeof salons
  } catch {
    // DB connection failed
  }

  return <CategoryClient categoryId={categoryId} category={category} dbSalons={salons} />
}
