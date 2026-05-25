'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { MessageCircle, Send, X, ArrowLeft, Sparkles } from 'lucide-react'
import { useTranslations, useLocale } from '@/i18n/client'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { MASTER_FAQS } from '@/lib/seo-data/faq-master'

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

interface AssistantMsg {
  role: 'bot' | 'user'
  text: string
}

type Mode = 'list' | 'conversation' | 'assistant'

// ── Marken-Farben (ChairMatch Original) ─────────────────────────────────────────

const GOLD = '#C4A86A'
const GOLD_GRADIENT = 'var(--gold-gradient)'

// ── FAQ-Assistent (clientseitig, keine externe KI, keine Kosten) ────────────────

const STOPWORDS = new Set([
  'der', 'die', 'das', 'und', 'ich', 'ist', 'wie', 'was', 'ein', 'eine', 'fuer', 'für',
  'auf', 'mit', 'von', 'den', 'dem', 'es', 'zu', 'im', 'am', 'bei', 'oder', 'auch',
  'man', 'wer', 'wo', 'wann', 'warum', 'kann', 'muss', 'soll', 'hat', 'sind', 'wird',
  'the', 'a', 'an', 'is', 'how', 'what', 'do', 'does', 'i', 'to', 'for', 'of', 'on',
  'can', 'are', 'my', 'me', 'and', 'or', 'with',
])

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\wäöüß ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w))
}

interface FaqHit {
  faq: typeof MASTER_FAQS[number]
  related: typeof MASTER_FAQS
}

function findFaqAnswer(query: string): FaqHit | null {
  const qt = tokenize(query)
  if (qt.length === 0) return null

  let best: typeof MASTER_FAQS[number] | null = null
  let bestScore = 0

  for (const f of MASTER_FAQS) {
    const qWords = tokenize(f.question)
    const aWords = tokenize(f.answer)
    const kw = f.primaryKeyword ? tokenize(f.primaryKeyword) : []
    let score = 0
    for (const tk of qt) {
      if (kw.includes(tk)) score += 4
      if (qWords.includes(tk)) score += 3
      if (aWords.includes(tk)) score += 1
    }
    if (score > bestScore) {
      bestScore = score
      best = f
    }
  }

  if (!best || bestScore < 3) return null

  const bestTags = new Set(best.tags)
  const related = MASTER_FAQS.filter(
    (f) => f.id !== best!.id && f.tags.some((t) => bestTags.has(t))
  ).slice(0, 2)

  return { faq: best, related }
}

const STARTER_FAQ_IDS = ['was-kostet-stuhl-pro-tag', 'was-ist-stuhl-miete', 'wie-buche-ich']

// ── Helpers ────────────────────────────────────────────────────────────────────

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
  const t = useTranslations('chat')
  const { locale } = useLocale()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('list')
  const [conversations, setConversations] = useState<ConversationPreview[]>([])
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [msgInput, setMsgInput] = useState('')
  const [sending, setSending] = useState(false)

  // KI-Assistent (FAQ-basiert)
  const [assistantMsgs, setAssistantMsgs] = useState<AssistantMsg[]>([])
  const [assistantChips, setAssistantChips] = useState<string[]>([])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantTyping, setAssistantTyping] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const assistantEndRef = useRef<HTMLDivElement>(null)

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const localeTag =
    ({ de: 'de-DE', en: 'en-GB', tr: 'tr-TR', ar: 'ar' } as Record<string, string>)[locale] ||
    'de-DE'

  const starterQuestions = useMemo(() => {
    const picks = STARTER_FAQ_IDS.map((id) => MASTER_FAQS.find((f) => f.id === id)).filter(
      Boolean
    ) as typeof MASTER_FAQS
    const list = picks.length >= 3 ? picks : MASTER_FAQS.slice(0, 3)
    return list.map((f) => f.question)
  }, [])

  function formatTime(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
    if (diffDays <= 0) {
      return date.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return t('yesterday')
    if (diffDays < 7) return date.toLocaleDateString(localeTag, { weekday: 'short' })
    return date.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit' })
  }

  // ── Fetch conversations list ────────────────────────────────────────────────

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages')
      if (!res.ok) return
      const data: ConversationPreview[] = await res.json()
      setConversations(data)
    } catch {
      /* silently fail */
    }
  }, [])

  useEffect(() => {
    if (open && mode === 'list') {
      setLoading(true)
      fetchConversations().finally(() => setLoading(false))
    }
  }, [open, mode, fetchConversations])

  // Poll for new messages every 15s when widget is open
  useEffect(() => {
    if (!open) return
    const interval = setInterval(() => {
      if (mode === 'conversation' && activeConv) {
        openConversation(activeConv.conversationId)
      } else if (mode === 'list') {
        fetchConversations()
      }
    }, 15000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, activeConv])

  // ── Open a conversation ─────────────────────────────────────────────────────

  const openConversation = async (conversationId: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/messages/${conversationId}`)
      if (!res.ok) return
      const data: ConversationDetail = await res.json()
      setActiveConv(data)
      setMode('conversation')
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      )
    } catch {
      /* silently fail */
    } finally {
      setLoading(false)
    }
  }

  // ── KI-Assistent ────────────────────────────────────────────────────────────

  const openAssistant = () => {
    setMode('assistant')
    if (assistantMsgs.length === 0) {
      setAssistantMsgs([{ role: 'bot', text: t('assistantGreeting') }])
      setAssistantChips(starterQuestions)
    }
  }

  const askAssistant = (question: string) => {
    const query = question.trim()
    if (!query || assistantTyping) return
    setAssistantInput('')
    setAssistantMsgs((m) => [...m, { role: 'user', text: query }])
    setAssistantChips([])
    setAssistantTyping(true)

    const hit = findFaqAnswer(query)
    // Menschliches Tipp-Gefuehl: kurze, leicht variierende Pause statt Sofort-Antwort.
    const delay = 650 + Math.round(Math.random() * 500)
    window.setTimeout(() => {
      setAssistantTyping(false)
      if (hit) {
        setAssistantMsgs((m) => [...m, { role: 'bot', text: hit.faq.answer }])
        setAssistantChips(hit.related.map((f) => f.question))
      } else {
        setAssistantMsgs((m) => [...m, { role: 'bot', text: t('assistantNoAnswer') }])
        setAssistantChips(starterQuestions)
      }
    }, delay)
  }

  // ── Auto-scroll ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === 'conversation' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConv?.messages?.length, mode])

  useEffect(() => {
    if (mode === 'assistant' && assistantEndRef.current) {
      assistantEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [assistantMsgs.length, assistantChips.length, assistantTyping, mode])

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
        await openConversation(activeConv.conversationId)
      }
    } catch {
      /* silently fail */
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

  const handleAssistantKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      askAssistant(assistantInput)
    }
  }

  const goBack = () => {
    if (mode === 'conversation') {
      setActiveConv(null)
      setMode('list')
      fetchConversations()
    } else if (mode === 'assistant') {
      setMode('list')
    }
  }

  // ── Header title ────────────────────────────────────────────────────────────

  const headerTitle =
    mode === 'conversation'
      ? activeConv?.otherUser?.full_name || t('title')
      : mode === 'assistant'
        ? t('assistantName')
        : t('title')

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label={t('openChat')}
        style={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: GOLD_GRADIENT,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(196,168,106,0.4)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        <MessageCircle size={24} color="#1A1308" />
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
              borderBottom: '1px solid rgba(196,168,106,0.15)',
              flexShrink: 0,
            }}
          >
            {mode !== 'list' && (
              <button
                onClick={goBack}
                aria-label={t('back')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                }}
              >
                <ArrowLeft size={20} color={GOLD} />
              </button>
            )}

            {mode === 'assistant' && (
              <BrandLogo size={26} variant="glow" animateStar={false} />
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="text-gold-metallic"
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: '0.5px',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {headerTitle}
              </p>
              {mode === 'conversation' && activeConv?.salonName && (
                <p style={{ color: 'rgba(196,168,106,0.5)', fontSize: 11, margin: '2px 0 0' }}>
                  {activeConv.salonName}
                </p>
              )}
              {mode === 'assistant' && (
                <p style={{ color: 'rgba(196,168,106,0.5)', fontSize: 11, margin: '2px 0 0' }}>
                  {t('assistantTagline')}
                </p>
              )}
            </div>

            <button
              onClick={() => {
                setOpen(false)
                setActiveConv(null)
                setMode('list')
              }}
              aria-label={t('close')}
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
            {/* ── ASSISTANT VIEW ── */}
            {mode === 'assistant' ? (
              <>
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '14px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 9,
                  }}
                >
                  {assistantMsgs.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '82%',
                          padding: '9px 12px',
                          borderRadius: 14,
                          borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                          borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                          background:
                            m.role === 'user' ? GOLD_GRADIENT : 'rgba(255,255,255,0.06)',
                          border:
                            m.role === 'user'
                              ? 'none'
                              : '1px solid rgba(196,168,106,0.18)',
                        }}
                      >
                        <p
                          style={{
                            color: m.role === 'user' ? '#1A1308' : 'rgba(255,255,255,0.88)',
                            fontWeight: m.role === 'user' ? 600 : 400,
                            fontSize: 13,
                            lineHeight: 1.5,
                            margin: 0,
                            wordBreak: 'break-word',
                          }}
                        >
                          {m.text}
                        </p>
                      </div>
                    </div>
                  ))}

                  {assistantTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 14,
                          borderBottomLeftRadius: 4,
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(196,168,106,0.18)',
                          display: 'flex',
                          gap: 4,
                          alignItems: 'center',
                        }}
                      >
                        <span className="cm-typing-dot" />
                        <span className="cm-typing-dot" style={{ animationDelay: '0.18s' }} />
                        <span className="cm-typing-dot" style={{ animationDelay: '0.36s' }} />
                      </div>
                    </div>
                  )}

                  {assistantChips.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 2 }}>
                      {assistantChips.map((chip, i) => (
                        <button
                          key={i}
                          onClick={() => askAssistant(chip)}
                          style={{
                            fontSize: 11.5,
                            color: GOLD,
                            background: 'transparent',
                            border: '1px solid rgba(196,168,106,0.28)',
                            borderRadius: 14,
                            padding: '6px 11px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={assistantEndRef} />
                </div>

                {/* Assistant input */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderTop: '1px solid rgba(196,168,106,0.12)',
                    flexShrink: 0,
                  }}
                >
                  <input
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    onKeyDown={handleAssistantKeyDown}
                    placeholder={t('assistantInputPlaceholder')}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(196,168,106,0.15)',
                      borderRadius: 20,
                      padding: '9px 14px',
                      color: '#fff',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => askAssistant(assistantInput)}
                    disabled={!assistantInput.trim()}
                    aria-label={t('send')}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: assistantInput.trim() ? GOLD_GRADIENT : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      cursor: assistantInput.trim() ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Send size={16} color={assistantInput.trim() ? '#1A1308' : '#555'} />
                  </button>
                </div>
              </>
            ) : loading && mode === 'list' ? (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(196,168,106,0.4)',
                  fontSize: 13,
                }}
              >
                {t('loading')}
              </div>
            ) : mode === 'conversation' && activeConv ? (
              /* ── MESSAGES VIEW ── */
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
                      {t('noMessages')}
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
                              ? 'linear-gradient(135deg, rgba(196,168,106,0.22) 0%, rgba(170,119,28,0.16) 100%)'
                              : 'rgba(255,255,255,0.06)',
                            border: isMine
                              ? '1px solid rgba(196,168,106,0.28)'
                              : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <p
                            style={{
                              color: isMine ? '#E8D89A' : 'rgba(255,255,255,0.85)',
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
                              margin: '4px 0 0',
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
                    borderTop: '1px solid rgba(196,168,106,0.12)',
                    flexShrink: 0,
                  }}
                >
                  <input
                    value={msgInput}
                    onChange={(e) => setMsgInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('inputPlaceholder')}
                    style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(196,168,106,0.15)',
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
                    aria-label={t('send')}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background:
                        msgInput.trim() && !sending ? GOLD_GRADIENT : 'rgba(255,255,255,0.08)',
                      border: 'none',
                      cursor: msgInput.trim() && !sending ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Send size={16} color={msgInput.trim() && !sending ? '#1A1308' : '#555'} />
                  </button>
                </div>
              </>
            ) : (
              /* ── LIST VIEW (mit angepinntem KI-Assistenten) ── */
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Angepinnter KI-Assistent — immer da, auch ohne Login */}
                <button
                  onClick={openAssistant}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    padding: '14px 16px',
                    background: '#111114',
                    border: 'none',
                    borderBottom: '1px solid rgba(196,168,106,0.15)',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <BrandLogo size={40} variant="glow" animateStar={false} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: '#F5F5F7', fontWeight: 700, fontSize: 14, margin: 0 }}>
                      {t('assistantName')}
                    </p>
                    <p style={{ color: 'rgba(245,245,247,0.6)', fontSize: 11.5, margin: '1px 0 0' }}>
                      {t('assistantTagline')}
                    </p>
                  </div>
                </button>

                {conversations.length === 0 ? (
                  /* Leer-Zustand */
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      padding: '40px 32px',
                      textAlign: 'center',
                    }}
                  >
                    <MessageCircle size={38} color="rgba(196,168,106,0.25)" />
                    <p style={{ color: '#F5F5F7', fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {t('emptyTitle')}
                    </p>
                    <p
                      style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 12.5,
                        lineHeight: 1.55,
                        margin: 0,
                      }}
                    >
                      {t('emptyText')}
                    </p>
                    <Link
                      href="/search"
                      onClick={() => setOpen(false)}
                      style={{
                        marginTop: 6,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 7,
                        fontSize: 12.5,
                        fontWeight: 700,
                        color: '#1A1308',
                        background: GOLD_GRADIENT,
                        padding: '9px 18px',
                        borderRadius: 9,
                        textDecoration: 'none',
                      }}
                    >
                      <Sparkles size={15} color="#1A1308" />
                      {t('browseSalons')}
                    </Link>
                  </div>
                ) : (
                  conversations.map((conv) => (
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
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, rgba(196,168,106,0.2), rgba(170,119,28,0.12))',
                          border: '1px solid rgba(196,168,106,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {conv.otherUser?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conv.otherUser.avatar_url}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <span style={{ color: GOLD, fontSize: 14, fontWeight: 700 }}>
                            {initials(conv.otherUser?.full_name ?? null)}
                          </span>
                        )}
                      </div>

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
                            {conv.otherUser?.full_name || t('unknownUser')}
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
                              color:
                                conv.unreadCount > 0
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
                            {conv.lastMessage?.content || t('noMessages')}
                          </p>
                          {conv.unreadCount > 0 && (
                            <span
                              style={{
                                background: GOLD,
                                color: '#1A1308',
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
                              color: 'rgba(196,168,106,0.4)',
                              fontSize: 10,
                              margin: '2px 0 0',
                            }}
                          >
                            {conv.salonName}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes chatSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes cmTypingBlink {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        .cm-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C4A86A;
          display: inline-block;
          animation: cmTypingBlink 1.1s infinite ease-in-out;
        }
      `}</style>
    </>
  )
}
