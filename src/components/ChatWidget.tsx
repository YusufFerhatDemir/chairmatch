'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, Send, X, ArrowLeft } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

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
  lastMessage: {
    content: string
    createdAt: string
    senderId: string
  } | null
  unreadCount: number
  updatedAt: string
}

interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ConversationDetail {
  conversationId: string
  salonId: string | null
  salonName: string | null
  otherUser: OtherUser | null
  messages: Message[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Gestern'
  if (diffDays < 7) {
    return date.toLocaleDateString('de-DE', { weekday: 'short' })
  }
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  // ── Fetch conversations list ────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (!res.ok) return
      const data: ConversationPreview[] = await res.json()
      setConversations(data)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    if (open && !activeConv) {
      setLoading(true)
      fetchConversations().finally(() => setLoading(false))
    }
  }, [open, activeConv, fetchConversations])

  // Poll for new messages every 15s when widget is open
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      if (activeConv) {
        openConversation(activeConv.conversationId)
      } else {
        fetchConversations()
      }
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeConv])

  // ── Open a conversation ─────────────────────────────────────────────────────

  const openConversation = async (conversationId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/messages/${conversationId}`)
      if (!res.ok) return
      const data: ConversationDetail = await res.json()
      setActiveConv(data)

      // Update unread count locally
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      )
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  // ── Auto-scroll to latest message ───────────────────────────────────────────

  useEffect(() => {
    if (activeConv && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConv?.messages?.length, activeConv])

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!msgInput.trim() || !activeConv || sending) return

    const content = msgInput.trim()
    setMsgInput('')
    setSending(true)

    try {
      const receiverId = activeConv.otherUser?.id
      if (!receiverId) return

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId,
          content,
          salonId: activeConv.salonId ?? undefined,
        }),
      })

      if (res.ok) {
        // Refresh conversation messages
        await openConversation(activeConv.conversationId)
      }
    } catch {
      // silently fail
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="Chat öffnen"
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #D4AF37 0%, #B8962E 100%)',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(212, 175, 55, 0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(212, 175, 55, 0.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(212, 175, 55, 0.4)'
        }}
      >
        <MessageCircle size={24} color="#0B0B0F" />
        {totalUnread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#EF4444',
              color: '#fff',
              fontSize: 11,
              fontWeight: 700,
              borderRadius: '50%',
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #0B0B0F',
            }}
          >
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            width: '100%',
            maxWidth: 400,
            height: 'calc(100dvh - 60px)',
            maxHeight: 600,
            zIndex: 1001,
            background: '#0B0B0F',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 -4px 40px rgba(0,0,0,0.6)',
            animation: 'chatSlideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
              flexShrink: 0,
            }}
          >
            {activeConv ? (
              <button
                onClick={() => {
                  setActiveConv(null)
                  fetchConversations()
                }}
                aria-label="Zurück"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <ArrowLeft size={20} color="#D4AF37" />
              </button>
            ) : null}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  color: '#D4AF37',
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '0.5px',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeConv
                  ? activeConv.otherUser?.full_name || 'Nachricht'
                  : 'Nachrichten'}
              </p>
              {activeConv?.salonName && (
                <p
                  style={{
                    color: 'rgba(212, 175, 55, 0.5)',
                    fontSize: 11,
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  {activeConv.salonName}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setOpen(false)
                setActiveConv(null)
              }}
              aria-label="Schliessen"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
              }}
            >
              <X size={20} color="#888" />
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {loading && !activeConv ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(212, 175, 55, 0.4)',
                  fontSize: 13,
                }}
              >
                Laden...
              </div>
            ) : activeConv ? (
              /* ── Messages View ── */
              <>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '12px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {activeConv.messages.length === 0 && (
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        fontSize: 13,
                        textAlign: 'center',
                        marginTop: 40,
                      }}
                    >
                      Noch keine Nachrichten.
                    </p>
                  )}
                  {activeConv.messages.map((msg) => {
                    const isMine = msg.sender_id !== activeConv.otherUser?.id
                    return (
                      <div
                        key={msg.id}
                        style={{
                          display: 'flex',
                          justifyContent: isMine ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            maxWidth: '78%',
                            padding: '8px 12px',
                            borderRadius: 14,
                            borderBottomRightRadius: isMine ? 4 : 14,
                            borderBottomLeftRadius: isMine ? 14 : 4,
                            background: isMine
                              ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(184, 150, 46, 0.15) 100%)'
                              : 'rgba(255, 255, 255, 0.06)',
                            border: isMine
                              ? '1px solid rgba(212, 175, 55, 0.25)'
                              : '1px solid rgba(255, 255, 255, 0.08)',
                          }}
                        >
                          <p
                            style={{
                              color: isMine ? '#E8D06A' : 'rgba(255, 255, 255, 0.85)',
                              fontSize: 13,
                              lineHeight: 1.45,
                              margin: 0,
                              wordBreak: 'break-word',
                            }}
                          >
                            {msg.content}
                          </p>
                          <p
                            style={{
                              color: 'rgba(255,255,255,0.25)',
                              fontSize: 10,
                              margin: 0,
                              marginTop: 4,
                              textAlign: isMine ? 'right' : 'left',
                            }}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(212, 175, 55, 0.12)',
                    flexShrink: 0,
                  }}
                >
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nachricht schreiben..."
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(212, 175, 55, 0.15)',
                      borderRadius: 20,
                      padding: '9px 14px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!msgInput.trim() || sending}
                    aria-label="Senden"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background:
                        msgInput.trim() && !sending
                          ? 'linear-gradient(135deg, #D4AF37, #B8962E)'
                          : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      cursor: msgInput.trim() && !sending ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.2s',
                    }}
                  >
                    <Send
                      size={16}
                      color={msgInput.trim() && !sending ? '#0B0B0F' : '#555'}
                    />
                  </button>
                </div>
              </>
            ) : conversations.length === 0 ? (
              /* ── Empty State ── */
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 12,
                  padding: 32,
                }}
              >
                <MessageCircle size={40} color="rgba(212, 175, 55, 0.25)" />
                <p
                  style={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: 13,
                    textAlign: 'center',
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  Noch keine Nachrichten.
                  <br />
                  Starten Sie ein Gespräch über eine Salon-Seite.
                </p>
              </div>
            ) : (
              /* ── Conversations List ── */
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                }}
              >
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      width: '100%',
                      padding: '12px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212, 175, 55, 0.06)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(184, 150, 46, 0.12))',
                        border: '1px solid rgba(212, 175, 55, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      {conv.otherUser?.avatar_url ? (
                        <img
                          src={conv.otherUser.avatar_url}
                          alt=""
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            color: '#D4AF37',
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {initials(conv.otherUser?.full_name ?? null)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        <p
                          style={{
                            color: '#fff',
                            fontWeight: conv.unreadCount > 0 ? 700 : 500,
                            fontSize: 13,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.otherUser?.full_name || 'Unbekannt'}
                        </p>
                        {conv.lastMessage && (
                          <span
                            style={{
                              color: 'rgba(255,255,255,0.3)',
                              fontSize: 10,
                              flexShrink: 0,
                            }}
                          >
                            {formatTime(conv.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 8,
                          marginTop: 3,
                        }}
                      >
                        <p
                          style={{
                            color: conv.unreadCount > 0
                              ? 'rgba(255,255,255,0.6)'
                              : 'rgba(255,255,255,0.3)',
                            fontSize: 12,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontWeight: conv.unreadCount > 0 ? 600 : 400,
                          }}
                        >
                          {conv.lastMessage?.content || 'Keine Nachrichten'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span
                            style={{
                              background: '#D4AF37',
                              color: '#0B0B0F',
                              fontSize: 10,
                              fontWeight: 800,
                              borderRadius: '50%',
                              width: 18,
                              height: 18,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </span>
                        )}
                      </div>
                      {conv.salonName && (
                        <p
                          style={{
                            color: 'rgba(212, 175, 55, 0.4)',
                            fontSize: 10,
                            margin: 0,
                            marginTop: 2,
                          }}
                        >
                          {conv.salonName}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-up animation */}
      <style>{`
        @keyframes chatSlideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
