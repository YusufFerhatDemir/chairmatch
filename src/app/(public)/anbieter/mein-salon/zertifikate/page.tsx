'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { DocumentUpload } from '@/components/UploadField'
import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subZertifikate.title')}
      subtitle={t('subZertifikate.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <DocumentUpload storageKey="cm_anbieter_zertifikate" docs={[
        { id: 'hygiene',    title: t('subZertifikate.doc1Title'), sub: t('subZertifikate.doc1Sub') },
        { id: 'approbation', title: t('subZertifikate.doc2Title'), sub: t('subZertifikate.doc2Sub') },
        { id: 'medical',    title: t('subZertifikate.doc3Title'), sub: t('subZertifikate.doc3Sub') },
      ]} />
      <div style={{
        background: 'rgba(232,80,64,0.06)',
        border: '1px solid rgba(232,80,64,0.25)',
        borderRadius: 12, padding: '12px 14px',
        fontSize: 12, color: '#FF9090', lineHeight: 1.6,
      }}>
        {t('subZertifikate.infoBox')}
      </div>
    </MeinBereichSubPage>
  )
}
