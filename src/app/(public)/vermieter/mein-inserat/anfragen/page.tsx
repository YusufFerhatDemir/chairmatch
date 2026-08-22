'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useTranslations } from '@/i18n/client'
import { apiGet, apiSend, ApiError } from '@/lib/client-api'

/**
 * Eingegangene Anfrage aus `rental_requests` — im Gegensatz zu den
 * Beispieldaten weiter unten eine echte Anfrage eines echten Nutzers.
 */
interface RealRequest {
  id: string
  request_type: 'miete' | 'besichtigung'
  preferred_date: string
  preferred_time: string | null
  duration_unit: string | null
  units: number | null
  message: string | null
  estimated_cents: number
  status: 'open' | 'accepted' | 'declined' | 'withdrawn'
  rental_equipment?: { name?: string } | null
}

const REQUEST_STATUS_LABELS: Record<string, string> = {
  open: 'OFFEN',
  accepted: 'BESTÄTIGT',
  declined: 'ABGELEHNT',
  withdrawn: 'ZURÜCKGEZOGEN',
}

interface Anfrage {
  id: string
  customerName: string
  customerInitials: string
  customerJob: string
  yearsExp: number
  hasLicense: boolean
  dateRange: string
  duration: string
  totalPrice: number
  message: string
  receivedAt: string
  status: 'new' | 'confirmed' | 'rejected'
  rejectReason?: string
}

const MOCK_ANFRAGEN: Anfrage[] = [
  { id: 'a1', customerName: 'Marko F.', customerInitials: 'MF', customerJob: 'Friseur', yearsExp: 5, hasLicense: true, dateRange: '20.–22. Mai', duration: '3 Tage', totalPrice: 270, message: 'Hallo Anna! Ich bin Friseurin und möchte deinen Stuhl für Probetage mieten. Habe 5 Jahre Berufserfahrung und meinen Meisterbrief. Freue mich auf deine Antwort!', receivedAt: 'vor 10 Min', status: 'new' },
  { id: 'a2', customerName: 'Sarah B.', customerInitials: 'SB', customerJob: 'Kosmetikerin', yearsExp: 8, hasLicense: true, dateRange: '24. Mai', duration: 'Ganzer Tag', totalPrice: 90, message: 'Brauche kurzfristig einen Platz für eine Kundin. Sehr zuverlässig, viele Stammkunden.', receivedAt: 'vor 2 Std', status: 'new' },
  { id: 'a3', customerName: 'Anna L.', customerInitials: 'AL', customerJob: 'Make-Up Artist', yearsExp: 4, hasLicense: false, dateRange: '26. Mai', duration: '6 Std.', totalPrice: 90, message: 'Hi, suche eine Liege für Make-Up und Wimpern-Termine. Bringe eigene Materialien.', receivedAt: 'vor 5 Std', status: 'new' },
  { id: 'a4', customerName: 'Tim H.', customerInitials: 'TH', customerJob: 'Barber', yearsExp: 3, hasLicense: true, dateRange: '01. Juni', duration: '4 Std.', totalPrice: 60, message: 'Suche Wochenend-Platz. Bin in Köln neu, sehr motiviert.', receivedAt: 'gestern', status: 'confirmed' },
  { id: 'a5', customerName: 'Lukas K.', customerInitials: 'LK', customerJob: 'Maskenbildner', yearsExp: 2, hasLicense: false, dateRange: '28. Mai', duration: 'Halber Tag', totalPrice: 50, message: 'Probetag für ein Shooting.', receivedAt: 'vor 3 Tagen', status: 'rejected', rejectReason: 'Termin belegt' },
]

export default function VermieterAnfragenPage() {
  const router = useRouter()
  const [filter, setFilter] = useState<'new' | 'confirmed' | 'rejected' | 'all'>('new')
  const t = useTranslations()
  const [anfragen, setAnfragen] = useState<Anfrage[]>(MOCK_ANFRAGEN)

  const [realRequests, setRealRequests] = useState<RealRequest[]>([])
  const [realLoading, setRealLoading] = useState(true)
  const [realError, setRealError] = useState<string | null>(null)
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null)

  const loadRealRequests = useCallback(async () => {
    setRealLoading(true)
    try {
      const res = await apiGet<{ requests: RealRequest[] }>('/api/rental-requests?role=recipient')
      setRealRequests(res.requests)
      setRealError(null)
    } catch (err) {
      // Nicht eingeloggt ist kein Fehler, den man dem Nutzer hier vorwerfen muss.
      setRealError(err instanceof ApiError && err.status === 401 ? null : (err instanceof Error ? err.message : 'Anfragen konnten nicht geladen werden'))
    } finally {
      setRealLoading(false)
    }
  }, [])

  useEffect(() => { void loadRealRequests() }, [loadRealRequests])

  async function decideRequest(id: string, status: 'accepted' | 'declined') {
    if (busyRequestId) return
    setBusyRequestId(id)
    setRealError(null)
    try {
      const res = await apiSend<{ request: RealRequest }>(`/api/rental-requests/${id}`, 'PATCH', { status })
      setRealRequests(prev => prev.map(r => (r.id === id ? { ...r, ...res.request } : r)))
    } catch (err) {
      setRealError(err instanceof Error ? err.message : 'Status konnte nicht geändert werden')
    } finally {
      setBusyRequestId(null)
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem('cm_vermieter_anfragen_state')
      if (stored) {
        const states = JSON.parse(stored)
        setAnfragen(MOCK_ANFRAGEN.map(a => ({ ...a, ...(states[a.id] || {}) })))
      }
    } catch {}
  }, [])

  function updateStatus(id: string, status: 'confirmed' | 'rejected', reason?: string) {
    const next = anfragen.map(a => a.id === id ? { ...a, status, rejectReason: reason } : a)
    setAnfragen(next)
    try {
      const states: Record<string, Partial<Anfrage>> = {}
      next.forEach(a => { states[a.id] = { status: a.status, rejectReason: a.rejectReason } })
      localStorage.setItem('cm_vermieter_anfragen_state', JSON.stringify(states))
    } catch {}
  }

  const filtered = filter === 'all' ? anfragen : anfragen.filter(a => a.status === filter)
  const newCount = anfragen.filter(a => a.status === 'new').length
  const confirmedCount = anfragen.filter(a => a.status === 'confirmed').length
  const weekRevenue = anfragen.filter(a => a.status === 'confirmed').reduce((s, a) => s + a.totalPrice, 0)

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
          <button onClick={() => router.push('/vermieter/mein-inserat')}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.title')}</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <div style={{ padding: '0 20px 16px' }}>
          <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>{t('requests.title')}</h2>
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>{t('requests.subtitle')}</p>
        </div>

        {/* KPIs */}
        <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel" style={{ fontSize: 19, fontWeight: 600, background: 'linear-gradient(135deg,#FF8888,#E85040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{newCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{t('requests.kpiNew')}</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel" style={{ fontSize: 19, fontWeight: 600, background: 'linear-gradient(135deg,#6ABF80,#4A8A5A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{confirmedCount}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{t('requests.kpiConfirmed')}</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>€{weekRevenue}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{t('requests.kpiWeek')}</div>
          </div>
        </div>

        {/* Echte Anfragen aus der Datenbank */}
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 10, letterSpacing: 1.6, color: 'var(--gold2)', textTransform: 'uppercase', fontWeight: 700 }}>
            Eingegangene Anfragen
          </p>

          {realLoading && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

          {realError && (
            <p role="alert" style={{ fontSize: 12, color: '#FF8888' }}>{realError}</p>
          )}

          {!realLoading && !realError && realRequests.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.5 }}>
              Noch keine Anfrage eingegangen. Sobald jemand deinen Platz anfragt, steht sie hier.
            </p>
          )}

          {realRequests.map(r => (
            <div key={r.id} style={{
              background: 'var(--c1)', border: '1px solid rgba(191,149,63,0.22)',
              borderRadius: 16, padding: 14,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cream)' }}>
                    {r.request_type === 'besichtigung' ? 'Besichtigung' : 'Mietanfrage'}
                    {r.rental_equipment?.name ? ` · ${r.rental_equipment.name}` : ''}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                    {r.preferred_date}{r.preferred_time ? ` · ${r.preferred_time.slice(0, 5)}` : ''}
                    {r.units && r.duration_unit ? ` · ${r.units} × ${r.duration_unit}` : ''}
                    {r.estimated_cents > 0 ? ` · ca. ${(r.estimated_cents / 100).toFixed(0)} €` : ''}
                  </p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1, flexShrink: 0,
                  background: r.status === 'accepted' ? 'rgba(74,138,90,0.15)' : r.status === 'open' ? 'rgba(196,168,106,0.15)' : 'rgba(232,80,64,0.15)',
                  color: r.status === 'accepted' ? '#6ABF80' : r.status === 'open' ? 'var(--gold2)' : '#FF8888',
                }}>{REQUEST_STATUS_LABELS[r.status] ?? r.status}</span>
              </div>

              {r.message && (
                <p style={{ fontSize: 12, color: 'var(--cream)', lineHeight: 1.5, marginTop: 10 }}>{r.message}</p>
              )}

              {r.status === 'open' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => decideRequest(r.id, 'accepted')}
                    disabled={busyRequestId === r.id}
                    style={{
                      flex: 1, padding: 9, borderRadius: 10,
                      background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                      color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 12,
                      cursor: busyRequestId === r.id ? 'wait' : 'pointer', opacity: busyRequestId === r.id ? 0.6 : 1,
                    }}
                  >Bestätigen</button>
                  <button
                    onClick={() => decideRequest(r.id, 'declined')}
                    disabled={busyRequestId === r.id}
                    style={{
                      flex: 1, padding: 9, borderRadius: 10,
                      background: 'transparent', color: '#FF8888',
                      border: '1px solid rgba(232,80,64,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                      cursor: busyRequestId === r.id ? 'wait' : 'pointer', opacity: busyRequestId === r.id ? 0.6 : 1,
                    }}
                  >Ablehnen</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: '0 16px 8px' }}>
          <p style={{ fontSize: 10, letterSpacing: 1.6, color: 'var(--stone)', textTransform: 'uppercase', fontWeight: 700 }}>
            Beispiel-Anfragen (Demo)
          </p>
        </div>

        {/* Filter */}
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {[
            { k: 'new', l: `${t('requests.filterNew')} (${newCount})` },
            { k: 'confirmed', l: t('requests.filterConfirmed') },
            { k: 'rejected', l: t('requests.filterRejected') },
            { k: 'all', l: t('requests.filterAll') },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k as 'new' | 'confirmed' | 'rejected' | 'all')}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                fontSize: 11, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
                background: filter === k ? 'linear-gradient(135deg, #BF953F 0%, #FCF6BA 22%, #B38728 45%, #FBF5B7 67%, #AA771C 100%)' : 'rgba(176,144,96,0.08)',
                border: filter === k ? 'none' : '1px solid rgba(176,144,96,0.22)',
                color: filter === k ? '#1a1000' : 'var(--gold2)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{l}</button>
          ))}
        </div>

        {/* List */}
        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
              <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>{t('requests.emptyTitle')}</p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>{t('requests.emptyText')}</p>
            </div>
          ) : filtered.map(a => {
            const isNew = a.status === 'new'
            const isConfirmed = a.status === 'confirmed'
            const isRejected = a.status === 'rejected'
            return (
              <div key={a.id} style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: isNew ? '1.5px solid #E85040' : '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, padding: 14,
                boxShadow: isNew ? '0 0 16px rgba(232,80,64,0.15)' : 'none',
                opacity: isRejected ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{a.customerInitials}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{a.customerName}</p>
                    <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{a.customerJob} · {a.yearsExp} {t('requests.years')}</p>
                    {isNew && <span style={{ display: 'inline-block', background: '#E85040', color: '#fff', fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{t('requests.tagNew')}</span>}
                    {isConfirmed && <span style={{ display: 'inline-block', background: 'rgba(74,138,90,0.18)', color: '#6ABF80', fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{t('requests.tagConfirmed')}</span>}
                    {isRejected && <span style={{ display: 'inline-block', background: 'rgba(232,80,64,0.15)', color: '#FF8888', fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1, marginTop: 3 }}>{t('requests.tagRejected')}</span>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--stone)', textAlign: 'right', flexShrink: 0 }}>{a.receivedAt}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, padding: 10, background: 'rgba(196,168,106,0.04)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblDate')}</div>
                    <div style={{ color: 'var(--cream)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>{a.dateRange}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblDuration')}</div>
                    <div style={{ color: 'var(--cream)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>{a.duration}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblTotal')}</div>
                    <div className="cinzel text-gold-metallic" style={{ fontWeight: 700, marginTop: 2, fontSize: 14 }}>{a.totalPrice} €</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblLicense')}</div>
                    <div style={{ color: a.hasLicense ? '#6ABF80' : 'var(--stone)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>{a.hasLicense ? t('requests.licenseYes') : t('requests.licenseNo')}</div>
                  </div>
                </div>

                {!isRejected && a.message && (
                  <p style={{ fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.5, padding: 10, background: 'rgba(11,11,15,0.4)', borderRadius: 10, borderLeft: '3px solid var(--gold)', marginBottom: 10, fontStyle: 'italic' }}>
                    &ldquo;{a.message}&rdquo;
                  </p>
                )}

                {isRejected && a.rejectReason && (
                  <p style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 6 }}>{t('requests.reasonPrefix')} {a.rejectReason}</p>
                )}

                {isNew && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => updateStatus(a.id, 'confirmed')}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'linear-gradient(135deg,#6ABF80,#4A8A5A)', color: '#0B0B0F', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
                    >✓ {t('requests.btnConfirm')}</button>
                    <button onClick={() => router.push('/nachrichten' as never)}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', border: '1px solid rgba(196,168,106,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >💬 {t('requests.btnChat')}</button>
                    <button onClick={() => { const reason = prompt(t('requests.reasonPrompt')) || t('requests.defaultReason'); updateStatus(a.id, 'rejected', reason) }}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'transparent', color: '#FF8888', border: '1px solid rgba(232,80,64,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >✕ {t('requests.btnReject')}</button>
                  </div>
                )}

                {isConfirmed && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => router.push('/nachrichten' as never)}
                      style={{ flex: 2, padding: 11, borderRadius: 10, background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', border: '1px solid rgba(196,168,106,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >💬 {t('requests.btnChatOpen')}</button>
                    <button onClick={() => updateStatus(a.id, 'rejected', 'Storniert')}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'transparent', color: '#FF8888', border: '1px solid rgba(232,80,64,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >✕ {t('requests.btnCancel')}</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <BottomNav role="vermieter" />
      </div>
    </div>
  )
}
