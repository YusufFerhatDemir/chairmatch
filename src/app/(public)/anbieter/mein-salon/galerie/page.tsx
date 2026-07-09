'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { GalleryUpload } from '@/components/UploadField'
import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subGalerie.title')}
      subtitle={t('subGalerie.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <GalleryUpload storageKey="cm_anbieter_galerie_images" maxImages={12} label="" />
      <TippsBox title={t('subGalerie.tippsTitle')} tipps={[
        t('subGalerie.tip1'), t('subGalerie.tip2'), t('subGalerie.tip3'), t('subGalerie.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
