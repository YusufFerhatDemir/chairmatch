'use client'

import { useState } from 'react'
import MeinBereichSubPage, { AktuellBox, TippsBox } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

interface TenantProfile {
  search_radius_km: number
  search_city: string
}

const DEFAULT_RADIUS = 10

export default function Page() {
  const t = useTranslations()
  // Kontrolliert statt defaultValue: die Anzeige darüber hat vorher fix
  // „10 km" gezeigt — nach dem Laden eines gespeicherten Werts wäre das
  // schlicht falsch gewesen.
  const [km, setKm] = useState(DEFAULT_RADIUS)
  const [city, setCity] = useState('')

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subRadius.title')}
      subtitle={t('subRadius.subtitle')}
      showSave={true}
      role="mieter"
      loadValues={async () => {
        const { profile } = await apiGet<{ profile: TenantProfile }>('/api/me/tenant-profile')
        setKm(profile.search_radius_km || DEFAULT_RADIUS)
        setCity(profile.search_city || '')
        return { km: profile.search_radius_km || DEFAULT_RADIUS }
      }}
      onSave={async (values) => {
        await apiSend('/api/me/tenant-profile', 'PUT', {
          search_radius_km: Number(values.km) || DEFAULT_RADIUS,
        })
      }}
    >
      <AktuellBox label={t('subRadius.currentLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">{km} km</p>
        {city && <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subRadius.around', { city })}</p>}
      </AktuellBox>
      <input
        type="range" min="1" max="50" data-storage="km"
        value={km}
        onChange={(e) => setKm(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#C4A86A' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--stone)' }}>
        <span>1 km</span><span>25 km</span><span>50 km</span>
      </div>
      <TippsBox title={t('subRadius.tippsTitle')} tipps={[
        t('subRadius.tip1'), t('subRadius.tip2'), t('subRadius.tip3'),
      ]} />
    </MeinBereichSubPage>
  )
}
