import { ImageResponse } from 'next/og'
import { getMagazinArtikel } from '@/lib/seo-data/magazin'

export const runtime = 'edge'
export const alt = 'ChairMatch Magazin Artikel'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props { params: { slug: string } }

export default async function Image({ params }: Props) {
  const article = getMagazinArtikel(params.slug)
  const title = article?.title || 'ChairMatch Magazin'
  const category = article?.category || 'Magazin'
  const readMin = article?.readMinutes || 8

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0907, #1a1612 50%, #2a2018)',
        color: '#f4ead5', padding: 80,
        fontFamily: 'system-ui, sans-serif',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 50 }}>
          <div style={{ fontSize: 26, color: '#d4af37', fontWeight: 700, display: 'flex' }}>
            ChairMatch · Magazin
          </div>
          <div style={{ fontSize: 18, color: '#9a8c78', display: 'flex' }}>
            ⏱ {readMin} Min Lesezeit
          </div>
        </div>

        <div style={{ fontSize: 22, color: '#9a8c78', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, display: 'flex' }}>
          {category}
        </div>

        <div style={{
          fontSize: title.length > 80 ? 50 : 60,
          fontWeight: 800,
          lineHeight: 1.15,
          color: '#f4ead5',
          maxWidth: 1040,
          display: 'flex',
        }}>
          {title.length > 130 ? title.slice(0, 127) + '…' : title}
        </div>

        <div style={{ position: 'absolute', bottom: 40, left: 80, right: 80, display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#9a8c78' }}>
          <div style={{ display: 'flex' }}>chairmatch.de/magazin/{params.slug}</div>
          <div style={{ display: 'flex' }}>Für Beauty-Profis</div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, transparent, #d4af37, transparent)' }} />
      </div>
    ),
    size,
  )
}
