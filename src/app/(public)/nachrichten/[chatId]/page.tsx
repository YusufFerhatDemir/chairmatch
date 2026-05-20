'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Msg { id: string; from: 'me' | 'them'; text: string; time: string }

const MOCK_MESSAGES: Msg[] = [
  { id: 'm1', from: 'me', text: 'Hallo Anna, hast du am 20. Mai noch einen Stuhl frei für mich? Ich bin Friseurin mit 5 Jahren Erfahrung.', time: '14:32' },
  { id: 'm2', from: 'them', text: 'Hi! Ja klar, der Stuhl am Fenster ist frei. Magst du vorbeikommen für ein Kennenlernen? Donnerstag 16 Uhr?', time: '14:45' },
  { id: 'm3', from: 'me', text: 'Donnerstag 16 Uhr passt mir! Ich komme vorbei.', time: '14:48' },
  { id: 'm4', from: 'them', text: 'Super! Dann bis dann. Schick mir noch kurz dein Profil-Bild und Meisterbrief?', time: '14:51' },
]

const CONTACT_NAME = 'Salon Anna'
const CONTACT_INITIALS = 'SA'

export default function ChatDetailPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = (params?.chatId as string) || ''
  const [messages, setMessages] = useState<Msg[]>(MOCK_MESSAGES)
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function send() {
    if (!input.trim()) return
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    setMessages([...messages, { id: 'm' + Date.now(), from: 'me', text: input.trim(), time: t }])
    setInput('')
  }

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
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Chat</span>
        </div>

        {/* Contact-Banner */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(196,168,106,0.04)', padding: '12px 20px', borderBottom: '1px solid rgba(196,168,106,0.1)' }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 600 }}>{CONTACT_INITIALS}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{CONTACT_NAME}</p>
            <p style={{ fontSize: 10, color: '#6ABF80' }}>● Online · antwortet meist in 1 Std.</p>
          </div>
        </div>

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20, minHeight: 360, maxHeight: 480, overflowY: 'auto' }}>
          {messages.map(m => (
            <div key={m.id} style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: 16,
              fontSize: 13,
              lineHeight: 1.4,
              alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
              borderBottomRightRadius: m.from === 'me' ? 4 : 16,
              borderBottomLeftRadius: m.from === 'me' ? 16 : 4,
              background: m.from === 'me'
                ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)'
                : 'var(--c1)',
              border: m.from === 'me' ? 'none' : '0.5px solid rgba(196,168,106,0.15)',
              color: m.from === 'me' ? '#1a1000' : 'var(--cream)',
              fontWeight: m.from === 'me' ? 600 : 400,
            }}>
              {m.text}
              <span style={{ display: 'block', fontSize: 9, color: m.from === 'me' ? 'rgba(26,16,0,0.6)' : 'var(--stone)', marginTop: 3 }}>
                {m.time} {m.from === 'me' ? '· Du' : `· ${CONTACT_NAME.split(' ')[1] || CONTACT_NAME}`}
              </span>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input-Bar */}
        <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid rgba(196,168,106,0.1)' }}>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Nachricht schreiben…"
            style={{ flex: 1, padding: '10px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 20, fontSize: 13, fontFamily: 'inherit' }} />
          <button onClick={send}
            style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontSize: 16, cursor: 'pointer', flexShrink: 0, fontWeight: 700 }}
          >↑</button>
        </div>
      </div>
    </div>
  )
}
