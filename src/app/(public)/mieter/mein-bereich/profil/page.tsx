'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

interface TenantProfile {
  display_name: string
  job: string
  license_number: string
}

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subProfil.title')}
      subtitle={t('subProfil.subtitle')}
      showSave={true}
      role="mieter"
      loadValues={async () => {
        const { profile } = await apiGet<{ profile: TenantProfile }>('/api/me/tenant-profile')
        return { name: profile.display_name, job: profile.job, license: profile.license_number }
      }}
      onSave={async (values) => {
        await apiSend('/api/me/tenant-profile', 'PUT', {
          display_name: String(values.name ?? '').trim(),
          job: String(values.job ?? '').trim(),
          license_number: String(values.license ?? '').trim(),
        })
      }}
    >
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }} htmlFor="profil-name">{t('subProfil.nameLbl')}</label>
        <input id="profil-name" type="text" data-storage="name" placeholder="Max Mustermann" style={{
          width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }} htmlFor="profil-job">{t('subProfil.jobLbl')}</label>
        <select id="profil-job" data-storage="job" style={{
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
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }} htmlFor="profil-lizenz">{t('subProfil.licenseLbl')}</label>
        <input id="profil-lizenz" type="text" data-storage="license" placeholder={t('subProfil.licensePlaceholder')} style={{
          width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
          border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
        }}/>
      </div>
    </MeinBereichSubPage>
  )
}
