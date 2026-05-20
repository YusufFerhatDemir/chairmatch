'use client'

import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'

const MOCK_CHATS = [
  { id: 'c1', initials: 'SA', name: 'Salon Anna', last: 'Hallo, deine Anfrage für den 20. Mai ist bei mir...', time: 'vor 10 Min', unread: 2 },
  { id: 'c2', initials: 'LM', name: 'Lounge Maximilian', last: 'Klar, sehr gerne! Komm vorbei.', time: 'vor 2 Std', unread: 0 },
  { id: 'c3', initials: 'SR', name: 'Studio Rio', last: 'Sorry, der Stuhl ist diese Woche schon ausgebucht.', time: 'gestern', unread: 0 },
  { id: 'c4', initials: 'AK', name: 'Atelier Klein', last: 'Du: Hallo, ich habe Interesse an deinem...', time: 'vor 3 Tagen', unread: 0 },
  { id: 'c5', initials: 'BS', name: 'Beauty Spot', last: 'Termin bestätigt für Freitag. Bis dann!', time: 'letzte Woche', unread: 0 },
]

export default function ChatListPage() {
  const router = useRouter()
  const unreadTotal = MOCK_CHATS.reduce((n, c) => n + c.unread, 0)

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Nachrichten</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 18px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Nachrichten</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>{MOCK_CHATS.length} Konversationen{unreadTotal > 0 ? ` · ${unreadTotal} ungelesen` : ''}</p>
        </div>

        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MOCK_CHATS.map(c => (
            <button key={c.id}
              onClick={() => router.push(`/nachrichten/${c.id}` as never)}
              style={{
                background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', gap: 12, alignItems: 'center',
                fontFamily: 'inherit', textAlign: 'left', color: 'var(--cream)',
              }}
            >
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600 }}>{c.initials}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</span>
                  <span style={{ fontSize: 9.5, color: 'var(--stone)', flexShrink: 0, fontWeight: 500 }}>{c.time}</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--stone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{c.last}</p>
              </div>
              {c.unread > 0 && (
                <span style={{ background: '#E85040', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unread}</span>
              )}
            </button>
          ))}
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
