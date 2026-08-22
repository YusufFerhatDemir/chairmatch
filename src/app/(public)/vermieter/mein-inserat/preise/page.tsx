'use client'

import MeinBereichSubPage, { type SubPageValues } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

/**
 * Mietpreise schreiben nach `rental_equipment` (Haupt-Inserat des Vermieters).
 *
 * Die Eingabe erfolgt in Euro, gespeichert wird in Cent — der komplette
 * Buchungs- und Stripe-Pfad rechnet in Cent.
 */

interface Listing {
  price_per_hour_cents: number | null
  price_per_day_cents: number
  price_per_week_cents: number | null
  price_per_month_cents: number | null
}

const FIELDS = [
  { label: 'perHour',  id: 'hour',  fallback: '15',   column: 'price_per_hour_cents' },
  { label: 'perDay',   id: 'day',   fallback: '90',   column: 'price_per_day_cents' },
  { label: 'perWeek',  id: 'week',  fallback: '450',  column: 'price_per_week_cents' },
  { label: 'perMonth', id: 'month', fallback: '1500', column: 'price_per_month_cents' },
] as const

/** Euro-Eingabe → Cent. Leer bzw. unlesbar ⇒ null (= kein Preis gepflegt). */
function euroToCents(raw: unknown): number | null {
  const text = String(raw ?? '').replace(',', '.').trim()
  if (!text) return null
  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

function centsToEuro(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return String(Math.round(cents / 100))
}

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subPreise.title')}
      subtitle={t('subPreise.subtitle')}
      showSave={true}
      role="vermieter"
      loadValues={async () => {
        const { listing } = await apiGet<{ listing: Listing | null }>('/api/me/listing')
        if (!listing) return null
        const values: SubPageValues = {}
        for (const f of FIELDS) {
          values[f.id] = centsToEuro(listing[f.column])
        }
        return values
      }}
      onSave={async (values) => {
        const dayCents = euroToCents(values.day)
        if (dayCents === null || dayCents <= 0) {
          throw new Error('Der Tagespreis ist Pflicht — ohne ihn kann dein Inserat nicht online gehen.')
        }
        await apiSend('/api/me/listing', 'PATCH', {
          price_per_hour_cents: euroToCents(values.hour),
          price_per_day_cents: dayCents,
          price_per_week_cents: euroToCents(values.week),
          price_per_month_cents: euroToCents(values.month),
          is_available: true,
        })
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FIELDS.map(f => (
          <div key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{t('subPreise.'+f.label)}</span>
            <input type="number" min="0" defaultValue={f.fallback} data-storage={f.id} style={{
              width: 80, padding: '8px 10px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', textAlign: 'right',
            }}/>
            <span style={{ color: 'var(--gold2)', fontSize: 14, fontWeight: 700 }}>€</span>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
