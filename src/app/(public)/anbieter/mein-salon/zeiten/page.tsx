'use client'

import MeinBereichSubPage, { type SubPageValues } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

/**
 * Öffnungszeiten schreiben nach `salons.opening_hours`.
 *
 * Das dort etablierte Format ist `{ "Mo": "09:00 - 18:00" }` mit deutschen
 * Tageskürzeln — genau das lesen `lib/salon-open.ts`, `/api/availability`
 * und der Schema.org-Export. Die Feld-IDs im Formular (m, t1, w, …) bleiben
 * unverändert, umgerechnet wird hier.
 */
const DAYS = [
  { key: 'mon', id: 'm',  api: 'Mo' },
  { key: 'tue', id: 't1', api: 'Di' },
  { key: 'wed', id: 'w',  api: 'Mi' },
  { key: 'thu', id: 't2', api: 'Do' },
  { key: 'fri', id: 'f',  api: 'Fr' },
  { key: 'sat', id: 's1', api: 'Sa' },
  { key: 'sun', id: 's2', api: 'So' },
] as const

const TIME_RE = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/

function toFormValues(hours: Record<string, string> | null): SubPageValues {
  const values: SubPageValues = {}
  for (const day of DAYS) {
    const raw = hours?.[day.api] ?? hours?.[day.api.toLowerCase()] ?? null
    const match = raw ? TIME_RE.exec(raw) : null
    if (match) {
      values['open_' + day.id] = match[1].padStart(5, '0')
      values['close_' + day.id] = match[2].padStart(5, '0')
    }
  }
  return values
}

function toOpeningHours(values: SubPageValues): Record<string, string> {
  const hours: Record<string, string> = {}
  for (const day of DAYS) {
    const open = String(values['open_' + day.id] ?? '').trim()
    const close = String(values['close_' + day.id] ?? '').trim()
    // Leere oder unvollständige Zeiten = geschlossen; ein halb gefülltes
    // Paar würde sonst als "09:00 - " in die Buchungslogik laufen.
    hours[day.api] = open && close ? `${open} - ${close}` : 'Geschlossen'
  }
  return hours
}

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subZeiten.title')}
      subtitle={t('subZeiten.subtitle')}
      showSave={true}
      role="anbieter"
      loadValues={async () => {
        const { salon } = await apiGet<{ salon: { opening_hours: Record<string, string> | null } | null }>(
          '/api/me/salon',
        )
        return toFormValues(salon?.opening_hours ?? null)
      }}
      onSave={async (values) => {
        await apiSend('/api/me/salon', 'PATCH', { opening_hours: toOpeningHours(values) })
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DAYS.map(({ key, id }) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 36, color: 'var(--cream)' }}>{t('subZeiten.'+key)}</span>
            <input aria-label={t('subZeiten.'+key) + ' — öffnet um'} type="time" defaultValue="09:00" data-storage={'open_'+id} style={{
              flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            }}/>
            <span style={{ color: 'var(--gold2)' }}>—</span>
            <input aria-label={t('subZeiten.'+key) + ' — schließt um'} type="time" defaultValue="18:00" data-storage={'close_'+id} style={{
              flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            }}/>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
