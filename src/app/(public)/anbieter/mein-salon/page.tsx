'use client'

import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const STATS = [
  { v: '12', l: 'Termine' },
  { v: '4,9★', l: 'Bewertung' },
  { v: '€480', l: 'Diese Woche' },
]

type Action = { id: string; lbl: string; sub: string; icon: JSX.Element; badge?: number; wide?: boolean }

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="url(#cm-gold-pin)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

const ACTIONS: Action[] = [
  { id: 'logo', lbl: 'Logo / Profilbild', sub: 'Rundes Bild oben', icon: <Icon><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></Icon> },
  { id: 'galerie', lbl: 'Salon-Galerie', sub: 'Bilder hochladen', icon: <Icon><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></Icon> },
  { id: 'beschreibung', lbl: 'Beschreibung', sub: 'Über deinen Salon', icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></Icon> },
  { id: 'services', lbl: 'Services & Preise', sub: '8 aktiv', icon: <Icon><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></Icon> },
  { id: 'oeffnungszeiten', lbl: 'Öffnungszeiten', sub: 'Mo–Sa · 9–18', icon: <Icon><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="11" x2="21" y2="11"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></Icon> },
  { id: 'bewertungen', lbl: 'Bewertungen', sub: '3 neue Reviews', badge: 3, icon: <Icon><polygon points="12 2 15 8.5 22 9.3 17 14 18.2 21 12 17.8 5.8 21 7 14 2 9.3 9 8.5 12 2"/></Icon> },
  { id: 'auszahlung', lbl: 'Auszahlung', sub: 'IBAN & Stripe', icon: <Icon><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></Icon> },
  { id: 'vorschau', lbl: 'So sehen dich Kunden', sub: 'Vorschau deines öffentlichen Profils', wide: true, icon: <Icon><circle cx="12" cy="12" r="3"/><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12z"/></Icon> },
]

export default function MeinSalonPage() {
  const router = useRouter()
  const [needsHygiene, setNeedsHygiene] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cm_anbieter_draft')
      if (raw) {
        const obj = JSON.parse(raw)
        const cats: string[] = Array.isArray(obj.cats) ? obj.cats : []
        if (cats.some((c) => ['medical', 'arzt', 'opraum', 'aesthetik'].includes(c))) {
          setNeedsHygiene(true)
        }
      }
    } catch {}
  }, [])

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

        {/* Top bar — Zurück + Konto */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={() => {
              try {
                sessionStorage.removeItem('cm_onboarded')
                localStorage.removeItem('cm_welcome_seen')
              } catch {}
              window.location.assign('/')
            }}
            aria-label="Zurück zur Rollen-Auswahl"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(196,168,106,0.08)',
              border: '1px solid rgba(196,168,106,0.22)',
              color: 'var(--gold2)', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            ‹
          </button>
          <button
            onClick={() => router.push('/konto')}
            style={{ background: 'transparent', border: 'none', color: 'var(--stone)', fontSize: 10, letterSpacing: 1.5, fontWeight: 600, cursor: 'pointer', textTransform: 'uppercase' }}
            aria-label="Konto"
          >
            Konto
          </button>
        </div>

        {/* Header — Logo + Brandname */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* Greeting */}
        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
            Mein Salon
          </h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Tippe einmal — bearbeite direkt.</p>
        </div>

        {/* Stats */}
        <div style={{ margin: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{
              background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.12)',
              borderRadius: 14, padding: '12px 6px', textAlign: 'center',
            }}>
              <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{s.v}</div>
              <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Action Grid */}
        <div style={{ padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
          {needsHygiene && (
            <button
              onClick={() => router.push('/anbieter/mein-salon/zertifikate' as never)}
              style={{
                gridColumn: '1 / -1',
                background: 'linear-gradient(145deg, rgba(232,80,64,0.08) 0%, var(--c1) 50%, rgba(232,80,64,0.04) 100%)',
                border: '1.5px solid #E85040',
                borderRadius: 16, padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 14, flexDirection: 'row',
                cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                boxShadow: '0 0 16px rgba(232,80,64,0.18)',
                color: 'var(--cream)',
              }}
            >
              <span style={{
                position: 'absolute', top: -6, right: -6,
                background: '#E85040', color: '#fff', fontSize: 9, fontWeight: 700,
                padding: '3px 8px', borderRadius: 8, letterSpacing: 1,
              }}>PFLICHT</span>
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: 'radial-gradient(circle, rgba(232,80,64,0.15), transparent 70%)',
                border: '1px solid rgba(232,80,64,0.3)',
                flexShrink: 0, fontSize: 22,
              }}>
                🛡️
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FF9090' }}>Hygiene & Zertifikate</span>
                <span style={{ fontSize: 10.5, color: 'var(--stone)' }}>Pflicht für OP-Raum / Medical Beauty</span>
              </div>
              <span style={{ fontSize: 18, color: '#FF9090', flexShrink: 0 }}>›</span>
            </button>
          )}
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                const map: Record<string, string> = {
  logo: '/anbieter/mein-salon/logo',
  galerie: '/anbieter/mein-salon/galerie',
  beschreibung: '/anbieter/mein-salon/beschreibung',
  services: '/anbieter/mein-salon/services',
  oeffnungszeiten: '/anbieter/mein-salon/zeiten',
  bewertungen: '/anbieter/mein-salon/bewertungen',
  auszahlung: '/anbieter/mein-salon/auszahlung',
  vorschau: '/anbieter/mein-salon/vorschau',
}
                const href = map[a.id]
                if (href) router.push(href as never)
                else alert(`„${a.lbl}" — kommt bald`)
              }}
              style={{
                gridColumn: a.wide ? '1 / -1' : 'auto',
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, padding: a.wide ? '13px 16px' : '14px 10px',
                display: 'flex',
                flexDirection: a.wide ? 'row' : 'column',
                alignItems: 'center', gap: a.wide ? 14 : 9,
                cursor: 'pointer', fontFamily: 'inherit', position: 'relative',
                boxShadow: '0 0 8px rgba(191,149,63,0.05), 0 12px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(252,246,186,0.04)',
                color: 'var(--cream)',
              }}
            >
              {a.badge && (
                <span style={{
                  position: 'absolute', top: 8, right: 8, background: '#E85040', color: '#fff',
                  fontSize: 9.5, fontWeight: 700, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
                }}>{a.badge}</span>
              )}
              <div style={{
                width: a.wide ? 46 : 56, height: a.wide ? 46 : 56, borderRadius: a.wide ? 12 : 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                background: 'radial-gradient(circle, rgba(212,175,55,0.07) 0%, transparent 70%)',
                border: '1px solid rgba(212,175,55,0.14)',
                flexShrink: 0,
              }}>
                {a.icon}
              </div>
              <div style={{
                flex: a.wide ? 1 : undefined,
                display: 'flex', flexDirection: 'column', gap: 2,
                textAlign: a.wide ? 'left' : 'center',
              }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--cream)', lineHeight: 1.2 }}>{a.lbl}</span>
                <span style={{ fontSize: 10, color: 'var(--stone)', lineHeight: 1.3 }}>{a.sub}</span>
              </div>
              {a.wide && <span style={{ fontSize: 18, color: 'var(--gold2)', flexShrink: 0 }}>›</span>}
            </button>
          ))}
        </div>

        <BottomNav role="anbieter" />
      </div>
    </div>
  )
}
