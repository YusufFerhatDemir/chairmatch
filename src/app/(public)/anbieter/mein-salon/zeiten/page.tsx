'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subZeiten.title')}
      subtitle={t('subZeiten.subtitle')}
      storageKey="cm_anbieter_zeiten"
      showSave={true}
      role="anbieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {([
          ['mon','m'],['tue','t1'],['wed','w'],['thu','t2'],['fri','f'],['sat','s1'],['sun','s2']
        ] as const).map(([k,id]) => (
          <div key={k} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: '12px 14px',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, minWidth: 36, color: 'var(--cream)' }}>{t('subZeiten.'+k)}</span>
            <input type="time" defaultValue="09:00" data-storage={'open_'+id} style={{
              flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            }}/>
            <span style={{ color: 'var(--gold2)' }}>—</span>
            <input type="time" defaultValue="18:00" data-storage={'close_'+id} style={{
              flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
            }}/>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
