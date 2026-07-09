'use client'

import MeinBereichSubPage, { AktuellBox } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subMieterAnfragen.title')}
      subtitle={t('subMieterAnfragen.subtitle')}
      showSave={false}
      role="mieter"
    >
      <AktuellBox label={t('subMieterAnfragen.statusLbl')}>
        <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">2</p>
        <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subMieterAnfragen.newReplies')}</p>
      </AktuellBox>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Salon Anna', d: '20. Mai', s: t('subMieterAnfragen.confirmed'), c: '#6ABF80' },
          { n: 'Studio Rio', d: '24. Mai', s: t('subMieterAnfragen.openTag'), c: '#C4A86A' },
          { n: 'Lounge Max', d: '01. Juni', s: t('subMieterAnfragen.rejected'), c: '#E85040' },
        ].map((r, i) => (
          <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</span>
              <span style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(255,255,255,0.06)', color: r.c, borderRadius: 8, fontWeight: 700, letterSpacing: 1 }}>{r.s}</span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--stone)' }}>{r.d}</p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
