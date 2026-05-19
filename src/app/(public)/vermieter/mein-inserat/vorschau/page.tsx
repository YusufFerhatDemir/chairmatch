'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Live-Vorschau'
      subtitle='So sehen Mieter dein Inserat.'
      showSave={false}
    >
      <AktuellBox label="Vorschau">
            <p style={{ fontSize: 14, color: 'var(--cream)', textAlign: 'center', lineHeight: 1.5 }}>
              Hier siehst du <b className="text-gold-metallic">genau wie Mieter</b> dein Inserat in der App finden — mit Fotos, Preisen, Bewertungen.
            </p>
          </AktuellBox>
          <GoldButton>👁 Vorschau öffnen</GoldButton>
    </MeinBereichSubPage>
  )
}
