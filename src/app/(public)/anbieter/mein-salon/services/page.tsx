'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subServices.title')}
      subtitle={t('subServices.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <AktuellBox label={t('subServices.activeLbl')}>
        <p style={{ fontSize: 32, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">0</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subServices.noneYet')}</p>
      </AktuellBox>
      <GoldButton>{t('subServices.addBtn')}</GoldButton>
      <TippsBox title={t('subServices.tippsTitle')} tipps={[
        t('subServices.tip1'), t('subServices.tip2'), t('subServices.tip3'), t('subServices.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
