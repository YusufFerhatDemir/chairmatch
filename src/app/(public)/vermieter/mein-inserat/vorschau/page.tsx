'use client'

import MeinBereichSubPage, { AktuellBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subVorschau.title')}
      subtitle={t('subVorschau.subtitle')}
      showSave={false}
      role="vermieter"
    >
      <AktuellBox label={t('subVorschau.previewLbl')}>
        <p style={{ fontSize: 14, color: 'var(--cream)', textAlign: 'center', lineHeight: 1.5 }}>{t('subVorschau.hint')}</p>
      </AktuellBox>
      <GoldButton>{t('subVorschau.openBtn')}</GoldButton>
    </MeinBereichSubPage>
  )
}
