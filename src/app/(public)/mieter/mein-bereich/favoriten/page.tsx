'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subFavoriten.title')}
      subtitle={t('subFavoriten.subtitle')}
      showSave={false}
      role="mieter"
    >
      <AktuellBox label={t('subFavoriten.savedLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">4</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subFavoriten.favorites')}</p>
      </AktuellBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Salon Anna · Köln', p: '€85/Tag' },
          { n: 'Lounge Maximilian · Köln', p: '€95/Tag' },
          { n: 'Studio Rio · Bonn', p: '€75/Tag' },
          { n: 'Atelier Klein · Düsseldorf', p: '€110/Tag' },
        ].map((f, i) => (
          <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{f.n}</span>
            <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700 }}>{f.p}</span>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
