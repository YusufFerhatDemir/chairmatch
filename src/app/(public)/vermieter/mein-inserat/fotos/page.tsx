'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Fotos'
      subtitle='Bilder deines Stuhls / der Liege.'
      showSave={true}
    >
      <AktuellBox label="Hochgeladen">
            <p style={{ fontSize: 24, color: 'var(--gold2)' }}>3 / 8</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>Mind. 3 Bilder · max. 8</p>
          </AktuellBox>
          <GoldButton>+ Bilder hochladen</GoldButton>
          <TippsBox title="Was Mieter sehen wollen" tipps={[
            'Klare Sicht auf den Arbeitsplatz',
            'Spiegel · Stuhl · Werkzeuge sichtbar',
            'Sauberer Raum · gutes Licht',
          ]} />
    </MeinBereichSubPage>
  )
}
