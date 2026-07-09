'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subAuszahlung.title')}
      subtitle={t('subAuszahlung.subtitle')}
      storageKey="cm_vermieter_auszahlung"
      showSave={true}
      role="vermieter"
    >
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{t('subAuszahlung.ibanLbl')}</label>
        <input type="text" data-storage="iban" placeholder="DE89 3704 0044 0532 0130 00" style={{
          width: '100%', marginTop: 6, padding: '12px 14px',
          background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
          fontSize: 14, fontFamily: 'inherit', letterSpacing: 1,
        }}/>
      </div>
      <TippsBox title={t('subAuszahlung.tippsTitle')} tipps={[
        t('subAuszahlung.tip1'), t('subAuszahlung.tip2'), t('subAuszahlung.tip3'), t('subAuszahlung.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
