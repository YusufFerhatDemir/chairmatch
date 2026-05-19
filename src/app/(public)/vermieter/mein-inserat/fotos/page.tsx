'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'
import { GalleryUpload } from '@/components/UploadField'
import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subFotos.title')}
      subtitle={t('subFotos.subtitle')}
      showSave={false}
      role="vermieter"
    >
      <GalleryUpload storageKey="cm_vermieter_fotos_images" maxImages={8} label="" />
      <TippsBox title={t('subFotos.tippsTitle')} tipps={[
        t('subFotos.tip1'), t('subFotos.tip2'), t('subFotos.tip3'),
      ]} />
    </MeinBereichSubPage>
  )
}
