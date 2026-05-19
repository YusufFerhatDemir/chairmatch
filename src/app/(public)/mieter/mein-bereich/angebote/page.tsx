'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subAngebote.title')}
      subtitle={t('subAngebote.subtitle')}
      showSave={false}
      role="mieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Salon Bella · Köln', d: 'Heute frei · 4 Std.', p: '€60' },
          { n: 'Studio Luca · Köln', d: 'Morgen · ganzer Tag', p: '€80' },
          { n: 'Premium Lounge · Bonn', d: 'Diese Woche', p: '€95' },
        ].map((a, i) => (
          <div key={i} style={{ background: 'linear-gradient(145deg, rgba(191,149,63,0.05), var(--c1) 50%, rgba(179,135,40,0.03))', border: '1px solid rgba(191,149,63,0.22)', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{a.n}</span>
              <span className="text-gold-metallic" style={{ fontSize: 14, fontWeight: 700 }}>{a.p}/Tag</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>{a.d}</p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
