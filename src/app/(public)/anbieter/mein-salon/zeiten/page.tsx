'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Öffnungszeiten'
      subtitle='Wann bist du erreichbar?'
      showSave={true}
      storageKey="cm_anbieter_zeiten"
      role="anbieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
              <div key={d} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, minWidth: 30, color: 'var(--cream)' }}>{d}</span>
                <input type="time" defaultValue="09:00" style={{
                  flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                }} data-storage="value"/>
                <span style={{ color: 'var(--gold2)' }}>—</span>
                <input type="time" defaultValue="18:00" style={{
                  flex: 1, padding: '6px 8px', background: 'var(--c2)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit',
                }}/>
              </div>
            ))}
          </div>
    </MeinBereichSubPage>
  )
}
