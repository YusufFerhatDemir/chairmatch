export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import SalonDetailClient from '@/components/SalonDetailClient'
import { PROVS } from '@/lib/demo-data'

interface Props {
  params: Promise<{ slug: string }>
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

    return <SalonDetailClient salon={salonData} services={services} staff={[]} reviews={reviews} rentals={rentals} />
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

    const [servicesRes, reviewsRes, staffRes, rentalsRes] = await Promise.all([
      supabase.from('services').select('*').eq('salon_id', salon.id).eq('is_active', true).order('sort_order', { ascending: true }),
      supabase.from('reviews').select('*, customer:profiles(full_name)').eq('salon_id', salon.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('staff').select('*').eq('salon_id', salon.id).eq('is_active', true),
      supabase.from('rental_equipment').select('*').eq('salon_id', salon.id).eq('is_available', true),
    ])

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

    return (
      <SalonDetailClient
        salon={salonData}
        services={(servicesRes.data || []).map(s => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes, price_cents: s.price_cents }))}
        staff={(staffRes.data || []).map(m => ({ id: m.id, name: m.name, title: m.title, avatar_url: m.avatar_url }))}
        reviews={(reviewsRes.data || []).map(r => ({ id: r.id, rating: r.rating, comment: r.comment, reply: r.reply, customer: r.customer, created_at: r.created_at }))}
        rentals={(rentalsRes.data || []).map(r => ({ id: r.id, type: r.type, name: r.name, price_per_day_cents: r.price_per_day_cents, description: r.description }))}
      />
    )
  } catch {
    notFound()
  }
}
