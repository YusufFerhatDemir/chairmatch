export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'

interface Category {
  id: string
  slug: string
  label: string
  description: string | null
  icon_url: string | null
  sort_order: number
  is_active: boolean
}

interface Salon {
  id: string
  name: string
  slug: string | null
  description: string | null
  city: string | null
  logo_url: string | null
  avg_rating: number
  is_verified: boolean
  services: { id: string; name: string }[]
}

export default async function HomePage() {
  let categories: Category[] = []
  let salons: Salon[] = []

  try {
    const supabase = getSupabaseAdmin()

    const { data: cats } = await supabase
      .from('categories')
      .select('id, slug, label, description, icon_url, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (cats) categories = cats

    const { data: salonData } = await supabase
      .from('salons')
      .select('id, name, slug, description, city, logo_url, avg_rating, is_verified, services(id, name)')
      .eq('is_active', true)
      .order('avg_rating', { ascending: false })
      .limit(20)

    if (salonData) salons = salonData as unknown as Salon[]
  } catch {
    // DB connection failed — render empty state
  }

  return (
    <div className="shell">
      <div className="screen">
        {/* Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 10px' }}>
          <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo_lockup_512x384.png" alt="ChairMatch" style={{ height: 140, objectFit: 'contain' }} />
          </div>
        </div>

        {/* Categories Grid */}
        <section style={{ padding: '0 var(--pad)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {categories.map((cat) => (
              <a key={cat.id} href={`/category/${cat.slug}`} style={{ textDecoration: 'none' }}>
                <div className="catcard">
                  <div className="caticon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={cat.icon_url || `/icons/${getCategoryIcon(cat.slug)}`}
                      alt={cat.label}
                    />
                  </div>
                  <div className="catlbl">{cat.label}</div>
                  <div className="catsub">{cat.description || ''}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Salons List */}
        <section style={{ padding: '24px var(--pad) 0' }}>
          <h2 className="cinzel" style={{ fontSize: 'var(--font-lg)', color: 'var(--gold2)', marginBottom: 16 }}>
            Top Salons
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {salons.map((s) => (
              <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: 'var(--c3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 700, color: 'var(--cream)',
                    flexShrink: 0,
                  }}>
                    {s.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.logo_url} alt={s.name} style={{ width: 56, height: 56, borderRadius: 14, objectFit: 'cover' }} />
                    ) : s.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', color: 'var(--cream)' }}>{s.name}</div>
                    <div style={{ fontSize: 'var(--font-sm)', color: 'var(--stone)', marginTop: 2 }}>{s.description}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                      <span style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)' }}>★ {Number(s.avg_rating).toFixed(1)}</span>
                      <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>{s.city}</span>
                      {s.is_verified && <span className="badge badge-gold" style={{ fontSize: 8 }}>✓ Verifiziert</span>}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}

function getCategoryIcon(slug: string): string {
  const map: Record<string, string> = {
    barber: '01_barbershop_256x384.png',
    friseur: '02_friseur_256x384.png',
    kosmetik: '03_kosmetik_256x384.png',
    aesthetik: '04_aesthetik_256x384.png',
    nail: '05_nagelstudio_256x384.png',
    massage: '06_massage_256x384.png',
    lash: '07_lash_brows_256x384.png',
    arzt: '08_arzt_klinik_256x384.png',
    opraum: '09_op_raum_512x384.png',
  }
  return map[slug] || '01_barbershop_256x384.png'
}
