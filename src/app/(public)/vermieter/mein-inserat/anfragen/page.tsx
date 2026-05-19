'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel={t('meinInserat.title')}
      title={t('subAnfragen.title')}
      subtitle={t('subAnfragen.subtitle')}
      showSave={false}
      role="vermieter"
    >
      <AktuellBox label={t('subAnfragen.openLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">5</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subAnfragen.newRequests')}</p>
      </AktuellBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Marko F.', d: '20.–22. Mai · Stuhl' },
          { n: 'Sarah B.', d: '24. Mai · ganzer Tag' },
          { n: 'Tim H.',   d: '01. Juni · 4 Std.' },
        ].map((r, i) => (
          <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</span>
              <span style={{ fontSize: 9, padding: '2px 8px', background: '#E85040', color: '#fff', borderRadius: 8, fontWeight: 700 }}>{t('subAnfragen.newLbl')}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--stone)' }}>{r.d}</p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
