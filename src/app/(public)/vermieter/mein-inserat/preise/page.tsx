'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Preise'
      subtitle='Was kostet die Miete?'
      showSave={true}
      storageKey="cm_vermieter_preise"
      role="vermieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { l: 'Pro Stunde', v: '15' },
              { l: 'Pro Tag', v: '90' },
              { l: 'Pro Woche', v: '450' },
              { l: 'Pro Monat', v: '1500' },
            ].map(p => (
              <div key={p.l} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{p.l}</span>
                <input type="number" defaultValue={p.v} style={{
                  width: 80, padding: '8px 10px', background: 'var(--c2)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.2)', borderRadius: 8,
                  fontSize: 14, fontFamily: 'inherit', textAlign: 'right',
                }} data-storage="value"/>
                <span style={{ color: 'var(--gold2)', fontSize: 14, fontWeight: 700 }}>€</span>
              </div>
            ))}
          </div>
    </MeinBereichSubPage>
  )
}
