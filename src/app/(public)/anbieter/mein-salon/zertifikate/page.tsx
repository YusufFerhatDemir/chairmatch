// rebuild trigger
'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'

const DOCS: { id: string; title: string; sub: string; status: 'ok' | 'missing' }[] = [
  { id: 'hygiene',    title: 'Hygiene-Zertifikat',     sub: 'Gesundheitsamt · gültig 24 Mo.',     status: 'missing' },
  { id: 'approbation', title: 'Approbation / Berufsurkunde', sub: 'Arzt-Lizenz · Original-Scan', status: 'missing' },
  { id: 'medical',    title: 'Medical-Beauty-Lizenz',  sub: 'Pflicht bei Botox / Filler / Laser', status: 'missing' },
]

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title="Hygiene & Zertifikate"
      subtitle="Pflicht für OP-Räume und Medical Beauty."
      storageKey="cm_anbieter_zertifikate"
      role="anbieter"
      showSave={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DOCS.map((d) => (
          <div key={d.id} style={{
            background: 'var(--c1)',
            border: '0.5px solid rgba(196,168,106,0.18)',
            borderRadius: 12, padding: 14,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)' }}>{d.title}</p>
              <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{d.sub}</p>
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, letterSpacing: 1,
              background: d.status === 'ok' ? 'rgba(74,138,90,0.15)' : 'rgba(232,80,64,0.15)',
              color: d.status === 'ok' ? '#6ABF80' : '#FF8888',
            }}>
              {d.status === 'ok' ? 'HOCHGELADEN' : 'FEHLT'}
            </span>
          </div>
        ))}
      </div>

      <button style={{
        width: '100%', padding: 14, borderRadius: 14,
        background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
        color: '#1a1000', border: 'none',
        fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: '0 0 20px rgba(196,168,106,0.25)',
      }}>
        <span>📎</span><span>Dokument hochladen</span>
      </button>

      <div style={{
        background: 'rgba(232,80,64,0.06)',
        border: '1px solid rgba(232,80,64,0.25)',
        borderRadius: 12, padding: '12px 14px',
        fontSize: 12, color: '#FF9090', lineHeight: 1.6,
      }}>
        <strong>Pflicht-Info:</strong> Ohne vollständige Zertifikate kannst du dein OP-Raum-Inserat nicht veröffentlichen. Wir prüfen die Dokumente manuell innerhalb von 48&nbsp;Stunden.
      </div>
    </MeinBereichSubPage>
  )
}
