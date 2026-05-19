'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Ausstattung'
      subtitle='Was ist beim Platz inklusive?'
      showSave={true}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              'Spiegel','Föhn','Glätteisen','Schere & Kämme','Sterilisator',
              'Sitzgelegenheit für Kunden','WLAN','Klimaanlage','Wasseranschluss','Kaffeemaschine',
            ].map(item => (
              <label key={item} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
              }}>
                <input type="checkbox" style={{ accentColor: '#C4A86A', width: 18, height: 18 }}/>
                <span style={{ fontSize: 13, color: 'var(--cream)' }}>{item}</span>
              </label>
            ))}
          </div>
    </MeinBereichSubPage>
  )
}
