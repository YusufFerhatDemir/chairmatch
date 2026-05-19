'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel="Mein Bereich"
      title='Stühle suchen'
      subtitle='Filter setzen und Treffer ansehen.'
      showSave={true}
      storageKey="cm_mieter_suchen"
      role="mieter"
    >
      <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Stadt</label>
            <input type="text" defaultValue="Köln" style={{
              width: '100%', marginTop: 6, padding: '12px 14px',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
            }} data-storage="value"/>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Max. €/Tag</label>
            <input type="number" defaultValue="100" style={{
              width: '100%', marginTop: 6, padding: '12px 14px',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
            }}/>
          </div>
          <GoldButton>🔍 Suchen</GoldButton>
    </MeinBereichSubPage>
  )
}
