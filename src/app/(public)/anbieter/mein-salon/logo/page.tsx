'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { SingleImageUpload } from '@/components/UploadField'
import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subLogo.title')}
      subtitle={t('subLogo.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <SingleImageUpload storageKey="cm_anbieter_logo_image" placeholder="YD" />
      <TippsBox title={t('subLogo.tippsTitle')} tipps={[
        t('subLogo.tip1'), t('subLogo.tip2'), t('subLogo.tip3'), t('subLogo.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
