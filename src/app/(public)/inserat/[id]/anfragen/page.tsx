'use client'

/**
 * Miet- bzw. Besichtigungsanfrage.
 *
 * Vorher: die Anfrage wurde nach 600 ms Fake-Delay in localStorage geschrieben
 * und der Nutzer nach /nachrichten geschickt — der Vermieter erfuhr nie davon.
 * Jetzt geht sie an `POST /api/rental-requests` (DB + In-App-Benachrichtigung
 * + E-Mail an den Vermieter).
 *
 * Der Preis in der Zusammenfassung kommt aus den echten Preisen des Inserats
 * statt aus dem fixen 15-€-Platzhalter.
 */

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'
import { apiGet, apiSend, ApiError } from '@/lib/client-api'

const DURATIONS = [
  { id: 'hour',  label: 'Stundenweise', unitLabel: 'Stunden' },
  { id: 'day',   label: 'Tag',          unitLabel: 'Tage' },
  { id: 'week',  label: 'Woche',        unitLabel: 'Wochen' },
  { id: 'month', label: 'Monat',        unitLabel: 'Monate' },
] as const

type DurationId = (typeof DURATIONS)[number]['id']

interface Equipment {
  id: string
  name: string
  type: string
  price_per_day_cents: number
  price_per_hour_cents: number | null
  price_per_week_cents: number | null
  price_per_month_cents: number | null
  is_available: boolean
  salons?: { name: string; city: string | null } | null
}

/** Tage je Einheit — spiegelt DAYS_PER_UNIT der API (8-Stunden-Tag). */
const DAYS_PER_UNIT: Record<DurationId, number> = { hour: 1 / 8, day: 1, week: 7, month: 30 }

/** Preisvorschau; verbindlich rechnet der Server. */
function estimateCents(eq: Equipment, unit: DurationId, units: number): number {
  const explicit: Record<DurationId, number | null> = {
    hour: eq.price_per_hour_cents,
    day: eq.price_per_day_cents,
    week: eq.price_per_week_cents,
    month: eq.price_per_month_cents,
  }
  const perUnit = explicit[unit] ?? Math.round(eq.price_per_day_cents * DAYS_PER_UNIT[unit])
  return Math.max(0, Math.round(perUnit * units))
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const fieldStyle: React.CSSProperties = {
  padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
  border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
  fontSize: 14, fontFamily: 'inherit',
}

export default function MietanfrageFormPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ''

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [anfrageTyp, setAnfrageTyp] = useState<'miete' | 'besichtigung'>('miete')
  const [duration, setDuration] = useState<DurationId>('hour')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('09:00')
  const [units, setUnits] = useState('4')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<{ equipment: Equipment }>(`/api/rental-equipment/${id}`)
      setEquipment(res.equipment)
      setLoadError(null)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Inserat konnte nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  const dur = DURATIONS.find(d => d.id === duration)!
  const unitCount = Number(units || 0)
  const totalCents = equipment && unitCount > 0 ? estimateCents(equipment, duration, unitCount) : 0

  async function send() {
    if (!equipment || submitting) return
    setSubmitError(null)

    if (!date) { setSubmitError('Bitte Datum wählen'); return }
    if (date < todayIso()) { setSubmitError('Das Datum liegt in der Vergangenheit'); return }
    if (anfrageTyp === 'miete' && !message.trim()) {
      setSubmitError('Bitte schreibe dem Vermieter eine kurze Nachricht')
      return
    }

    setSubmitting(true)
    try {
      await apiSend('/api/rental-requests', 'POST', {
        equipmentId: equipment.id,
        requestType: anfrageTyp,
        preferredDate: date,
        preferredTime: time || undefined,
        ...(anfrageTyp === 'miete'
          ? { durationUnit: duration, units: Math.max(1, unitCount) }
          : {}),
        message: message.trim() || undefined,
      })
      router.push('/nachrichten' as never)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.push(`/auth?next=${encodeURIComponent(`/inserat/${id}/anfragen`)}` as never)
        return
      }
      setSubmitError(err instanceof Error ? err.message : 'Anfrage konnte nicht gesendet werden')
      setSubmitting(false)
    }
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
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => router.back()} aria-label="Zurück"
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{anfrageTyp === 'besichtigung' ? 'Besichtigung' : 'Mietanfrage'}</span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {loading && (
          <p style={{ padding: '0 20px 24px', fontSize: 13, color: 'var(--stone)' }}>Inserat wird geladen…</p>
        )}

        {!loading && loadError && (
          <div style={{ padding: '0 20px 24px' }}>
            <p role="alert" style={{ fontSize: 13, color: '#FF8888', marginBottom: 14 }}>{loadError}</p>
            <Link href="/rentals" style={{ color: 'var(--gold2)', fontSize: 13, textDecoration: 'none' }}>
              ← Zu den verfügbaren Inseraten
            </Link>
          </div>
        )}

        {!loading && equipment && (
          <>
            <div style={{ padding: '0 20px 18px' }}>
              <h2 className="cinzel text-gold-metallic" style={{ fontSize: 24, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>Anfrage senden</h2>
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>
                An: {equipment.salons?.name ?? 'Salon'} · {equipment.name}
              </p>
            </div>

            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Anfrage-Typ: direkt mieten oder erst besichtigen */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {([
                  { id: 'miete' as const, label: 'Mietanfrage', sub: 'Direkt anfragen' },
                  { id: 'besichtigung' as const, label: 'Besichtigung', sub: 'Erst ansehen' },
                ]).map(opt => {
                  const active = anfrageTyp === opt.id
                  return (
                    <button key={opt.id} onClick={() => setAnfrageTyp(opt.id)}
                      style={{
                        padding: '12px 10px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                        background: active ? 'rgba(196,168,106,0.14)' : 'var(--c1)',
                        border: active ? '1px solid rgba(196,168,106,0.55)' : '0.5px solid rgba(196,168,106,0.25)',
                        color: active ? 'var(--gold2)' : 'var(--stone)',
                      }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                      <span style={{ display: 'block', fontSize: 10, marginTop: 2, opacity: 0.8 }}>{opt.sub}</span>
                    </button>
                  )
                })}
              </div>

              {anfrageTyp === 'miete' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label htmlFor="anfrage-dauer" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Mietdauer</label>
                  <select id="anfrage-dauer" value={duration} onChange={(e) => setDuration(e.target.value as DurationId)} style={{ ...fieldStyle, width: '100%' }}>
                    {DURATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="anfrage-datum" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Datum &amp; Start-Zeit</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input id="anfrage-datum" type="date" value={date} min={todayIso()} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
                  <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={fieldStyle} aria-label="Start-Zeit" />
                </div>
              </div>

              {anfrageTyp === 'miete' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label htmlFor="anfrage-menge" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Anzahl {dur.unitLabel}</label>
                  <input id="anfrage-menge" type="number" value={units} onChange={(e) => setUnits(e.target.value)} min="1" max="999" style={fieldStyle} />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label htmlFor="anfrage-nachricht" style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>
                  {anfrageTyp === 'besichtigung' ? 'Nachricht (optional)' : 'Nachricht an Vermieter'}
                </label>
                <textarea id="anfrage-nachricht" value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                  placeholder={anfrageTyp === 'besichtigung'
                    ? 'Hallo, ich würde mir den Platz gerne vor Ort ansehen. Passt dir der Termin?'
                    : 'Hallo, ich bin Friseurin und möchte deinen Stuhl mieten. Ich habe 5 Jahre Berufserfahrung...'}
                  style={{ ...fieldStyle, width: '100%', resize: 'vertical', minHeight: 100 }} />
              </div>

              {anfrageTyp === 'miete' ? (
                <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--cream)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--gold2)' }}>Geschätzte Kosten:</strong>{' '}
                  {totalCents > 0 ? (
                    <>
                      {unitCount} × {dur.label} ={' '}
                      <span className="cinzel" style={{ fontWeight: 700, fontSize: 14 }}>
                        {(totalCents / 100).toFixed(2)} €
                      </span>
                    </>
                  ) : '—'}
                  <br /><span style={{ color: 'var(--stone)' }}>Erst nach Bestätigung wird gezahlt. 0 % Provision.</span>
                </div>
              ) : (
                <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--cream)', lineHeight: 1.55 }}>
                  <strong style={{ color: 'var(--gold2)' }}>Besichtigung ist kostenlos.</strong>{' '}
                  Du siehst dir den Platz unverbindlich an — gemietet wird erst, wenn beide Seiten wollen.
                </div>
              )}

              {submitError && (
                <p role="alert" style={{ fontSize: 12, color: '#FF8888', lineHeight: 1.5 }}>{submitError}</p>
              )}

              <button onClick={send} disabled={submitting}
                style={{ width: '100%', padding: 15, borderRadius: 14, background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)', color: '#1a1000', border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: submitting ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 0 18px rgba(196,168,106,0.25)', opacity: submitting ? 0.7 : 1 }}
              >
                <span>{submitting ? 'Wird gesendet…' : anfrageTyp === 'besichtigung' ? 'Besichtigung anfragen →' : 'Anfrage senden →'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
