'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subVerfuegbarkeit.title')}
      subtitle={t('subVerfuegbarkeit.subtitle')}
      storageKey="cm_vermieter_verfuegbarkeit"
      showSave={true}
      role="vermieter"
    >
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subVerfuegbarkeit.daysLbl')}</label>
        <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
          {(['mon','tue','wed','thu','fri','sat','sun'] as const).map(d => (
            <button key={d} style={{
              flex: 1, padding: '8px 0',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)',
              borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
            }}>{t('subZeiten.'+d)}</button>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subVerfuegbarkeit.timesLbl')}</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
          <input type="time" defaultValue="09:00" data-storage="open" style={{
            flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
            border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          }}/>
          <span style={{ color: 'var(--gold2)' }}>—</span>
          <input type="time" defaultValue="18:00" data-storage="close" style={{
            flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
            border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
          }}/>
        </div>
      </div>
    </MeinBereichSubPage>
  )
}
