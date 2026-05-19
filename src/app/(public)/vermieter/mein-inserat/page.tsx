'use client'

export const dynamic = 'force-dynamic'

import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/i18n/client'

type Action = { id: string; lbl: string; sub: string; icon: JSX.Element; badge?: number; wide?: boolean }

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="url(#cm-gold-pin)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

export default function MeinInseratPage() {
  const router = useRouter()
  const t = useTranslations()

  const STATS = [
    { v: '5',   l: t('meinInserat.stat1') },
    { v: '22',  l: t('meinInserat.stat2') },
    { v: '€90', l: t('meinInserat.stat3') },
  ]

  const ACTIONS: Action[] = [
    { id: 'fotos',          lbl: t('meinInserat.photos'),      sub: t('meinInserat.photosSub', { n: 3 }), icon: <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></Icon> },
    { id: 'ausstattung',    lbl: t('meinInserat.equipment'),   sub: t('meinInserat.equipmentSub', { n: 7 }), icon: <Icon><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></Icon> },
    { id: 'preise',         lbl: t('meinInserat.prices'),      sub: t('meinInserat.pricesSub'), icon: <Icon><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Icon> },
    { id: 'verfuegbarkeit', lbl: t('meinInserat.availability'),sub: t('meinInserat.availabilitySub'), icon: <Icon><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></Icon> },
    { id: 'anfragen',       lbl: t('meinInserat.requests'),    sub: t('meinInserat.requestsOpen', { n: 5 }), badge: 5, icon: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon> },
    { id: 'auszahlung',     lbl: t('meinInserat.payout'),      sub: t('meinInserat.payoutSub'), icon: <Icon><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></Icon> },
    { id: 'vorschau',       lbl: t('meinInserat.preview'),     sub: t('meinInserat.previewSub'), wide: true, icon: <Icon><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/></Icon> },
  ]

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 40px',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="cm-gold-pin" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BF953F" />
            <stop offset="22%" stopColor="#FCF6BA" />
            <stop offset="45%" stopColor="#B38728" />
            <stop offset="67%" stopColor="#FBF5B7" />
            <stop offset="100%" stopColor="#AA771C" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => { try { sessionStorage.removeItem('cm_onboarded'); localStorage.removeItem('cm_welcome_seen') } catch {}; window.location.assign('/') }}
            aria-label={t('buttons.back')}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <button onClick={() => router.push('/konto')}
            style={{ background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 10, letterSpacing: 1.5, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}
          >{t('bottomNav.account')}</button>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>{t('meinInserat.title')}</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>{t('meinInserat.subtitle')}</p>
        </div>

        <div style={{ margin: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.12)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
              <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{s.v}</div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {ACTIONS.map((a) => (
            <button key={a.id}
              onClick={() => {
                const map: Record<string, string> = {
                  fotos: '/vermieter/mein-inserat/fotos',
                  ausstattung: '/vermieter/mein-inserat/ausstattung',
                  preise: '/vermieter/mein-inserat/preise',
                  verfuegbarkeit: '/vermieter/mein-inserat/verfuegbarkeit',
                  anfragen: '/vermieter/mein-inserat/anfragen',
                  auszahlung: '/vermieter/mein-inserat/auszahlung',
                  vorschau: '/vermieter/mein-inserat/vorschau',
                }
                const href = map[a.id]
                if (href) router.push(href as never)
              }}
              style={{
                gridColumn: a.wide ? '1 / -1' : 'auto',
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, padding: a.wide ? '13px 16px' : '14px 10px',
                display: 'flex', flexDirection: a.wide ? 'row' : 'column',
                alignItems: 'center', gap: a.wide ? 14 : 9,
                cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                boxShadow: '0 0 8px rgba(191,149,63,0.05), 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(252,246,186,0.04)',
                color: 'var(--cream)',
              }}
            >
              {a.badge && (
                <span style={{ position: 'absolute', top: 8, right: 8, background: '#E85040', color: '#fff', fontSize: 9.5, fontWeight: 700, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>{a.badge}</span>
              )}
              <div style={{ width: a.wide ? 46 : 56, height: a.wide ? 46 : 56, borderRadius: a.wide ? 12 : 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)', border: '1px solid rgba(212,175,55,0.14)', flexShrink: 0 }}>{a.icon}</div>
              <div style={{ flex: a.wide ? 1 : undefined, display: 'flex', flexDirection: 'column', gap: 2, textAlign: a.wide ? 'left' : 'center' }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.2 }}>{a.lbl}</span>
                <span style={{ fontSize: 10, color: 'var(--stone)', lineHeight: 1.3 }}>{a.sub}</span>
              </div>
              {a.wide && <span style={{ fontSize: 18, color: 'var(--gold2)', flexShrink: 0 }}>›</span>}
            </button>
          ))}
        </div>

        <BottomNav role="vermieter" />
      </div>
    </div>
  )
}
