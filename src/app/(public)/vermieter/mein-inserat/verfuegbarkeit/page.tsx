'use client'

import { useState } from 'react'
import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

/**
 * Verfügbarkeit des Haupt-Inserats: an welchen Wochentagen und in welchem
 * Zeitfenster vermietet wird.
 *
 * Die Wochentag-Buttons waren bisher reine Deko — ohne State und ohne
 * `data-storage` wurde die Auswahl nirgends gelesen.
 */

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
type Day = (typeof DAYS)[number]

interface Listing {
  available_days: string[] | null
  available_from: string | null
  available_to: string | null
}

/** Postgres liefert `time` als "09:00:00" — das Input braucht "09:00". */
function toInputTime(value: string | null): string {
  return value ? value.slice(0, 5) : ''
}

export default function Page() {
  const t = useTranslations()
  const [selected, setSelected] = useState<Day[]>([])

  function toggle(day: Day) {
    setSelected(prev => (prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]))
  }

  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subVerfuegbarkeit.title')}
      subtitle={t('subVerfuegbarkeit.subtitle')}
      showSave={true}
      role="vermieter"
      loadValues={async () => {
        const { listing } = await apiGet<{ listing: Listing | null }>('/api/me/listing')
        if (!listing) return null
        setSelected((listing.available_days ?? []).filter((d): d is Day => (DAYS as readonly string[]).includes(d)))
        return {
          open: toInputTime(listing.available_from) || '09:00',
          close: toInputTime(listing.available_to) || '18:00',
        }
      }}
      onSave={async (values) => {
        const open = String(values.open ?? '').trim()
        const close = String(values.close ?? '').trim()
        if (!open || !close) throw new Error('Bitte Start- und Endzeit angeben')
        if (close <= open) throw new Error('Die Endzeit muss nach der Startzeit liegen')
        if (selected.length === 0) throw new Error('Bitte mindestens einen Wochentag wählen')

        await apiSend('/api/me/listing', 'PATCH', {
          available_days: DAYS.filter(d => selected.includes(d)), // stabile Reihenfolge
          available_from: open,
          available_to: close,
        })
      }}
    >
      <div>
        <span style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subVerfuegbarkeit.daysLbl')}</span>
        <div role="group" aria-label={t('subVerfuegbarkeit.daysLbl')} style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {DAYS.map(d => {
            const active = selected.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(d)}
                style={{
                  flex: 1, padding: '8px 0',
                  background: active ? 'rgba(196,168,106,0.18)' : 'var(--c1)',
                  color: active ? 'var(--gold2)' : 'var(--cream)',
                  border: active ? '1px solid rgba(196,168,106,0.55)' : '0.5px solid rgba(196,168,106,0.25)',
                  borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                  fontWeight: active ? 700 : 400,
                }}
              >{t('subZeiten.'+d)}</button>
            )
          })}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }} htmlFor="verfuegbarkeit-oeffnet">{t('subVerfuegbarkeit.timesLbl')}</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <input id="verfuegbarkeit-oeffnet" aria-label="Öffnet um" type="time" defaultValue="09:00" data-storage="open" style={{
            flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
            border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          }}/>
          <span style={{ color: 'var(--gold2)' }}>—</span>
          <input id="verfuegbarkeit-schliesst" aria-label="Schließt um" type="time" defaultValue="18:00" data-storage="close" style={{
            flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
            border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          }}/>
        </div>
      </div>
    </MeinBereichSubPage>
  )
}
