'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Verfügbarkeit'
      subtitle='Wann ist der Platz frei?'
      showSave={true}
      storageKey="cm_vermieter_verfuegbarkeit"
      role="vermieter"
    >
      <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Tage</label>
            <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
              {['Mo','Di','Mi','Do','Fr','Sa','So'].map(d => (
                <button key={d} style={{
                  flex: 1, padding: '8px 0',
                  background: 'var(--c1)', color: 'var(--cream)',
                  border: '0.5px solid rgba(196,168,106,0.25)',
                  borderRadius: 8, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                }}>{d}</button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5 }}>Uhrzeit</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              <input type="time" defaultValue="09:00" style={{
                flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
                border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
              }} data-storage="value"/>
              <span style={{ color: 'var(--gold2)' }}>—</span>
              <input type="time" defaultValue="18:00" style={{
                flex: 1, padding: '10px 12px', background: 'var(--c1)', color: 'var(--cream)',
                border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
              }}/>
            </div>
          </div>
    </MeinBereichSubPage>
  )
}
