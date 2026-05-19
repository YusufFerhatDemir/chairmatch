'use client'

import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { DocumentUpload } from '@/components/UploadField'

const DOCS = [
  { id: 'hygiene',    title: 'Hygiene-Zertifikat',           sub: 'Gesundheitsamt · gültig 24 Mo.' },
  { id: 'approbation', title: 'Approbation / Berufsurkunde', sub: 'Arzt-Lizenz · Original-Scan' },
  { id: 'medical',    title: 'Medical-Beauty-Lizenz',        sub: 'Pflicht bei Botox / Filler / Laser' },
]

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title="Hygiene & Zertifikate"
      subtitle="Pflicht für OP-Räume und Medical Beauty."
      role="anbieter"
      showSave={false}
    >
      <DocumentUpload storageKey="cm_anbieter_zertifikate" docs={DOCS} />
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
