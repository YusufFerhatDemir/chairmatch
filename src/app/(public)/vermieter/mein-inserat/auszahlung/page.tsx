'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title='Auszahlung'
      subtitle='Wohin geht die Miete?'
      showSave={true}
    >
      <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5, textTransform: 'uppercase' }}>IBAN</label>
            <input type="text" placeholder="DE89 3704 0044 0532 0130 00" style={{
              width: '100%', marginTop: 6, padding: '12px 14px',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
              fontSize: 14, fontFamily: 'inherit', letterSpacing: 1,
            }}/>
          </div>
          <TippsBox title="Auszahlungs-Info" tipps={[
            'Mieter zahlt vor der Buchung über Stripe',
            'Auszahlung an dich nach erfolgreicher Miete',
            '0 % Provision',
            'Rechnung per Mail',
          ]} />
    </MeinBereichSubPage>
  )
}
