'use client'

import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title='Auszahlung'
      subtitle='Wohin geht das Geld vom Kunden?'
      showSave={true}
      storageKey="cm_anbieter_auszahlung"
      role="anbieter"
    >
      <AktuellBox label="Status">
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)' }}>Noch nicht eingerichtet</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>Du brauchst eine IBAN, damit Kunden zahlen können.</p>
          </AktuellBox>
          <div>
            <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5, textTransform: 'uppercase' }}>IBAN</label>
            <input type="text" placeholder="DE89 3704 0044 0532 0130 00" style={{
              width: '100%', marginTop: 6, padding: '12px 14px',
              background: 'var(--c1)', color: 'var(--cream)',
              border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
              fontSize: 14, fontFamily: 'inherit', letterSpacing: 1,
            }} data-storage="value"/>
          </div>
          <TippsBox title="Auszahlungs-Info" tipps={[
            'Auszahlung 1× pro Woche auf dein Konto',
            '0 % Provision für Vermietungen',
            'Sichere Abwicklung über Stripe',
            'Du bekommst eine Rechnung per Mail',
          ]} />
    </MeinBereichSubPage>
  )
}
