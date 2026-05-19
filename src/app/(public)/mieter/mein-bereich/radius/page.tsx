'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel="Mein Bereich"
      title='Suchradius'
      subtitle='Wie weit darf der Stuhl entfernt sein?'
      showSave={true}
    >
      <AktuellBox label="Aktuell">
            <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">10 km</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>um Köln</p>
          </AktuellBox>
          <input type="range" min="1" max="50" defaultValue="10" style={{
            width: '100%', accentColor: '#C4A86A',
          }}/>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--stone)' }}>
            <span>1 km</span><span>25 km</span><span>50 km</span>
          </div>
          <TippsBox title="Tipp" tipps={[
            'Größerer Radius = mehr Auswahl',
            'Kleinerer Radius = bessere Anfahrt',
            '10–15 km sind in der Stadt ein guter Mittelwert',
          ]} />
    </MeinBereichSubPage>
  )
}
