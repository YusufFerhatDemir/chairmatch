'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Bewertungen'
      subtitle='Was Kunden über dich sagen.'
      showSave={true}
    >
      <AktuellBox label="Gesamt">
            <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">4,9 ★</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>aus 47 Bewertungen · 3 neu</p>
          </AktuellBox>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { name: 'Anna K.', rating: 5, txt: 'Super Atmosphäre, sehr freundlich!' },
              { name: 'Max R.', rating: 5, txt: 'Bester Salon in Köln. Komme wieder.' },
              { name: 'Lisa M.', rating: 4, txt: 'Toll, ein Stern Abzug wegen Wartezeit.' },
            ].map((r, i) => (
              <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</span>
                  <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700 }}>{'★'.repeat(r.rating)}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.5 }}>{r.txt}</p>
              </div>
            ))}
          </div>
    </MeinBereichSubPage>
  )
}
