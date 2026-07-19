export const revalidate = 3600 // ISR statt force-dynamic — Marketing-Seite, 1h Cache

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
  // Medical-Beauty-Kategorien: standen in der Sitemap, hatten hier aber keine
  // Meta-Daten — Google sah generische Fallback-Titel ohne Inhalt und wertete
  // z.B. /category/augenlasern als Soft 404.
  haartransplantation: { title: 'Haartransplantation — Klinik finden', desc: 'Verifizierte Kliniken für Haartransplantation in Deutschland vergleichen und beraten lassen. FUE, DHI und Saphir-Methode.' },
  zahnimplantate: { title: 'Zahnimplantate — Praxis finden', desc: 'Spezialisierte Zahnarztpraxen für Implantate in Deutschland finden. Beratung und Termin online buchen.' },
  augenlasern: { title: 'Augenlasern — Klinik finden', desc: 'Augenkliniken für LASIK, Femto-LASIK und ReLEx SMILE in Deutschland vergleichen und Beratungstermin buchen.' },
  longevity: { title: 'Longevity & Präventionsmedizin', desc: 'Longevity-Praxen und Präventionsmedizin in Deutschland entdecken: Diagnostik, Biohacking, ganzheitliche Vorsorge.' },
  infusion: { title: 'IV-Infusionen buchen', desc: 'Vitamin- und NAD+-Infusionen bei geprüften Anbietern in Deutschland. Jetzt Termin für IV-Therapie buchen.' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoryId } = await params
  const meta = categoryMeta[categoryId]

  // Phantom-Slugs bereits in der Metadata-Phase abbrechen: nur hier liefert
  // notFound() noch einen echten HTTP-404-Status. Im Seiten-Body hat das
  // Streaming (loading.tsx) schon begonnen — dort käme nur noch 200 +
  // noindex-Meta beim Crawler an. notFound() bewusst AUSSERHALB des try:
  // es wirft intern und würde sonst vom eigenen catch verschluckt.
  if (!meta) {
    let dbChecked = false
    let dbHasCategory = false
    try {
      const supabase = getSupabaseAdmin()
      const { data } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categoryId)
        .limit(1)
        .single()
      dbChecked = true
      dbHasCategory = !!data
    } catch {
      // DB nicht erreichbar — im Zweifel weiterrendern statt hart 404en
    }
    if (dbChecked && !dbHasCategory) notFound()
  }

  return {
    title: meta?.title || `${categoryId} — Termin buchen`,
    description: meta?.desc || `Anbieter in der Kategorie ${categoryId} finden und Termin buchen bei ChairMatch.`,
    // Selbst-Canonical: indexierbare Kategorie-Seiten ohne Canonical riskieren
    // Duplicate-Content (www/non-www, Query-Parameter-Varianten)
    alternates: { canonical: `https://www.chairmatch.de/category/${categoryId}` },
    openGraph: {
      title: `${meta?.title || categoryId} | ChairMatch`,
      description: meta?.desc || `Anbieter in der Kategorie ${categoryId} finden.`,
      url: `https://www.chairmatch.de/category/${categoryId}`,
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

  // Unbekannte Slugs (weder kuratierte Kategorie noch DB-Kategorie) → echter
  // 404 statt 200 mit leerer Seite. Vorher beantwortete /category/<beliebig>
  // jede Phantom-URL mit Status 200 — unbegrenzte Soft-404-Fläche für Google.
  if (!categoryMeta[categoryId] && !category) notFound()

  return <CategoryClient categoryId={categoryId} category={category} dbSalons={salons} />
}
