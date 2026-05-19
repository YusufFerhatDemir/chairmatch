'use client'

import MeinBereichSubPage, { TippsBox } from '@/components/MeinBereichSubPage'
import { GalleryUpload } from '@/components/UploadField'

export default function Page() {
  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel="Mein Salon"
      title="Salon-Galerie"
      subtitle="Bilder die im Profil gezeigt werden."
      storageKey="cm_anbieter_galerie_meta"
      role="anbieter"
      showSave={false}
    >
      <GalleryUpload storageKey="cm_anbieter_galerie_images" maxImages={12} label="Bildern" />
      <TippsBox title="Was Kunden begeistert" tipps={[
        'Mind. 3 Bilder · Innenraum, Stühle, Detail',
        'Tageslicht · hell · scharf',
        'Keine Personen ohne deren Einverständnis',
        'JPG oder PNG · max. 5 MB pro Bild',
      ]} />
    </MeinBereichSubPage>
  )
}
