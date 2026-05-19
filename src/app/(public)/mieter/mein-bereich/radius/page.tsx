'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subRadius.title')}
      subtitle={t('subRadius.subtitle')}
      storageKey="cm_mieter_radius"
      showSave={true}
      role="mieter"
    >
      <AktuellBox label={t('subRadius.currentLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">10 km</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subRadius.around', { city: 'Köln' })}</p>
      </AktuellBox>
      <input type="range" min="1" max="50" defaultValue="10" data-storage="km" style={{
        width: '100%', accentColor: '#C4A86A',
      }}/>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--stone)' }}>
        <span>1 km</span><span>25 km</span><span>50 km</span>
      </div>
      <TippsBox title={t('subRadius.tippsTitle')} tipps={[
        t('subRadius.tip1'), t('subRadius.tip2'), t('subRadius.tip3'),
      ]} />
    </MeinBereichSubPage>
  )
}
