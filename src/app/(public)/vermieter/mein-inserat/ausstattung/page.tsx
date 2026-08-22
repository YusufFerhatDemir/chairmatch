'use client'

import MeinBereichSubPage, { type SubPageValues } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

/**
 * Ausstattung des Haupt-Inserats → `rental_equipment.features`.
 *
 * Gespeichert werden die stabilen Slugs, nicht die übersetzten Labels:
 * ein Vermieter, der die App auf Türkisch bedient, soll deutschen Mietern
 * nicht "Ayna ve çalışma alanı" in die Suche schreiben.
 */

const FEATURES = [
  { slug: 'spiegel',      key: 'item1' },
  { slug: 'waschbecken',  key: 'item2' },
  { slug: 'foehn',        key: 'item3' },
  { slug: 'sterilisator', key: 'item4' },
  { slug: 'wlan',         key: 'item5' },
  { slug: 'klimaanlage',  key: 'item6' },
  { slug: 'stauraum',     key: 'item7' },
  { slug: 'empfang',      key: 'item8' },
  { slug: 'wartebereich', key: 'item9' },
  { slug: 'parkplatz',    key: 'item10' },
] as const

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subAusstattung.title')}
      subtitle={t('subAusstattung.subtitle')}
      showSave={true}
      role="vermieter"
      loadValues={async () => {
        const { listing } = await apiGet<{ listing: { features: string[] | null } | null }>('/api/me/listing')
        if (!listing) return null
        const active = new Set(listing.features ?? [])
        const values: SubPageValues = {}
        for (const f of FEATURES) values[f.slug] = active.has(f.slug)
        return values
      }}
      onSave={async (values) => {
        await apiSend('/api/me/listing', 'PATCH', {
          features: FEATURES.filter(f => values[f.slug] === true).map(f => f.slug),
        })
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FEATURES.map(f => (
          <label key={f.slug} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
          }}>
            <input type="checkbox" data-storage={f.slug} style={{ accentColor: '#C4A86A', width: 18, height: 18 }}/>
            <span style={{ fontSize: 13, color: 'var(--cream)' }}>{t('subAusstattung.'+f.key)}</span>
          </label>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
