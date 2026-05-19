'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subSuchen.title')}
      subtitle={t('subSuchen.subtitle')}
      storageKey="cm_mieter_suchen"
      showSave={true}
      role="mieter"
    >
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subSuchen.cityLbl')}</label>
        <input type="text" defaultValue="Köln" data-storage="city" style={{
          width: '100%', marginTop: 6, padding: '12px 14px',
          background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subSuchen.maxLbl')}</label>
        <input type="number" defaultValue="100" data-storage="maxPrice" style={{
          width: '100%', marginTop: 6, padding: '12px 14px',
          background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
      <GoldButton>{t('subSuchen.searchBtn')}</GoldButton>
    </MeinBereichSubPage>
  )
}
