'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel="Mein Bereich"
      title='Mein Profil'
      subtitle='Deine Daten als Mieter.'
      showSave={true}
      storageKey="cm_mieter_profil"
      role="mieter"
    >
      <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Name</label>
            <input type="text" placeholder="Max Mustermann" style={{
              width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
            }} data-storage="value"/>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Beruf</label>
            <select style={{
              width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
            }}>
              <option>Friseur / Friseurin</option>
              <option>Barber</option>
              <option>Kosmetiker / Kosmetikerin</option>
              <option>Nageldesigner / -in</option>
              <option>Masseur / Masseuse</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Lizenz / Meisterbrief</label>
            <input type="text" placeholder="Lizenz-Nr. oder Meisterbrief-Nr." style={{
              width: '100%', marginTop: 6, padding: '12px 14px', background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
            }}/>
          </div>
    </MeinBereichSubPage>
  )
}
