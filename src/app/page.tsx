export const dynamic = 'force-dynamic'

import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCachedOnboardingSlides } from '@/lib/settings'
import OnboardingGate from '@/components/OnboardingGate'
import Link from 'next/link'

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
  review_count: number
  services: { id: string; name: string }[]
}

interface Offer {
  id: string
  title: string
  discount_percent: number
  salon: { id: string; name: string; slug: string | null } | null
}

export default async function HomePage() {
  let categories: Category[] = []
  let salons: Salon[] = []
  let topOffer: Offer | null = null

  const slides = await getCachedOnboardingSlides().catch(() => [])

  try {
    const supabase = getSupabaseAdmin()

    const [catsRes, salonRes, offerRes] = await Promise.all([
      supabase
        .from('categories')
        .select('id, slug, label, description, icon_url, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true }),
      supabase
        .from('salons')
        .select('id, name, slug, description, city, logo_url, avg_rating, is_verified, review_count, services(id, name)')
        .eq('is_active', true)
        .order('avg_rating', { ascending: false })
        .limit(20),
      supabase
        .from('offers')
        .select('id, title, discount_percent, salon:salons(id, name, slug)')
        .eq('is_active', true)
        .order('discount_percent', { ascending: false })
        .limit(1),
    ])

    if (catsRes.data) categories = catsRes.data
    if (salonRes.data) salons = salonRes.data as unknown as Salon[]
    if (offerRes.data?.[0]) topOffer = offerRes.data[0] as unknown as Offer
  } catch {
    // DB connection failed — render empty state
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 17 ? 'Guten Tag' : 'Guten Abend'

  const onboardingSlides = slides.map(s => ({
    id: s.id,
    title: s.title,
    subtitle: s.subtitle,
    icon: s.icon,
    imageUrl: s.imageUrl,
  }))

  return (
    <OnboardingGate slides={onboardingSlides}>
      <div className="shell">
        <div className="screen">
          {/* Logo Header + Greeting */}
          <div style={{ padding: '20px var(--pad) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexShrink: 1 }}>
              <div style={{ animation: 'logoFloat 3s ease-in-out infinite, logoGlow 3s ease-in-out infinite', display: 'inline-block', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/logo_symbol_512x512.png" width={36} height={36} alt="ChairMatch" style={{ objectFit: 'contain' }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="cinzel" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'var(--gold2)', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
                </p>
                <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--stone)', marginTop: 2 }}>DEUTSCHLAND</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--cream)' }}>{greeting}</p>
              <p style={{ fontSize: 11, color: 'var(--stone)' }}>Deutschlandweit buchen</p>
            </div>
          </div>

          {/* Promo Banner */}
          {topOffer && (
            <div style={{ margin: '14px var(--pad)' }}>
              <div className="card" style={{ padding: 18, background: 'linear-gradient(135deg, #1E1A08, #141008)' }}>
                <span className="badge badge-gold" style={{ marginBottom: 10, display: 'inline-flex' }}>
                  SONDERANGEBOT
                </span>
                <p className="cinzel" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, color: 'var(--gold2)' }}>
                  Spare bis zu {topOffer.discount_percent}%<br />auf erste Buchung
                </p>
                <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12 }}>
                  Code: CHAIR2026
                </p>
                <Link href="/offers" className="bgold" style={{ width: 'auto', padding: '11px 22px', fontSize: 13, display: 'inline-block', textDecoration: 'none' }}>
                  Jetzt buchen
                </Link>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div style={{ padding: '0 var(--pad) 14px' }}>
            <Link href="/search" style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', background: 'var(--c2)', borderRadius: 13,
                border: '1px solid rgba(200,168,75,0.1)',
              }}>
                <span>🔍</span>
                <span style={{ color: 'var(--stone2)', fontSize: 14 }}>Stadt, Name, Service...</span>
              </div>
            </Link>
          </div>

          {/* Categories Grid */}
          <section style={{ padding: '0 var(--pad)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase' }}>
                Kategorien
              </p>
              <Link href="/explore" style={{ fontSize: 12, color: 'var(--gold)', textDecoration: 'none' }}>Alle</Link>
            </div>
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

          {/* Top Salons */}
          <section style={{ padding: '24px var(--pad) 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase' }}>
                Alle Anbieter
              </p>
              <span style={{ fontSize: 12, color: 'var(--stone)' }}>{salons.length} gefunden</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {salons.map((s) => (
                <a key={s.id} href={`/salon/${s.slug || s.id}`} style={{ textDecoration: 'none' }}>
                  <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '13px 15px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 7 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 5 }}>
                            {Number(s.avg_rating) >= 4.8 && (
                              <span className="badge badge-gold" style={{ fontSize: 9, padding: '3px 8px' }}>⚡ Top</span>
                            )}
                            {s.is_verified && (
                              <span className="badge badge-green" style={{ fontSize: 9, padding: '3px 8px' }}>✓ Verifiziert</span>
                            )}
                          </div>
                          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--cream)' }}>{s.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--stone)' }}>{s.city}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            {[1, 2, 3, 4, 5].map(i => (
                              <span key={i} style={{ opacity: i <= Math.round(Number(s.avg_rating)) ? 1 : 0.3, color: '#E8C86A', fontSize: 12 }}>★</span>
                            ))}
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold2)' }}>{Number(s.avg_rating).toFixed(1)}</span>
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--stone)' }}>({s.review_count || 0})</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4A8A5A' }} />
                          <span style={{ fontSize: 11, color: '#6ABF80' }}>Verfügbar</span>
                        </div>
                        {s.services?.[0] && (
                          <span style={{ fontSize: 12, color: 'var(--stone)' }}>{s.services.length} Services</span>
                        )}
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          <div style={{ height: 80 }} />
        </div>
      </div>
    </OnboardingGate>
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
