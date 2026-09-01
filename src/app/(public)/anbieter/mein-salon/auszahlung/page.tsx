'use client'

import { useState } from 'react'
import MeinBereichSubPage, { AktuellBox, TippsBox } from '@/components/MeinBereichSubPage'
import { apiGet, apiSend } from '@/lib/client-api'

import { useTranslations } from '@/i18n/client'

interface PayoutAccount {
  configured: boolean
  iban_masked: string
}

export default function Page() {
  const t = useTranslations()
  const [account, setAccount] = useState<PayoutAccount>({ configured: false, iban_masked: '' })

  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subAuszahlung.title')}
      subtitle={t('subAuszahlung.subtitle')}
      showSave={true}
      role="anbieter"
      loadValues={async () => {
        const { account } = await apiGet<{ account: PayoutAccount }>(
          '/api/me/payout-account?context=anbieter',
        )
        setAccount(account)
        // Die volle IBAN gibt der Server bewusst nie zurück — das Feld
        // bleibt leer, angezeigt wird nur der maskierte Bestand.
        return null
      }}
      onSave={async (values) => {
        const iban = String(values.iban ?? '').trim()
        if (!iban) throw new Error('Bitte IBAN eingeben')
        const res = await apiSend<{ account: PayoutAccount }>('/api/me/payout-account', 'PUT', {
          context: 'anbieter',
          iban,
        })
        setAccount(res.account)
      }}
    >
      <AktuellBox label={t('subAuszahlung.statusLbl')}>
        <p style={{ fontSize: 14, fontWeight: 700, color: account.configured ? '#6ABF80' : 'var(--gold2)' }}>
          {account.configured ? account.iban_masked : t('subAuszahlung.notSetup')}
        </p>
        <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center' }}>{t('subAuszahlung.ibanHint')}</p>
      </AktuellBox>
      <div>
        <label style={{ fontSize: 11, color: 'var(--stone)', letterSpacing: 1.5, textTransform: 'uppercase' }} htmlFor="auszahlung-iban">{t('subAuszahlung.ibanLbl')}</label>
        <input id="auszahlung-iban" type="text" data-storage="iban" inputMode="text" autoComplete="off"
          placeholder={account.configured ? 'Neue IBAN eingeben, um sie zu ersetzen' : 'DE89 3704 0044 0532 0130 00'}
          style={{
            width: '100%', marginTop: 6, padding: '12px 14px',
            background: 'var(--c1)', color: 'var(--cream)',
            border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
            fontSize: 14, fontFamily: 'inherit', letterSpacing: 1,
          }}/>
      </div>
      <TippsBox title={t('subAuszahlung.tippsTitle')} tipps={[
        t('subAuszahlung.tip1'), t('subAuszahlung.tip2'), t('subAuszahlung.tip3'), t('subAuszahlung.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
