'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel="Mein Bereich"
      title='Meine Anfragen'
      subtitle='Deine offenen und erledigten Anfragen.'
      showSave={false}
    >
      <AktuellBox label="Status">
            <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">2</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>Antworten neu</p>
          </AktuellBox>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { n: 'Salon Anna', d: '20. Mai', s: 'BESTÄTIGT', c: '#6ABF80' },
              { n: 'Studio Rio', d: '24. Mai', s: 'OFFEN', c: '#C4A86A' },
              { n: 'Lounge Max', d: '01. Juni', s: 'ABGELEHNT', c: '#E85040' },
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
