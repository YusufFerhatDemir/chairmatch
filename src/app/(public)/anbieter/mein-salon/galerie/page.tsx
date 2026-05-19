'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Salon-Galerie'
      subtitle='Bilder die im Profil gezeigt werden.'
      showSave={true}
      storageKey="cm_anbieter_galerie"
      role="anbieter"
    >
      <AktuellBox label="Hochgeladen">
            <p style={{ fontSize: 24, color: 'var(--gold2)' }}>0 / 12</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>Bilder · max. 12</p>
          </AktuellBox>
          <GoldButton>+ Bilder hochladen</GoldButton>
          <TippsBox title="Was Kunden begeistert" tipps={[
            'Mind. 3 Bilder · Innenraum, Stühle, Detail',
            'Tageslicht · hell · scharf',
            'Keine Personen ohne deren Einverständnis',
            'JPG oder PNG · max. 5 MB pro Bild',
          ]} />
    </MeinBereichSubPage>
  )
}
