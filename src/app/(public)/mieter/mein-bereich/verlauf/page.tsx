'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

import { useTranslations } from '@/i18n/client'

export default function Page() {
  const t = useTranslations()
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subVerlauf.title')}
      subtitle={t('subVerlauf.subtitle')}
      showSave={false}
      role="mieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { n: 'Salon Anna · Köln', d: '12. April 2026 · 1 Tag', p: '€85' },
          { n: 'Studio Rio · Bonn', d: '28. März 2026 · 4 Std.', p: '€60' },
          { n: 'Lounge Max · Düsseldorf', d: '15. März 2026 · 3 Tage', p: '€270' },
        ].map((b, i) => (
          <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{b.n}</span>
              <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700 }}>{b.p}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>{b.d}</p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
