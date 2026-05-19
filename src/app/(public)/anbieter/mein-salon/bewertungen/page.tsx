'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subBewertungen.title')}
      subtitle={t('subBewertungen.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <AktuellBox label={t('subBewertungen.totalLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">4,9 ★</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subBewertungen.fromCount', { n: 47, x: 3 })}</p>
      </AktuellBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { name: 'Anna K.', rating: 5, txt: 'Super Atmosphäre, sehr freundlich!' },
          { name: 'Max R.', rating: 5, txt: 'Bester Salon in der Stadt. Komme wieder.' },
          { name: 'Lisa M.', rating: 4, txt: 'Toll, ein Stern Abzug wegen Wartezeit.' },
        ].map((r, i) => (
          <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
              <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700 }}>{'★'.repeat(r.rating)}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.5 }}>{r.txt}</p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
