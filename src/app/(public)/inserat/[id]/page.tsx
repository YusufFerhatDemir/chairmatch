'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

const MOCK_INSERAT = {
  id: 'i1',
  name: 'Salon Anna · Stuhl',
  city: 'Köln-Innenstadt',
  distance: '1,2 km',
  verified: true,
  initials: 'SA',
  prices: { hour: 15, day: 90, week: 450, month: 1500 },
  equipment: ['Spiegel', 'Föhn', 'Glätteisen', 'Sterilisator', 'WLAN', 'Klimaanlage', 'Wasseranschluss'],
  hours: { weekdays: '9:00 – 18:00', saturday: '10:00 – 16:00' },
  description: 'Heller Salon im Zentrum mit 4 Stühlen, eigener Lounge und Espresso-Bar. Stuhl 3 am Fenster ist frei.',
  galleryCount: 4,
}

export default function InseratDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ''
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      setIsFav(favs.includes(id))
    } catch {}
  }, [id])

  function toggleFav() {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      const next = favs.includes(id) ? favs.filter((x: string) => x !== id) : [...favs, id]
      localStorage.setItem('cm_inserate_favs', JSON.stringify(next))
      setIsFav(next.includes(id))
    } catch {}
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="ins-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BF953F"/><stop offset="50%" stopColor="#FCF6BA"/><stop offset="100%" stopColor="#AA771C"/>
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Stuhlvermietung</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {/* HERO mit margin + eigener border-radius */}
        <div style={{
          margin: '0 16px', aspectRatio: '16/10',
          borderRadius: 18, overflow: 'hidden',
          background: 'linear-gradient(135deg,#3A3025,#1F1A0F)',
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '0.5px solid rgba(196,168,106,0.18)',
        }}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="url(#ins-gold)" strokeWidth="1" style={{ opacity: 0.4 }}>
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <circle cx="9" cy="9" r="2"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg>
          <button onClick={toggleFav}
            style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: 'rgba(11,11,15,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,168,106,0.3)', color: isFav ? '#E85040' : 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}
          >{isFav ? '♥' : '♡'}</button>
          {MOCK_INSERAT.galleryCount > 1 && (
            <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 5 }}>
              {Array.from({ length: MOCK_INSERAT.galleryCount }).map((_, i) => (
                <span key={i} style={{
                  width: i === 0 ? 20 : 6, height: 6, borderRadius: i === 0 ? 3 : '50%',
                  background: i === 0 ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 50%, #AA771C 100%)' : 'rgba(255,255,255,0.4)',
                }} />
              ))}
            </div>
          )}
        </div>

        {/* Avatar Card */}
        <div style={{
          margin: '14px 16px 0',
          background: 'linear-gradient(145deg, rgba(191,149,63,0.06), var(--c2) 50%, rgba(179,135,40,0.04))',
          border: '1px solid rgba(191,149,63,0.22)',
          borderRadius: 16, padding: 14,
          display: 'flex', gap: 12, alignItems: 'center',
        }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="cinzel text-gold-metallic" style={{ fontSize: 18, fontWeight: 600 }}>{MOCK_INSERAT.initials}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 700 }}>{MOCK_INSERAT.name}</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{MOCK_INSERAT.city} · {MOCK_INSERAT.distance}</p>
            {MOCK_INSERAT.verified && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', marginTop: 5 }}>✓ VERIFIZIERT</span>
            )}
          </div>
        </div>

        {/* Preis-Strip */}
        <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
          {[
            ['Stunde', MOCK_INSERAT.prices.hour],
            ['Tag', MOCK_INSERAT.prices.day],
            ['Woche', MOCK_INSERAT.prices.week],
            ['Monat', MOCK_INSERAT.prices.month],
          ].map(([l, v]) => (
            <div key={l} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
              <div className="cinzel text-gold-metallic" style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{v} €</div>
            </div>
          ))}
        </div>

        {/* Beschreibung */}
        <div style={{ padding: '18px 16px 0' }}>
          <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Beschreibung</h3>
          <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6 }}>{MOCK_INSERAT.description}</p>
        </div>

        {/* Ausstattung */}
        <div style={{ padding: '18px 16px 0' }}>
          <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ausstattung inklusive</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {MOCK_INSERAT.equipment.map(e => (
              <span key={e} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 8, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600, border: '1px solid rgba(176,144,96,0.15)' }}>{e}</span>
            ))}
          </div>
        </div>

        {/* Verfügbarkeit */}
        <div style={{ padding: '18px 16px 0' }}>
          <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Verfügbarkeit</h3>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.8, color: 'var(--cream)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mo–Fr</span><span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{MOCK_INSERAT.hours.weekdays}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Samstag</span><span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{MOCK_INSERAT.hours.saturday}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.5 }}><span>Sonntag</span><span>Ruhetag</span></div>
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '20px 16px 24px' }}>
          <button
            onClick={() => router.push(`/inserat/${id}/anfragen` as never)}
            style={{ width: '100%', padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 0 22px rgba(196,168,106,0.3)' }}
          >
            <span>Jetzt anfragen</span>
            <span className="cinzel" style={{ fontWeight: 700 }}>ab {MOCK_INSERAT.prices.hour} €/h →</span>
          </button>
        </div>
      </div>
    </div>
  )
}
