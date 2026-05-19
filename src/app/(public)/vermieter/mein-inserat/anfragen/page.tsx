'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Mietanfragen'
      subtitle='Wer will deinen Platz mieten?'
      showSave={false}
    >
      <AktuellBox label="Offen">
            <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">5</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>neue Anfragen · ungesehen</p>
          </AktuellBox>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 'Marko F.', d: '20.–22. Mai · Stuhl', s: 'NEU' },
              { n: 'Sarah B.', d: '24. Mai · ganzer Tag', s: 'NEU' },
              { n: 'Tim H.', d: '01. Juni · 4 Std.', s: 'NEU' },
            ].map((r, i) => (
              <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.18)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{r.n}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', background: '#E85040', color: '#fff', borderRadius: 8, fontWeight: 700 }}>{r.s}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--stone)' }}>{r.d}</p>
              </div>
            ))}
          </div>
    </MeinBereichSubPage>
  )
}
