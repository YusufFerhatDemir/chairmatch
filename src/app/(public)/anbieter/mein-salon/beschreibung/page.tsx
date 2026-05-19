'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Beschreibung'
      subtitle='Was macht deinen Salon besonders?'
      showSave={true}
    >
      <textarea
            placeholder="Heller Salon im Zentrum mit 4 Stühlen, eigenem Lounge-Bereich und Espresso-Bar..."
            rows={6}
            style={{
              width: '100%', padding: '12px 14px',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 14,
              fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 140,
            }}
          />
          <TippsBox title="Tipps für gute Texte" tipps={[
            'Maximal 500 Zeichen · kurz und klar',
            'Was ist einzigartig? Lage · Stil · Stimmung',
            'Wer ist deine Zielgruppe?',
          ]} />
    </MeinBereichSubPage>
  )
}
