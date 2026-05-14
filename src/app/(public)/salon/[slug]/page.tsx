export const revalidate = 300 // ISR: 5 Minuten

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import SalonDetailClient from '@/components/SalonDetailClient'
import { PROVS } from '@/lib/demo-data'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params

  const demo = PROVS.find(p => p.id === slug)
  if (demo) {
    const title = `${demo.nm} — ${demo.cat} in ${demo.city} buchen`
    const description = `${demo.tl}. ★ ${demo.rt} aus ${demo.rc} Bewertungen. Jetzt online Termin buchen bei ${demo.nm} in ${demo.city} — ohne Telefonstress, 24/7 verfügbar.`
    return {
      title,
      description,
      keywords: [demo.cat, demo.nm, demo.city, 'Termin buchen', 'Beauty', 'Friseur', 'ChairMatch'].join(', '),
      alternates: { canonical: `https://chairmatch.de/salon/${slug}` },
      openGraph: {
        title: `${demo.nm} — Termin buchen | ChairMatch`,
        description: `${demo.tl}. ★ ${demo.rt} Bewertung. ${demo.city}.`,
        url: `https://chairmatch.de/salon/${slug}`,
        type: 'website',
        locale: 'de_DE',
        siteName: 'ChairMatch',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${demo.nm} — ${demo.city}`,
        description,
      },
    }
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: salon } = await supabase
      .from('salons')
      .select('name, description, city, category, avg_rating, review_count, street, postal_code')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    if (salon) {
      const cat = String(salon.category || 'Salon')
      const title = `${salon.name} — ${cat} in ${salon.city || 'Deutschland'} buchen`
      const description = `${salon.description || `${salon.name} in ${salon.city || 'Deutschland'}`}. ★ ${salon.avg_rating ?? 'neu'} ${salon.review_count ? `aus ${salon.review_count} Bewertungen` : ''}. Jetzt online Termin buchen — ohne Telefonstress, 24/7 verfügbar.`
      return {
        title,
        description,
        keywords: [cat, salon.name, salon.city, 'Termin buchen', 'Beauty', 'ChairMatch'].filter(Boolean).join(', '),
        alternates: { canonical: `https://chairmatch.de/salon/${slug}` },
        openGraph: {
          title: `${salon.name} — Termin buchen | ChairMatch`,
          description: `${salon.description || salon.name}. ★ ${salon.avg_rating} Bewertung.`,
          url: `https://chairmatch.de/salon/${slug}`,
          type: 'website',
          locale: 'de_DE',
          siteName: 'ChairMatch',
        },
        twitter: {
          card: 'summary_large_image',
          title: `${salon.name} — ${salon.city || 'Deutschland'}`,
          description,
        },
      }
    }
  } catch {}

  return { title: 'Salon — ChairMatch' }
}

export default async function SalonDetailPage({ params }: Props) {
  const { slug } = await params

  // Check if this is a demo provider ID (p1, p2, etc.)
  const demoProvider = PROVS.find(p => p.id === slug)

  if (demoProvider) {
    // Render from demo data
    const salonData = {
      id: demoProvider.id,
      name: demoProvider.nm,
      slug: demoProvider.id,
      description: demoProvider.tl,
      category: demoProvider.cat,
      city: demoProvider.city,
      street: demoProvider.st,
      avg_rating: demoProvider.rt,
      review_count: demoProvider.rc,
      is_verified: demoProvider.ver,
      subscription_tier: demoProvider.tier,
      tagline: demoProvider.tl,
      tags: demoProvider.tags,
      phone: null,
      opening_hours: {
        mo: { open: '09:00', close: '18:00' },
        di: { open: '09:00', close: '18:00' },
        mi: { open: '09:00', close: '18:00' },
        do: { open: '09:00', close: '20:00' },
        fr: { open: '09:00', close: '18:00' },
        sa: { open: '10:00', close: '16:00' },
        so: null,
      },
    }

    const services = demoProvider.svs.map(s => ({
      id: s.id, name: s.nm, duration_minutes: s.dur, price_cents: s.pr * 100,
    }))

    const reviews = demoProvider.revs.map((r, i) => ({
      id: `dr${i}`, rating: r.s, comment: r.t, reply: null,
      customer: { full_name: r.u }, created_at: r.d,
    }))

    const rentals = demoProvider.rental.map((r, i) => ({
      id: `rl${i}`, type: r.type,
      name: r.type === 'stuhl' ? 'Stuhl' : r.type === 'liege' ? 'Liege' : r.type === 'opraum' ? 'OP-Raum' : 'Raum',
      price_per_day_cents: r.pr * 100, description: null,
    }))

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: demoProvider.nm,
      description: demoProvider.tl,
      address: { '@type': 'PostalAddress', streetAddress: demoProvider.st, addressLocality: demoProvider.city, addressCountry: 'DE' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: demoProvider.rt, reviewCount: demoProvider.rc, bestRating: 5 },
      url: `https://chairmatch.de/salon/${slug}`,
    }

    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <SalonDetailClient salon={salonData} services={services} staff={[]} reviews={reviews} rentals={rentals} />
      </>
    )
  }

  // Otherwise try DB
  try {
    const supabase = getSupabaseAdmin()

    let salon = null
    const { data: bySlug } = await supabase
      .from('salons')
      .select('*')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()
    if (bySlug) {
      salon = bySlug
    } else {
      const { data: byId } = await supabase
        .from('salons')
        .select('*')
        .eq('id', slug)
        .limit(1)
        .maybeSingle()
      salon = byId
    }

    if (!salon) notFound()

    const [servicesRes, reviewsRes, staffRes, rentalsRes, imagesRes] = await Promise.all([
      supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('reviews').select('*, customer:profiles(full_name)').eq('salon_id', salon.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('staff').select('*').eq('salon_id', salon.id).eq('is_active', true),
      supabase.from('rental_equipment').select('*').eq('salon_id', salon.id).eq('is_available', true),
      supabase.from('salon_images').select('id, image_type, url, sort_order').eq('salon_id', salon.id).order('sort_order', { ascending: true, nullsFirst: false }),
    ])

    // Bilder nach Typ gruppieren
    const allImages = (imagesRes.data || []) as Array<{ id: string; image_type: string; url: string }>
    const logoUrl = allImages.find((i) => i.image_type === 'logo')?.url ?? null
    const coverUrl = allImages.find((i) => i.image_type === 'cover')?.url ?? null
    const galleryUrls = allImages.filter((i) => i.image_type === 'gallery').map((i) => i.url)

    const salonData = {
      id: salon.id,
      name: salon.name,
      slug: salon.slug,
      description: salon.description,
      category: salon.category || 'barber',
      city: salon.city,
      street: salon.street,
      avg_rating: salon.avg_rating,
      review_count: salon.review_count,
      is_verified: salon.is_verified,
      subscription_tier: salon.subscription_tier || 'starter',
      tagline: salon.description || '',
      tags: [] as string[],
      phone: salon.phone,
      opening_hours: salon.opening_hours as Record<string, { open: string; close: string } | null> | null,
    }

    const dbJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BeautySalon',
      name: salon.name,
      description: salon.description || '',
      address: { '@type': 'PostalAddress', streetAddress: salon.street || '', addressLocality: salon.city || '', addressCountry: 'DE' },
      aggregateRating: salon.review_count > 0 ? { '@type': 'AggregateRating', ratingValue: salon.avg_rating, reviewCount: salon.review_count, bestRating: 5 } : undefined,
      telephone: salon.phone || undefined,
      url: `https://chairmatch.de/salon/${salon.slug || salon.id}`,
      logo: logoUrl || undefined,
      image: coverUrl ? [coverUrl, ...galleryUrls.slice(0, 5)] : (galleryUrls.length > 0 ? galleryUrls.slice(0, 6) : undefined),
    }

    return (
      <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dbJsonLd) }} />
      <SalonDetailClient
        salon={{ ...salonData, logo_url: logoUrl, cover_url: coverUrl, gallery_urls: galleryUrls }}
        services={(servicesRes.data || []).map(s => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price_cents: s.price_cents }))}
        staff={(staffRes.data || []).map(m => ({ id: m.id, name: m.name, title: m.title, avatar_url: m.avatar_url }))}
        reviews={(reviewsRes.data || []).map(r => ({ id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, customer: r.customer, created_at: r.created_at }))}
        rentals={(rentalsRes.data || []).map(r => ({ id: r.id, type: r.type, name: r.name, price_per_day_cents: r.price_per_day_cents, description: r.description }))}
      />
      </>
    )
  } catch {
    notFound()
  }
}
