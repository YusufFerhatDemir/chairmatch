'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subPreise.title')}
      subtitle={t('subPreise.subtitle')}
      storageKey="cm_vermieter_preise"
      showSave={true}
      role="vermieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {([
          ['perHour','15','hour'],['perDay','90','day'],['perWeek','450','week'],['perMonth','1500','month'],
        ] as const).map(([k,v,id]) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{t('subPreise.'+k)}</span>
            <input type="number" defaultValue={v} data-storage={id} style={{
              width: 80, padding: '8px 10px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8,
              fontSize: 14, fontFamily: 'inherit', textAlign: 'right',
            }}/>
            <span style={{ color: 'var(--gold2)', fontSize: 14, fontWeight: 700 }}>€</span>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
