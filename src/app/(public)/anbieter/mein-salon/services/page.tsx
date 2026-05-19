'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Services & Preise'
      subtitle='Was bietest du an? Mit Preisen und Dauer.'
      showSave={true}
      storageKey="cm_anbieter_services"
      role="anbieter"
    >
      <AktuellBox label="Aktive Services">
            <p style={{ fontSize: 32, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">0</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>Noch keine Services angelegt</p>
          </AktuellBox>
          <GoldButton>+ Service hinzufügen</GoldButton>
          <TippsBox title="Beispiele" tipps={[
            'Damenschnitt · 60 Min · 45 €',
            'Färben · 90 Min · 60 €',
            'Hot-Towel-Rasur · 45 Min · 30 €',
            'Preise später anpassbar',
          ]} />
    </MeinBereichSubPage>
  )
}
