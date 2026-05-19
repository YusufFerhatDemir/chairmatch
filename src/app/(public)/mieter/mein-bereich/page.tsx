'use client'

import { BrandLogo } from '@/components/BrandLogo'
import { useRouter } from 'next/navigation'

const STATS = [
  { v: '8', l: 'Treffer' },
  { v: '2', l: 'Angefragt' },
  { v: '€85', l: 'Budget/Tag' },
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
  { id: 'suchen', lbl: 'Stühle suchen', sub: '8 in deiner Nähe', icon: <Icon><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></Icon> },
  { id: 'favoriten', lbl: 'Favoriten', sub: '4 gemerkt', icon: <Icon><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Icon> },
  { id: 'anfragen', lbl: 'Meine Anfragen', sub: '2 Antworten neu', badge: 2, icon: <Icon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></Icon> },
  { id: 'profil', lbl: 'Mein Profil', sub: 'Lizenz · Erfahrung', icon: <Icon><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></Icon> },
  { id: 'verlauf', lbl: 'Verlauf', sub: 'Frühere Buchungen', icon: <Icon><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></Icon> },
  { id: 'radius', lbl: 'Suchradius', sub: '10 km um Köln', icon: <Icon><circle cx="12" cy="10" r="3"/><path d="M12 22s-8-7-8-13a8 8 0 0 1 16 0c0 6-8 13-8 13z"/></Icon> },
  { id: 'angebote', lbl: 'Neue Angebote für dich', sub: 'Auf Basis deines Profils', wide: true, icon: <Icon><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></Icon> },
]

export default function MeinBereichPage() {
  const router = useRouter()

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
            Mein Bereich
          </h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Stuhl gesucht · Köln · ab heute</p>
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
          {ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                const map: Record<string, string> = {
  suchen: '/mieter/mein-bereich/suchen',
  favoriten: '/mieter/mein-bereich/favoriten',
  anfragen: '/mieter/mein-bereich/anfragen',
  profil: '/mieter/mein-bereich/profil',
  verlauf: '/mieter/mein-bereich/verlauf',
  radius: '/mieter/mein-bereich/radius',
  angebote: '/mieter/mein-bereich/angebote',
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
      </div>
    </div>
  )
}
