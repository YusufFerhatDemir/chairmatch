'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subProfil.title')}
      subtitle={t('subProfil.subtitle')}
      storageKey="cm_mieter_profil"
      showSave={true}
      role="mieter"
    >
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subProfil.nameLbl')}</label>
        <input type="text" data-storage="name" placeholder="Max Mustermann" style={{
          width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subProfil.jobLbl')}</label>
        <select data-storage="job" style={{
          width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}>
          <option>{t('subProfil.jobFriseur')}</option>
          <option>{t('subProfil.jobBarber')}</option>
          <option>{t('subProfil.jobKosmetik')}</option>
          <option>{t('subProfil.jobNagel')}</option>
          <option>{t('subProfil.jobMassage')}</option>
        </select>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>{t('subProfil.licenseLbl')}</label>
        <input type="text" data-storage="license" placeholder={t('subProfil.licensePlaceholder')} style={{
          width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
    </MeinBereichSubPage>
  )
}
