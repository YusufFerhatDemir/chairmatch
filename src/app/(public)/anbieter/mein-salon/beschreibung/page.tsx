'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subBeschreibung.title')}
      subtitle={t('subBeschreibung.subtitle')}
      storageKey="cm_anbieter_beschreibung"
      showSave={true}
      role="anbieter"
    >
      <textarea
        data-storage="value"
        placeholder={t('subBeschreibung.placeholder')}
        rows={6}
        style={{
          width: '100%', padding: '12px 14px',
          background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 14,
          fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 140,
        }}
      />
      <TippsBox title={t('subBeschreibung.tippsTitle')} tipps={[
        t('subBeschreibung.tip1'), t('subBeschreibung.tip2'), t('subBeschreibung.tip3'),
      ]} />
    </MeinBereichSubPage>
  )
}
