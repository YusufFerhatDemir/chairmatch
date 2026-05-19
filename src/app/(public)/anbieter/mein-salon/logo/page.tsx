'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Logo / Profilbild'
      subtitle='Das runde Bild, das Kunden zuerst sehen.'
      showSave={true}
    >
      <AktuellBox>
            <div style={{
              width: 140, height: 140, borderRadius: '50%',
              border: '2px solid var(--gold2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Cinzel', fontSize: 42, fontWeight: 600,
              background: 'linear-gradient(135deg, #2A2418, #161210)',
            }}>
              <span className="text-gold-metallic">YD</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>Noch kein Bild · Initialen</p>
          </AktuellBox>
          <GoldButton>📷 Bild auswählen</GoldButton>
          <TippsBox title="Tipps für ein gutes Logo" tipps={[
            'Quadratisch · mind. 400 × 400 px',
            'Salon-Logo oder dein eigenes Foto (Freelancer)',
            'Heller Vordergrund · dunkler Rand',
            'Keine Wasserzeichen anderer Apps',
          ]} />
    </MeinBereichSubPage>
  )
}
