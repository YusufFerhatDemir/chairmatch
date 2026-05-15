/**
 * /provider/bilder — Salon-Bilder verwalten (Logo, Cover, Galerie).
 *
 * Lieferando-Style:
 *  - 1 Logo (quadratisch, 200x200 empfohlen, im Salon-Card sichtbar)
 *  - 1 Cover-Bild (Hero-Banner, 1200x630 empfohlen)
 *  - bis 12 Galerie-Bilder (Kabinen, Stühle, Innenraum)
 *  - bis 8 Team-Bilder (Mitarbeiter)
 *  - bis 8 Vorher-Nachher (Behandlungs-Showcases)
 */

import { redirect } from 'next/navigation'
import { getServerSession } from '@/modules/auth/session'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { ImageManagerClient } from './ImageManagerClient'

export const metadata = { title: 'Bilder verwalten — ChairMatch' }

export default async function ProviderImagesPage() {
  const session = await getServerSession()
  if (!session?.user?.id) redirect('/auth?next=/provider/bilder')

  const supabase = getSupabaseAdmin()
  // Den Salon des eingeloggten Users finden
  const { data: salon } = await supabase
    .from('salons')
    .select('id, name, slug')
    .eq('owner_id', session.user.id)
    .limit(1)
    .maybeSingle()

  if (!salon) {
    return (
      <div className="shell"><div className="screen" style={{ padding: 20 }}>
        <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 22 }}>Bilder verwalten</h1>
        <p style={{ color: 'var(--stone)', marginTop: 16 }}>
          Du hast noch keinen Salon. Bitte erst als Anbieter registrieren.
        </p>
      </div></div>
    )
  }

  // Bestehende Bilder laden
  const { data: images } = await supabase
    .from('salon_images')
    .select('id, image_type, url, sort_order')
    .eq('salon_id', salon.id)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  return (
    <ImageManagerClient
      salonId={salon.id}
      salonName={salon.name}
      salonSlug={salon.slug}
      initialImages={(images || []).map((img) => ({
        id: img.id,
        imageType: img.image_type as 'logo' | 'cover' | 'gallery' | 'before_after' | 'team',
        url: img.url,
      }))}
    />
  )
}
