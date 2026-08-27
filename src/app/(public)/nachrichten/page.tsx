'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'

/**
 * Postfach.
 *
 * Diese Seite zeigte bis 2026-08-27 fuenf fest verdrahtete Konversationen —
 * "Salon Anna", "Lounge Maximilian", "Studio Rio" — mit erfundenen
 * Nachrichtentexten ("Termin bestaetigt fuer Freitag"), und zwar jedem
 * Besucher dieselben, auch ohne Login. Die Detailseite war ebenso erfunden;
 * was man dort tippte, lebte bis zum naechsten Reload.
 *
 * Es gab die echte Kette bereits: /api/messages, benutzt vom ChatWidget.
 * Nur diese beiden Seiten haengen jetzt auch daran.
 */

interface OtherUser {
  id: string
  full_name: string | null
  avatar_url: string | null
}

interface ConversationPreview {
  id: string
  salonId: string | null
  salonName: string | null
  otherUser: OtherUser | null
  lastMessage: { content: string; createdAt: string; senderId: string } | null
  unreadCount: number
  updatedAt: string | null
}

type LoadState =
  | { kind: 'loading' }
  | { kind: 'unauthenticated' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; conversations: ConversationPreview[] }

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

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const minutes = Math.floor((Date.now() - then) / 60000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'gestern'
  if (days < 7) return `vor ${days} Tagen`
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

export default function ChatListPage() {
  const router = useRouter()
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/messages')
        if (cancelled) return
        if (res.status === 401) {
          setState({ kind: 'unauthenticated' })
          return
        }
        if (!res.ok) {
          setState({ kind: 'error', message: 'Konversationen konnten nicht geladen werden.' })
          return
        }
        const data = (await res.json()) as ConversationPreview[]
        if (cancelled) return
        setState({ kind: 'ready', conversations: Array.isArray(data) ? data : [] })
      } catch {
        if (!cancelled) {
          setState({ kind: 'error', message: 'Keine Verbindung zum Server.' })
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const conversations = state.kind === 'ready' ? state.conversations : []
  const unreadTotal = conversations.reduce((n, c) => n + c.unreadCount, 0)

  const subline =
    state.kind === 'loading'
      ? 'Wird geladen …'
      : state.kind === 'ready'
        ? `${conversations.length} ${conversations.length === 1 ? 'Konversation' : 'Konversationen'}${
            unreadTotal > 0 ? ` · ${unreadTotal} ungelesen` : ''
          }`
        : ''

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
          {subline && <p style={{ fontSize: 13, color: 'var(--stone)' }}>{subline}</p>}
        </div>

        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {state.kind === 'loading' && (
            <p style={{ fontSize: 13, color: 'var(--stone)', textAlign: 'center', padding: '32px 12px' }}>
              Konversationen werden geladen …
            </p>
          )}

          {state.kind === 'unauthenticated' && (
            <div style={{ textAlign: 'center', padding: '28px 12px' }}>
              <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 14 }}>
                Melde dich an, um deine Nachrichten zu sehen.
              </p>
              <button onClick={() => router.push('/konto' as never)}
                style={{ padding: '10px 20px', borderRadius: 20, border: '1px solid rgba(196,168,106,0.35)', background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Zum Login</button>
            </div>
          )}

          {state.kind === 'error' && (
            <p role="alert" style={{ fontSize: 13, color: '#F2A79C', textAlign: 'center', padding: '32px 12px' }}>
              {state.message}
            </p>
          )}

          {state.kind === 'ready' && conversations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '28px 12px' }}>
              <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 6 }}>
                Noch keine Konversationen.
              </p>
              <p style={{ fontSize: 12, color: 'var(--stone)', opacity: 0.75 }}>
                Schreib einem Salon über sein Inserat — der Faden erscheint dann hier.
              </p>
            </div>
          )}

          {conversations.map(c => {
            const name = c.otherUser?.full_name || c.salonName || 'Unbekannt'
            return (
              <button key={c.id}
                onClick={() => router.push(`/nachrichten/${c.id}` as never)}
                style={{
                  background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                  borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                  display: 'flex', gap: 12, alignItems: 'center',
                  fontFamily: 'inherit', textAlign: 'left', color: 'var(--cream)',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                  {c.otherUser?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.otherUser.avatar_url} alt="" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="cinzel text-gold-metallic" style={{ fontSize: 16, fontWeight: 600 }}>{initials(name)}</span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{name}</span>
                    <span style={{ fontSize: 9.5, color: 'var(--stone)', flexShrink: 0, fontWeight: 500 }}>{relativeTime(c.updatedAt)}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--stone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {c.lastMessage?.content ?? 'Noch keine Nachrichten'}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span style={{ background: '#E85040', color: '#fff', fontSize: 10, fontWeight: 700, minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{c.unreadCount}</span>
                )}
              </button>
            )
          })}
        </div>

        <BottomNav role="mieter" />
      </div>
    </div>
  )
}
