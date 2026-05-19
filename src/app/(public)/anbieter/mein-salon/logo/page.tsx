'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { SingleImageUpload } from '@/components/UploadField'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title="Logo / Profilbild"
      subtitle="Das runde Bild, das Kunden zuerst sehen."
      storageKey="cm_anbieter_logo_meta"
      role="anbieter"
      showSave={false}
    >
      <SingleImageUpload storageKey="cm_anbieter_logo_image" placeholder="YD" />
      <TippsBox title="Tipps für ein gutes Logo" tipps={[
        'Quadratisch · mind. 400 × 400 px',
        'Salon-Logo oder dein eigenes Foto (Freelancer)',
        'Heller Vordergrund · dunkler Rand',
        'Keine Wasserzeichen anderer Apps',
      ]} />
    </MeinBereichSubPage>
  )
}
