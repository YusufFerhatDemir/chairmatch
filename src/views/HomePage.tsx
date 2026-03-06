import { useEffect, useState, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/stores/salonStore'
import { useUIStore } from '@/stores/uiStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useBookingStore } from '@/stores/bookingStore'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { t } from '@/i18n'
import { Logo } from '@/components/ui/Logo'
import { CATEGORY_ICONS } from '@/lib/constants'
import { Stars } from '@/components/ui/Stars'
import { Skeleton } from '@/components/ui/Skeleton'
import type { AppLanguage } from '@/lib/types'

interface OfferRow {
  id: string
  salon_id: string
  title: string
  description: string | null
  discount_percent: number | null
  discount_fixed_cents: number | null
  is_active: boolean
  salon?: { name: string; category: string; cover_url: string | null; subscription_tier: string; slug: string | null }
}

interface LoyaltyRow {
  id: string
  stamps: number
  stamps_required: number
  reward: string
  is_redeemed: boolean
  salon?: { name: string }
}

export function HomePage() {
  const navigate = useNavigate()
  const { salons, loading } = useStore()
  const search = useUIStore(s => s.search)
  const setSearch = useUIStore(s => s.setSearch)
  const theme = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)
  const language = useUIStore(s => s.language)
  const setLanguage = useUIStore(s => s.setLanguage)
  const showToast = useUIStore(s => s.showToast)
  const { categories, loading: catLoading, loadCategories, getActiveCategories } = useCategoryStore()
  const { user, profile } = useAuth()
  const { bookings, loadBookings, cancelBooking } = useBookingStore()

  const [offers, setOffers] = useState<OfferRow[]>([])
  const [loyalty, setLoyalty] = useState<LoyaltyRow | null>(null)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralBalance, setReferralBalance] = useState(0)
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (categories.length === 0) loadCategories()
  }, [categories.length, loadCategories])

  const loadHomeData = useCallback(async () => {
    setLoadingData(true)

    // Load offers with salon info
    const { data: offersData } = await supabase
      .from('offers')
      .select('*, salon:salons(name, category, cover_url, subscription_tier, slug)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)
    if (offersData) setOffers(offersData as unknown as OfferRow[])

    // Load user-specific data
    if (user) {
      // Loyalty
      const { data: loyaltyData } = await supabase
        .from('loyalty_cards')
        .select('*, salon:salons(name)')
        .eq('customer_id', user.id)
        .eq('is_redeemed', false)
        .limit(1)
        .single()
      if (loyaltyData) setLoyalty(loyaltyData as unknown as LoyaltyRow)

      // Referral code & balance from profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('referral_code, referral_balance_cents')
        .eq('id', user.id)
        .single()
      if (profileData) {
        const pd = profileData as Record<string, unknown>
        setReferralCode((pd.referral_code as string) || null)
        setReferralBalance(((pd.referral_balance_cents as number) || 0) / 100)
      }

      // Bookings
      loadBookings(user.id)
    }

    setLoadingData(false)
  }, [user, loadBookings])

  useEffect(() => {
    loadHomeData()
  }, [loadHomeData])

  const activeCategories = getActiveCategories()
  const featured = salons.slice(0, 4)

  const handleCancel = async (bookingId: string) => {
    if (!confirm(t('cancelConfirm'))) return
    const err = await cancelBooking(bookingId)
    if (err) showToast(err)
    else showToast(t('bookingCancelled'))
  }

  const copyReferral = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode)
      showToast(t('refCopied'))
    }
  }

  const statusColor = (s: string) => {
    if (s === 'confirmed') return '#22c55e'
    if (s === 'pending') return '#f59e0b'
    if (s === 'cancelled') return '#ef4444'
    if (s === 'completed') return '#6366f1'
    return 'var(--stone)'
  }

  const statusLabel = (s: string) => {
    if (s === 'confirmed') return t('confirmed')
    if (s === 'pending') return t('pending')
    if (s === 'cancelled') return t('cancelled')
    if (s === 'completed') return t('completed')
    if (s === 'no_show') return t('no_show')
    return s
  }

  const LANG_FLAGS: { code: AppLanguage; flag: string; label: string }[] = [
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  ]

  // Section styles
  const sectionTitle: React.CSSProperties = {
    fontSize: 'var(--font-lg)',
    fontWeight: 700,
    color: 'var(--gold)',
    marginBottom: 12,
    letterSpacing: '.03em',
  }
  const cardStyle: React.CSSProperties = {
    background: 'var(--c2)',
    borderRadius: 14,
    overflow: 'hidden',
    border: '1px solid var(--c3)',
  }
  const sectionGap: React.CSSProperties = { marginBottom: 28 }

  return (
    <div style={{ padding: 'var(--pad)', paddingBottom: 100 }}>
      <Helmet>
        <title>ChairMatch — Beauty Booking Deutschland</title>
        <meta name="description" content="Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios in ganz Deutschland." />
        <link rel="canonical" href="https://chairmatch.de/" />
      </Helmet>

      {/* ═══ Header ═══ */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div className="cinzel" style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--gold)' }}>
            ChairMatch
          </div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginTop: 2 }}>
            {t('home_subtitle')}
          </div>
        </div>
        <Logo size={44} />
      </div>

      {/* ═══ Search ═══ */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input
          className="inp"
          placeholder={t('search_placeholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => navigate('/search')}
          style={{ paddingLeft: 40 }}
          aria-label={t('search_placeholder')}
        />
        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--stone)', fontSize: 16 }}>
          🔍
        </span>
      </div>

      {/* ═══ ANGEBOTE ═══ */}
      {offers.length > 0 && (
        <div style={sectionGap}>
          <div style={sectionTitle}>{t('offers')}</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {offers.map(offer => (
              <div
                key={offer.id}
                style={{ ...cardStyle, minWidth: 220, maxWidth: 260, flex: '0 0 auto', cursor: 'pointer' }}
                onClick={() => navigate(`/salon/${offer.salon?.slug || offer.salon_id}`)}
              >
                {/* Cover */}
                <div style={{ position: 'relative', height: 120, background: 'var(--c3)' }}>
                  {offer.salon?.cover_url ? (
                    <img src={offer.salon.cover_url} alt={offer.salon?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--stone2)' }}>✂</div>
                  )}
                  {/* Discount badge */}
                  {offer.discount_percent && (
                    <div style={{
                      position: 'absolute', top: 8, left: 8,
                      background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 6,
                    }}>
                      -{offer.discount_percent}% {t('rabatt')}
                    </div>
                  )}
                  {/* Gold badge */}
                  {offer.salon?.subscription_tier === 'gold' && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'var(--gold)', color: '#000', fontSize: 10, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 4, letterSpacing: '.05em',
                    }}>
                      {t('gold_badge')}
                    </div>
                  )}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)', marginBottom: 2 }}>{offer.salon?.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 6 }}>{offer.title}</div>
                  <button
                    className="btn btn-gold"
                    style={{ width: '100%', fontSize: 12, padding: '6px 0' }}
                    onClick={e => { e.stopPropagation(); navigate(`/booking/${offer.salon_id}`) }}
                  >
                    {t('bookNow')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ KATEGORIEN ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('categories')}</div>
        {catLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[1,2,3,4,5,6].map(i => <Skeleton key={i} height={120} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {activeCategories.map(cat => (
              <button
                key={cat.id}
                className="catcard"
                onClick={() => navigate(`/category/${cat.slug}`)}
                aria-label={cat.label}
              >
                <div className="caticon">
                  <img src={cat.icon_url || CATEGORY_ICONS[cat.slug] || '/icons/01_barbershop_256x384.png'} alt={cat.label} loading="lazy" />
                </div>
                <div className="catlbl">{cat.label}</div>
                <div className="catsub">{cat.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ TREUEKARTE ═══ */}
      {user && loyalty && (
        <div style={sectionGap}>
          <div style={sectionTitle}>{t('loyalty')}</div>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-md)' }}>{loyalty.salon?.name || 'ChairMatch'}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{t('loyaltySub')}</div>
              </div>
              <div style={{ fontSize: 'var(--font-sm)', color: 'var(--gold)', fontWeight: 700 }}>
                {loyalty.stamps}/{loyalty.stamps_required} {t('stampsOf')}
              </div>
            </div>
            {/* Stamps grid */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {Array.from({ length: loyalty.stamps_required }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    border: '2px solid var(--gold)',
                    background: i < loyalty.stamps ? 'var(--gold)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, color: i < loyalty.stamps ? '#000' : 'var(--stone2)',
                  }}
                >
                  {i < loyalty.stamps ? '✓' : (i + 1)}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
              🎁 {loyalty.reward}
            </div>
          </div>
        </div>
      )}

      {/* ═══ REFERRAL GUTHABEN ═══ */}
      {user && referralCode && (
        <div style={sectionGap}>
          <div style={sectionTitle}>{t('refBalance')}</div>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--gold)' }}>
                {referralBalance.toFixed(2)}€
              </div>
              <button
                className="btn btn-gold"
                style={{ fontSize: 12, padding: '6px 16px' }}
                onClick={copyReferral}
              >
                {t('recommend')}
              </button>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--c3)', borderRadius: 8, padding: '8px 12px',
            }}>
              <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{t('refCode')}:</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-sm)', color: 'var(--gold)', letterSpacing: '.08em' }}>
                {referralCode}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ VERMIETEN & VERDIENEN ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('rent_earn')}</div>
        <div
          style={{ ...cardStyle, padding: 20, cursor: 'pointer', background: 'linear-gradient(135deg, var(--c2) 0%, rgba(200,168,75,0.08) 100%)' }}
          onClick={() => navigate('/rentals')}
        >
          <div style={{ fontSize: 40, marginBottom: 8 }}>💺</div>
          <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', marginBottom: 4 }}>{t('chairRent')}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 4 }}>{t('premChair')}</div>
          <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 12 }}>{t('rent_earn_sub')}</div>
          <span style={{ color: 'var(--gold)', fontWeight: 700, fontSize: 'var(--font-sm)' }}>{t('rent_cta')}</span>
        </div>
      </div>

      {/* ═══ FEATURED SALONS ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('featured_salons')}</div>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => <Skeleton key={i} height={120} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {featured.map(salon => (
              <button
                key={salon.id}
                className="card fu"
                onClick={() => navigate(`/salon/${salon.slug || salon.id}`)}
                style={{ textAlign: 'left', width: '100%', cursor: 'pointer' }}
              >
                <div style={{ position: 'relative' }}>
                  {salon.cover_url ? (
                    <img src={salon.cover_url} alt={salon.name} style={{ width: '100%', height: 130, objectFit: 'cover' }} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: 130, background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'var(--stone2)' }}>✂</div>
                  )}
                  {salon.subscription_tier === 'gold' && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'var(--gold)', color: '#000', fontSize: 10, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 4,
                    }}>GOLD</div>
                  )}
                  {salon.subscription_tier === 'premium' && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      background: '#6366f1', color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '2px 8px', borderRadius: 4,
                    }}>PREMIUM</div>
                  )}
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 'var(--font-md)', marginBottom: 4 }}>{salon.name}</div>
                  <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', marginBottom: 4 }}>
                    {salon.city} · {salon.category}
                  </div>
                  <Stars rating={salon.avg_rating} count={salon.review_count} size={12} />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══ BUCHUNGEN ═══ */}
      {user && (
        <div style={sectionGap}>
          <div style={sectionTitle}>{t('your_bookings')}</div>
          {bookings.length === 0 ? (
            <div style={{ ...cardStyle, padding: 20, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📅</div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t('noBookings')}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{t('noBookingsSub')}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bookings.slice(0, 5).map(bk => {
                const salon = (bk as any).salon as { name: string; category: string } | undefined
                const svc = (bk as any).service as { name: string; duration_minutes: number } | undefined
                return (
                  <div key={bk.id} style={{ ...cardStyle, padding: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)' }}>{salon?.name || 'Salon'}</div>
                        <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                          {svc?.name} · {svc?.duration_minutes} min
                        </div>
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: statusColor(bk.status) + '22', color: statusColor(bk.status),
                      }}>
                        {statusLabel(bk.status)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>
                        📅 {bk.booking_date} · 🕐 {bk.start_time?.slice(0, 5)} · 💰 {(bk.price_cents / 100).toFixed(2)}€
                      </div>
                      {(bk.status === 'pending' || bk.status === 'confirmed') && (
                        <button
                          onClick={() => handleCancel(bk.id)}
                          style={{
                            fontSize: 11, color: '#ef4444', background: 'none', border: '1px solid #ef4444',
                            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', fontWeight: 600,
                          }}
                        >
                          {t('cancelBooking')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ DESIGN (Dark Mode) ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('theme')}</div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span style={{ fontWeight: 600 }}>{theme === 'dark' ? t('darkMode') : t('lightMode')}</span>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                background: theme === 'dark' ? 'var(--gold)' : 'var(--c3)',
                position: 'relative', transition: 'background .2s',
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: '50%', background: '#fff',
                position: 'absolute', top: 3,
                left: theme === 'dark' ? 27 : 3,
                transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)',
              }} />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ SPRACHE ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('lang')}</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {LANG_FLAGS.map(lf => (
            <button
              key={lf.code}
              onClick={() => setLanguage(lf.code)}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: 12, cursor: 'pointer',
                background: language === lf.code ? 'var(--gold)' : 'var(--c2)',
                color: language === lf.code ? '#000' : 'var(--fg)',
                border: language === lf.code ? '2px solid var(--gold)' : '1px solid var(--c3)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                fontWeight: language === lf.code ? 700 : 400,
                transition: 'all .2s',
              }}
            >
              <span style={{ fontSize: 28 }}>{lf.flag}</span>
              <span style={{ fontSize: 11 }}>{lf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══ FEATURES ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('features')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '💬', title: t('feat_chat'), sub: t('feat_chat_sub') },
            { icon: '🗺', title: t('feat_map'), sub: t('feat_map_sub') },
            { icon: '📄', title: t('feat_docs'), sub: t('feat_docs_sub') },
          ].map((feat, i) => (
            <div key={i} style={{ ...cardStyle, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--c3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
              }}>
                {feat.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 'var(--font-sm)' }}>{feat.title}</div>
                <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{feat.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RECHTLICHES ═══ */}
      <div style={sectionGap}>
        <div style={sectionTitle}>{t('legal')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: t('privacy'), path: '/datenschutz', icon: '🔒' },
            { label: t('imprint'), path: '/impressum', icon: '📋' },
            { label: t('register'), path: '/auth', icon: '✨' },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              style={{
                ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'pointer', textAlign: 'left', width: '100%',
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 'var(--font-sm)' }}>{item.label}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--stone)', fontSize: 14 }}>›</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>
        © 2026 ChairMatch Deutschland · Alle Rechte vorbehalten
      </div>
    </div>
  )
}
