export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import Link from 'next/link'

interface Props {
  params: Promise<{ categoryId: string }>
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
      .select('id, name, slug, description, city, avg_rating, services(id, name, sort_order)')
      .eq('category', categoryId)
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })

    if (salonData) salons = salonData as typeof salons
  } catch {
    // DB connection failed — render empty state
  }

  return (
    <div className="shell">
      <div className="screen">
        <div className="sticky">
          <Link href="/" style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>
            &larr; Zur&uuml;ck
          </Link>
          <h1 className="cinzel" style={{ fontSize: 'var(--font-xl)', color: 'var(--gold2)', marginTop: 8 }}>
            {category?.label || categoryId}
          </h1>
          {category?.description && (
            <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginTop: 4 }}>{category.description}</p>
          )}
        </div>

        <section style={{ padding: '0 var(--pad)' }}>
          {salons.length === 0 ? (
            <p style={{ color: 'var(--stone)', padding: '40px 0', textAlign: 'center' }}>
              Keine Anbieter in dieser Kategorie gefunden.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {salons.map(s => (
                <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 14,
                      background: 'var(--c3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: 'var(--cream)', flexShrink: 0,
                    }}>
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--cream)' }}>{s.name}</div>
                      <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>{s.description}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>&star; {Number(s.avg_rating).toFixed(1)}</span>
                        <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>{s.city}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
