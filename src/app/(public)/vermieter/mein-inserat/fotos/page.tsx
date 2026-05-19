'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { GalleryUpload } from '@/components/UploadField'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/vermieter/mein-inserat"
      parentLabel="Mein Inserat"
      title="Fotos"
      subtitle="Bilder deines Stuhls / der Liege."
      storageKey="cm_vermieter_fotos_meta"
      role="vermieter"
      showSave={false}
    >
      <GalleryUpload storageKey="cm_vermieter_fotos_images" maxImages={8} label="Fotos" />
      <TippsBox title="Was Mieter sehen wollen" tipps={[
        'Klare Sicht auf den Arbeitsplatz',
        'Spiegel · Stuhl · Werkzeuge sichtbar',
        'Sauberer Raum · gutes Licht',
      ]} />
    </MeinBereichSubPage>
  )
}
