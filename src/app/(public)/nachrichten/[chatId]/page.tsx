'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

/**
 * Chat-Verlauf.
 *
 * Bis 2026-08-27 zeigte diese Seite vier erfundene Nachrichten von "Salon
 * Anna" — jedem Besucher dieselben, unabhaengig von der chatId in der URL,
 * inklusive Statuszeile "Online · antwortet meist in 1 Std.". Getippte
 * Nachrichten landeten nur im React-State und waren beim naechsten Reload
 * weg. Jetzt haengt die Seite an /api/messages/[conversationId], demselben
 * Endpunkt, den das ChatWidget benutzt.
 */

interface Message {
  id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ConversationDetail {
  conversationId: string
  currentUserId: string
  salonId: string | null
  salonName: string | null
  otherUser: { id: string; full_name: string | null; avatar_url: string | null } | null
  messages: Message[]
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; conversation: ConversationDetail }

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function clockTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

export default function ChatDetailPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = (params?.chatId as string) || ''

  const [state, setState] = useState<LoadState>({ kind: 'loading' })
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    if (!chatId) {
      setState({ kind: 'error', message: 'Kein Chat ausgewählt.' })
      return
    }
    try {
      const res = await fetch(`/api/messages/${chatId}`)
      if (res.status === 401) return setState({ kind: 'unauthenticated' })
      if (res.status === 403) return setState({ kind: 'forbidden' })
      if (!res.ok) {
        return setState({ kind: 'error', message: 'Verlauf konnte nicht geladen werden.' })
      }
      const data = (await res.json()) as ConversationDetail
      setState({ kind: 'ready', conversation: data })
    } catch {
      setState({ kind: 'error', message: 'Keine Verbindung zum Server.' })
    }
  }, [chatId])

  useEffect(() => {
    load()
  }, [load])

  const messages = state.kind === 'ready' ? state.conversation.messages : []

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    const content = input.trim()
    if (!content || sending || state.kind !== 'ready') return
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: state.conversation.conversationId, content }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        setSendError(
          typeof payload?.error === 'string'
            ? payload.error
            : 'Nachricht konnte nicht gesendet werden.',
        )
        return
      }
      // Erst nach dem Erfolg leeren — sonst ist der Text bei einem
      // Fehlschlag verloren, so wie bisher.
      setInput('')
      await load()
    } catch {
      setSendError('Nachricht konnte nicht gesendet werden.')
    } finally {
      setSending(false)
    }
  }

  const other = state.kind === 'ready' ? state.conversation.otherUser : null
  const contactName =
    other?.full_name || (state.kind === 'ready' ? state.conversation.salonName : null) || 'Unbekannt'

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

        {/* Contact-Banner — nur wenn es wirklich ein Gegenüber gibt. Die
            frühere Zeile "Online · antwortet meist in 1 Std." stand fest im
            Code und war für niemanden je gemessen. */}
        {state.kind === 'ready' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(196,168,106,0.04)', padding: '12px 20px', borderBottom: '1px solid rgba(196,168,106,0.1)' }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
              {other?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={other.avatar_url} alt="" width={42} height={42} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 600 }}>{initials(contactName)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700 }}>{contactName}</p>
              {state.conversation.salonName && (
                <p style={{ fontSize: 10, color: 'var(--gold2)' }}>{state.conversation.salonName}</p>
              )}
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 20, minHeight: 360, maxHeight: 480, overflowY: 'auto' }}>
          {state.kind === 'loading' && (
            <p style={{ fontSize: 13, color: 'var(--stone)', textAlign: 'center', marginTop: 40 }}>Verlauf wird geladen …</p>
          )}

          {state.kind === 'unauthenticated' && (
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 14 }}>Melde dich an, um diesen Chat zu sehen.</p>
              <button onClick={() => router.push('/konto' as never)}
                style={{ padding: '10px 20px', borderRadius: 20, border: '1px solid rgba(196,168,106,0.35)', background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Zum Login</button>
            </div>
          )}

          {state.kind === 'forbidden' && (
            <p role="alert" style={{ fontSize: 13, color: '#F2A79C', textAlign: 'center', marginTop: 40 }}>
              Dieser Chat gehört nicht zu deinem Konto.
            </p>
          )}

          {state.kind === 'error' && (
            <p role="alert" style={{ fontSize: 13, color: '#F2A79C', textAlign: 'center', marginTop: 40 }}>{state.message}</p>
          )}

          {state.kind === 'ready' && messages.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--stone)', textAlign: 'center', marginTop: 40 }}>Noch keine Nachrichten.</p>
          )}

          {state.kind === 'ready' && messages.map(m => {
            const isMine = m.sender_id === state.conversation.currentUserId
            return (
              <div key={m.id} style={{
                maxWidth: '75%',
                padding: '10px 14px',
                borderRadius: 16,
                fontSize: 13,
                lineHeight: 1.4,
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                borderBottomRightRadius: isMine ? 4 : 16,
                borderBottomLeftRadius: isMine ? 16 : 4,
                background: isMine
                  ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)'
                  : 'var(--c1)',
                border: isMine ? 'none' : '0.5px solid rgba(196,168,106,0.15)',
                color: isMine ? '#1a1000' : 'var(--cream)',
                fontWeight: isMine ? 600 : 400,
                wordBreak: 'break-word',
              }}>
                {m.content}
                <span style={{ display: 'block', fontSize: 9, color: isMine ? 'rgba(26,16,0,0.6)' : 'var(--stone)', marginTop: 3 }}>
                  {clockTime(m.created_at)} {isMine ? '· Du' : `· ${contactName}`}
                </span>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>

        {sendError && (
          <p role="alert" style={{ margin: 0, padding: '8px 20px', background: 'rgba(232,80,64,0.12)', borderTop: '1px solid rgba(232,80,64,0.3)', color: '#F2A79C', fontSize: 12 }}>
            {sendError}
          </p>
        )}

        {/* Input-Bar — nur wenn es einen Faden gibt, in den geschrieben werden kann. */}
        {state.kind === 'ready' && (
          <div style={{ display: 'flex', gap: 8, padding: '14px 20px', borderTop: '1px solid rgba(196,168,106,0.1)' }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              disabled={sending}
              placeholder="Nachricht schreiben…"
              style={{ flex: 1, padding: '10px 14px', background: 'var(--c1)', color: 'var(--cream)', border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 20, fontSize: 13, fontFamily: 'inherit' }} />
            <button onClick={send} disabled={!input.trim() || sending} aria-label="Senden"
              style={{ width: 42, height: 42, borderRadius: '50%', background: input.trim() && !sending ? 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)' : 'rgba(255,255,255,0.08)', color: '#1a1000', border: 'none', fontSize: 16, cursor: input.trim() && !sending ? 'pointer' : 'default', flexShrink: 0, fontWeight: 700 }}
            >↑</button>
          </div>
        )}
      </div>
    </div>
  )
}
