'use client'

import { useEffect, useState } from 'react'
import MeinBereichSubPage, { AktuellBox } from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'
import { apiGet, ApiError } from '@/lib/client-api'

/**
 * Meine Anfragen (Mieter) — /mieter/mein-bereich/anfragen
 *
 * Die Seite zeigte bis 2026-08-27 drei erfundene Anfragen ("Salon Anna —
 * bestaetigt", "Studio Rio — offen", "Lounge Max — abgelehnt") und darueber
 * die Kachel "2 neue Antworten". Jedem Besucher dieselben, ohne Anmeldung,
 * ohne jeden Bezug zu dem, was die Person wirklich angefragt hatte — waehrend
 * GET /api/rental-requests die echten Anfragen die ganze Zeit bereithielt und
 * von niemandem aufgerufen wurde. Wer wirklich angefragt hatte, sah seine
 * Anfrage hier nicht; wer nie angefragt hatte, sah drei.
 */

interface RentalRequest {
  id: string
  request_type: 'miete' | 'besichtigung'
  preferred_date: string
  preferred_time: string | null
  status: 'open' | 'accepted' | 'declined' | 'withdrawn'
  estimated_cents: number
  rental_equipment?: { name?: string; salons?: { name?: string; city?: string } | null } | null
}

const STATUS: Record<string, { label: string; color: string }> = {
  open: { label: 'OFFEN', color: '#C4A86A' },
  accepted: { label: 'BESTÄTIGT', color: '#6ABF80' },
  declined: { label: 'ABGELEHNT', color: '#E85040' },
  withdrawn: { label: 'ZURÜCKGEZOGEN', color: '#8A8A8A' },
}

function datum(iso: string | null): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })} €`
}

export default function Page() {
  const t = useTranslations()
  const [requests, setRequests] = useState<RentalRequest[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet<{ requests: RentalRequest[] }>('/api/rental-requests')
        if (cancelled) return
        setRequests(res.requests ?? [])
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        setRequests([])
        setFehler(
          err instanceof ApiError && err.status === 401
            ? 'Bitte melde dich an, um deine Anfragen zu sehen.'
            : err instanceof Error ? err.message : 'Anfragen konnten nicht geladen werden',
        )
      } finally {
        if (!cancelled) setLaedt(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const offen = requests.filter(r => r.status === 'open').length

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subMieterAnfragen.title')}
      subtitle={t('subMieterAnfragen.subtitle')}
      showSave={false}
      role="mieter"
    >
      {!laedt && !fehler && (
        <AktuellBox label={t('subMieterAnfragen.statusLbl')}>
          <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">{offen}</p>
          <p style={{ fontSize: 11, color: 'var(--stone)' }}>
            {offen === 1 ? 'offene Anfrage' : 'offene Anfragen'}
          </p>
        </AktuellBox>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {laedt && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

        {!laedt && fehler && (
          <p role="alert" style={{ fontSize: 12.5, color: '#FF8888', lineHeight: 1.5 }}>{fehler}</p>
        )}

        {!laedt && !fehler && requests.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
            Du hast noch keine Anfrage gestellt. Such dir unter „Stühle suchen&ldquo; einen Platz und frag ihn an —
            die Anfrage steht dann hier.
          </p>
        )}

        {!laedt && !fehler && requests.map(r => {
          const s = STATUS[r.status] ?? { label: r.status.toUpperCase(), color: '#8A8A8A' }
          const salon = r.rental_equipment?.salons
          const titel = [r.rental_equipment?.name, salon?.name].filter(Boolean).join(' · ')
          return (
            <div key={r.id} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{titel || 'Mietobjekt'}</span>
                <span style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', color: s.color, borderRadius: 8, fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>{s.label}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--stone)' }}>
                {r.request_type === 'besichtigung' ? 'Besichtigung' : 'Miete'} · {datum(r.preferred_date)}
                {r.preferred_time ? ` · ${r.preferred_time.slice(0, 5)}` : ''}
                {r.estimated_cents > 0 ? ` · ca. ${euro(r.estimated_cents)}` : ''}
                {salon?.city ? ` · ${salon.city}` : ''}
              </p>
            </div>
          )
        })}
      </div>
    </MeinBereichSubPage>
  )
}
