'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useTranslations } from '@/i18n/client'
import { apiGet, apiSend, ApiError } from '@/lib/client-api'

/**
 * Eingegangene Anfragen (Vermieter) — /vermieter/mein-inserat/anfragen
 *
 * Die Seite hat bis 2026-08-27 zwei Listen untereinander gezeigt: oben die
 * echten Anfragen aus `rental_requests`, darunter unter der Ueberschrift
 * "Beispiel-Anfragen (Demo)" fuenf erfundene Interessentinnen mit erfundenen
 * Berufen, Berufsjahren, Meisterbriefen und Preisen — jedem Vermieter
 * dieselben. Schlimmer als die Liste selbst waren zwei Dinge daran:
 *
 *  1. Die KPI-Kacheln ganz oben ("neu", "bestaetigt", "Umsatz Woche")
 *     rechneten AUSSCHLIESSLICH mit den erfundenen Zeilen. Der ausgewiesene
 *     Wochenumsatz hatte nie etwas mit dem Salon zu tun.
 *  2. Bestaetigen und Ablehnen schrieben ihren Ausgang nach
 *     localStorage['cm_vermieter_anfragen_state']. Es sah aus wie eine
 *     Entscheidung, blieb im Browser des Vermieters liegen und erreichte
 *     niemanden — vorgetaeuschte Persistenz in Reinform.
 *
 * Jetzt haengt alles an GET /api/rental-requests?role=recipient und
 * PATCH /api/rental-requests/[id]. Der Name des Anfragenden kommt aus
 * `counterpart` (die Route laedt ihn aus `profiles`); ist keiner hinterlegt,
 * steht das da — statt eines ausgedachten.
 */

interface Counterpart {
  id: string
  fullName: string | null
}

interface RentalRequest {
  id: string
  request_type: 'miete' | 'besichtigung'
  preferred_date: string
  preferred_time: string | null
  duration_unit: string | null
  units: number | null
  message: string | null
  estimated_cents: number
  status: 'open' | 'accepted' | 'declined' | 'withdrawn'
  created_at: string | null
  rental_equipment?: { name?: string; type?: string } | null
  counterpart?: Counterpart | null
}

type Filter = 'open' | 'accepted' | 'declined' | 'all'

const STATUS_LABELS: Record<string, string> = {
  open: 'OFFEN',
  accepted: 'BESTÄTIGT',
  declined: 'ABGELEHNT',
  withdrawn: 'ZURÜCKGEZOGEN',
}

const DURATION_LABELS: Record<string, [string, string]> = {
  hour: ['Stunde', 'Stunden'],
  day: ['Tag', 'Tage'],
  week: ['Woche', 'Wochen'],
  month: ['Monat', 'Monate'],
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

function initials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function dauer(units: number | null, unit: string | null): string | null {
  if (!units || !unit) return null
  const labels = DURATION_LABELS[unit]
  if (!labels) return `${units} × ${unit}`
  return `${units} ${units === 1 ? labels[0] : labels[1]}`
}

/** ISO-Datum → "20.05.2026"; nicht parsbare Werte bleiben unveraendert. */
function datum(iso: string | null): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

export default function VermieterAnfragenPage() {
  const router = useRouter()
  const t = useTranslations()
  const [filter, setFilter] = useState<Filter>('open')

  const [requests, setRequests] = useState<RentalRequest[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const laden = useCallback(async () => {
    setLaedt(true)
    try {
      const res = await apiGet<{ requests: RentalRequest[] }>('/api/rental-requests?role=recipient')
      setRequests(res.requests ?? [])
      setFehler(null)
    } catch (err) {
      setRequests([])
      setFehler(
        err instanceof ApiError && err.status === 401
          ? 'Bitte melde dich an, um deine Anfragen zu sehen.'
          : err instanceof Error
            ? err.message
            : 'Anfragen konnten nicht geladen werden',
      )
    } finally {
      setLaedt(false)
    }
  }, [])

  useEffect(() => { void laden() }, [laden])

  async function entscheiden(id: string, status: 'accepted' | 'declined') {
    if (busyId) return
    setBusyId(id)
    setFehler(null)
    try {
      const res = await apiSend<{ request: RentalRequest }>(`/api/rental-requests/${id}`, 'PATCH', { status })
      // Die Serverantwort ist massgeblich — der lokale State uebernimmt sie,
      // statt eine eigene Wahrheit zu fuehren.
      setRequests(prev => prev.map(r => (r.id === id ? { ...r, ...res.request } : r)))
    } catch (err) {
      setFehler(err instanceof Error ? err.message : 'Status konnte nicht geändert werden')
    } finally {
      setBusyId(null)
    }
  }

  const counts = useMemo(() => ({
    open: requests.filter(r => r.status === 'open').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    declined: requests.filter(r => r.status === 'declined' || r.status === 'withdrawn').length,
  }), [requests])

  /**
   * Summe der Kostenschaetzungen aller bestaetigten Anfragen. Ausdruecklich
   * eine SCHAETZUNG (`estimated_cents` aus der Anfrage), kein Umsatz: bezahlt
   * wird ueber `rental_bookings`, und das steht auf der Umsatzseite.
   */
  const bestaetigtCents = useMemo(
    () => requests.filter(r => r.status === 'accepted').reduce((s, r) => s + (r.estimated_cents || 0), 0),
    [requests],
  )

  const filtered = useMemo(() => {
    if (filter === 'all') return requests
    if (filter === 'declined') return requests.filter(r => r.status === 'declined' || r.status === 'withdrawn')
    return requests.filter(r => r.status === filter)
  }, [requests, filter])

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
          <button
            aria-label="Zurück"
            onClick={() => router.push('/vermieter/mein-inserat')}
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

        {/* KPIs — ausschliesslich aus den geladenen Anfragen gerechnet */}
        <div style={{ margin: '0 16px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel" style={{ fontSize: 19, fontWeight: 600, background: 'linear-gradient(135deg,#FF8888,#E85040)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{counts.open}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{t('requests.kpiNew')}</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel" style={{ fontSize: 19, fontWeight: 600, background: 'linear-gradient(135deg,#6ABF80,#4A8A5A)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{counts.accepted}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{t('requests.kpiConfirmed')}</div>
          </div>
          <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
            <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{euro(bestaetigtCents)}</div>
            <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>Zugesagt (ca.)</div>
          </div>
        </div>

        {/* Filter */}
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {([
            { k: 'open' as Filter, l: `${t('requests.filterNew')} (${counts.open})` },
            { k: 'accepted' as Filter, l: `${t('requests.filterConfirmed')} (${counts.accepted})` },
            { k: 'declined' as Filter, l: `${t('requests.filterRejected')} (${counts.declined})` },
            { k: 'all' as Filter, l: `${t('requests.filterAll')} (${requests.length})` },
          ]).map(({ k, l }) => (
            <button key={k} onClick={() => setFilter(k)}
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

        <div style={{ padding: '0 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {laedt && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

          {!laedt && fehler && (
            <p role="alert" style={{ fontSize: 12.5, color: '#FF8888', lineHeight: 1.5 }}>{fehler}</p>
          )}

          {!laedt && !fehler && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', background: 'rgba(176,144,96,0.04)', border: '1px dashed rgba(176,144,96,0.25)', borderRadius: 18 }}>
              <p className="cinzel" style={{ fontSize: 18, color: 'var(--gold2)', marginBottom: 8 }}>{t('requests.emptyTitle')}</p>
              <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.6 }}>
                {requests.length === 0
                  ? 'Sobald jemand einen deiner Plätze anfragt, steht die Anfrage hier.'
                  : t('requests.emptyText')}
              </p>
            </div>
          )}

          {!laedt && !fehler && filtered.map(r => {
            const offen = r.status === 'open'
            const abgelehnt = r.status === 'declined' || r.status === 'withdrawn'
            const name = r.counterpart?.fullName ?? null
            const dauerText = dauer(r.units, r.duration_unit)
            return (
              <div key={r.id} style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: offen ? '1.5px solid #E85040' : '1px solid rgba(191,149,63,0.22)',
                borderRadius: 16, padding: 14,
                boxShadow: offen ? '0 0 16px rgba(232,80,64,0.15)' : 'none',
                opacity: abgelehnt ? 0.6 : 1,
              }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="cinzel text-gold-metallic" style={{ fontSize: 17, fontWeight: 600 }}>{initials(name)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700 }}>{name ?? 'Name nicht hinterlegt'}</p>
                    <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                      {r.request_type === 'besichtigung' ? 'Besichtigung' : 'Mietanfrage'}
                      {r.rental_equipment?.name ? ` · ${r.rental_equipment.name}` : ''}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1, flexShrink: 0,
                    background: r.status === 'accepted' ? 'rgba(74,138,90,0.15)' : offen ? 'rgba(196,168,106,0.15)' : 'rgba(232,80,64,0.15)',
                    color: r.status === 'accepted' ? '#6ABF80' : offen ? 'var(--gold2)' : '#FF8888',
                  }}>{STATUS_LABELS[r.status] ?? r.status}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, padding: 10, background: 'rgba(196,168,106,0.04)', borderRadius: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblDate')}</div>
                    <div style={{ color: 'var(--cream)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>
                      {datum(r.preferred_date)}{r.preferred_time ? ` · ${r.preferred_time.slice(0, 5)}` : ''}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{t('requests.lblDuration')}</div>
                    <div style={{ color: 'var(--cream)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>{dauerText ?? '—'}</div>
                  </div>
                  {r.estimated_cents > 0 && (
                    <div>
                      <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Kostenschätzung</div>
                      <div className="cinzel text-gold-metallic" style={{ fontWeight: 700, marginTop: 2, fontSize: 14 }}>ca. {euro(r.estimated_cents)}</div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Eingegangen</div>
                    <div style={{ color: 'var(--cream)', fontWeight: 600, marginTop: 2, fontSize: 11.5 }}>{datum(r.created_at)}</div>
                  </div>
                </div>

                {r.message && (
                  <p style={{ fontSize: 12.5, color: 'var(--cream)', lineHeight: 1.5, padding: 10, background: 'rgba(11,11,15,0.4)', borderRadius: 10, borderLeft: '3px solid var(--gold)', marginBottom: 10, fontStyle: 'italic' }}>
                    &ldquo;{r.message}&rdquo;
                  </p>
                )}

                {offen && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => entscheiden(r.id, 'accepted')} disabled={busyId === r.id}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'linear-gradient(135deg,#6ABF80,#4A8A5A)', color: '#0B0B0F', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: busyId === r.id ? 'wait' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}
                    >✓ {t('requests.btnConfirm')}</button>
                    <button onClick={() => router.push('/nachrichten' as never)}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', border: '1px solid rgba(196,168,106,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                    >💬 {t('requests.btnChat')}</button>
                    <button onClick={() => entscheiden(r.id, 'declined')} disabled={busyId === r.id}
                      style={{ flex: 1, padding: 11, borderRadius: 10, background: 'transparent', color: '#FF8888', border: '1px solid rgba(232,80,64,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: busyId === r.id ? 'wait' : 'pointer', opacity: busyId === r.id ? 0.6 : 1 }}
                    >✕ {t('requests.btnReject')}</button>
                  </div>
                )}

                {r.status === 'accepted' && (
                  <button onClick={() => router.push('/nachrichten' as never)}
                    style={{ width: '100%', padding: 11, borderRadius: 10, background: 'rgba(196,168,106,0.1)', color: 'var(--gold2)', border: '1px solid rgba(196,168,106,0.3)', fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                  >💬 {t('requests.btnChatOpen')}</button>
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
