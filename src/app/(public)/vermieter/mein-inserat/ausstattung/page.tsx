'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subAusstattung.title')}
      subtitle={t('subAusstattung.subtitle')}
      storageKey="cm_vermieter_ausstattung"
      showSave={true}
      role="vermieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(['item1','item2','item3','item4','item5','item6','item7','item8','item9','item10'] as const).map(k => (
          <label key={k} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
          }}>
            <input type="checkbox" data-storage={k} style={{ accentColor: '#C4A86A', width: 18, height: 18 }}/>
            <span style={{ fontSize: 13, color: 'var(--cream)' }}>{t('subAusstattung.'+k)}</span>
          </label>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
