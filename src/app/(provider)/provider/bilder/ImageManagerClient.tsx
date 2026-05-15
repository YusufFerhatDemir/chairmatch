'use client'

/**
 * ImageManagerClient — Bilder-Manager für Salon-Inhaber.
 *
 * 5 Sektionen (Lieferando/Wolt-Style):
 *   - Logo (1 Bild, square, brand-recognition)
 *   - Cover (1 Bild, 16:9, Hero-Banner)
 *   - Galerie (bis 12 Bilder, Innenraum + Kabinen)
 *   - Team (bis 8 Bilder)
 *   - Vorher-Nachher (bis 8 Bilder)
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import ImageUpload from '@/components/ImageUpload'

type ImageType = 'logo' | 'cover' | 'gallery' | 'before_after' | 'team'

interface SalonImage {
  id: string
  imageType: ImageType
  url: string
}

interface Props {
  salonId: string
  salonName: string
  salonSlug: string | null
  initialImages: SalonImage[]
}

const SECTIONS: Array<{
  type: ImageType
  title: string
  description: string
  maxFiles: number
  aspectRatio: string
  recommended: string
}> = [
  {
    type: 'logo',
    title: 'Logo',
    description: 'Dein Salon-Logo. Quadratisch, klar erkennbar. Wird neben deinem Namen in Suchergebnissen, Salon-Karten und Buchungs-Bestätigungen angezeigt.',
    maxFiles: 1,
    aspectRatio: '1/1',
    recommended: 'Empfohlen: 400×400 Pixel, transparenter Hintergrund (PNG)',
  },
  {
    type: 'cover',
    title: 'Cover-Bild',
    description: 'Hero-Banner auf deiner Salon-Seite. Das erste was Mieter sehen — wähle ein hochwertiges Foto deines Salons.',
    maxFiles: 1,
    aspectRatio: '16/9',
    recommended: 'Empfohlen: 1600×900 Pixel, querformat, viel Tageslicht',
  },
  {
    type: 'gallery',
    title: 'Galerie (Salon & Kabinen)',
    description: 'Innenraum, Arbeitsplätze, Kabinen, Wartebereich. Mieter wollen sehen wo sie arbeiten würden — keine Bewerbung ohne diese Bilder.',
    maxFiles: 12,
    aspectRatio: '4/3',
    recommended: 'Empfohlen: mindestens 6 Bilder, gut beleuchtet, ohne Kunden',
  },
  {
    type: 'team',
    title: 'Team',
    description: 'Optional. Du und deine Mitarbeiter — schafft Vertrauen.',
    maxFiles: 8,
    aspectRatio: '3/4',
    recommended: 'Hochformat, freundlich, einheitlicher Stil',
  },
  {
    type: 'before_after',
    title: 'Vorher-Nachher',
    description: 'Showcase deiner Arbeit. Hilft Spezialisierung zu zeigen (Balayage, Curly-Cut, etc.).',
    maxFiles: 8,
    aspectRatio: '1/1',
    recommended: 'Splittscreen oder zwei Bilder nebeneinander',
  },
]

export function ImageManagerClient({ salonId, salonName, salonSlug, initialImages }: Props) {
  const [images, setImages] = useState<SalonImage[]>(initialImages)

  const handleUpload = useCallback((type: ImageType) => (img: { id: string; url: string }) => {
    setImages((prev) => {
      // Für Logo + Cover: alte ersetzen (nur 1 erlaubt)
      if (type === 'logo' || type === 'cover') {
        const filtered = prev.filter((i) => i.imageType !== type)
        return [...filtered, { id: img.id, imageType: type, url: img.url }]
      }
      return [...prev, { id: img.id, imageType: type, url: img.url }]
    })
  }, [])

  const handleDelete = useCallback(async (imageId: string) => {
    try {
      const res = await fetch(`/api/upload/${imageId}`, { method: 'DELETE' })
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.id !== imageId))
      }
    } catch {
      // silently fail (logger handles backend)
    }
  }, [])

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 className="cinzel" style={{ color: 'var(--gold2)', fontSize: 24, marginBottom: 4 }}>
            Bilder verwalten
          </h1>
          <p style={{ color: 'var(--stone)', fontSize: 13, marginBottom: 12 }}>
            <strong style={{ color: 'var(--cream)' }}>{salonName}</strong>
            {salonSlug && (
              <>
                {' · '}
                <Link
                  href={`/salon/${salonSlug}` as never}
                  style={{ color: 'var(--gold)', textDecoration: 'underline' }}
                >
                  Vorschau ↗
                </Link>
              </>
            )}
          </p>
          <p style={{ fontSize: 12, color: 'var(--stone2)', lineHeight: 1.5 }}>
            Salons mit Logo + Cover + 6+ Galerie-Bildern bekommen typisch <strong style={{ color: 'var(--gold2)' }}>+45 % mehr Anfragen</strong>.
            Bilder bringen Vertrauen.
          </p>
        </div>

        {SECTIONS.map((section) => {
          const sectionImages = images.filter((i) => i.imageType === section.type)
          const remaining = section.maxFiles - sectionImages.length

          return (
            <section
              key={section.type}
              style={{
                background: 'var(--c2)',
                borderRadius: 14,
                padding: 18,
                marginBottom: 16,
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <h2 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', margin: 0 }}>
                  {section.title}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--stone)', fontWeight: 600 }}>
                  {sectionImages.length} / {section.maxFiles}
                </span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--stone)', margin: '0 0 6px', lineHeight: 1.5 }}>
                {section.description}
              </p>
              <p style={{ fontSize: 10, color: 'var(--stone2)', margin: '0 0 14px' }}>
                {section.recommended}
              </p>

              {/* Existing images */}
              {sectionImages.length > 0 && (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: section.type === 'gallery'
                    ? 'repeat(auto-fill, minmax(100px, 1fr))'
                    : 'repeat(auto-fill, minmax(120px, 1fr))',
                  gap: 8,
                  marginBottom: 14,
                }}>
                  {sectionImages.map((img) => (
                    <div
                      key={img.id}
                      style={{
                        position: 'relative',
                        aspectRatio: section.aspectRatio,
                        borderRadius: 10,
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={section.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <button
                        onClick={() => handleDelete(img.id)}
                        style={{
                          position: 'absolute',
                          top: 4, right: 4,
                          width: 24, height: 24,
                          borderRadius: '50%',
                          background: 'rgba(0,0,0,0.7)',
                          color: 'var(--red)',
                          border: 'none',
                          fontSize: 14,
                          cursor: 'pointer',
                          lineHeight: 1,
                        }}
                        aria-label="Bild löschen"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload-Zone (nur wenn noch Platz) */}
              {remaining > 0 && (
                <ImageUpload
                  salonId={salonId}
                  imageType={section.type}
                  onUpload={handleUpload(section.type)}
                  maxFiles={remaining}
                />
              )}

              {remaining === 0 && (
                <p style={{ fontSize: 11, color: 'var(--stone2)', textAlign: 'center', margin: '8px 0 0' }}>
                  Maximum erreicht. Lösche ein Bild um Platz zu schaffen.
                </p>
              )}
            </section>
          )
        })}

        {/* Tipps */}
        <section style={{
          background: 'linear-gradient(135deg, rgba(212,175,55,0.10), rgba(176,144,96,0.04))',
          border: '1px solid var(--gold)',
          borderRadius: 14, padding: 18, marginTop: 20,
        }}>
          <h2 className="cinzel" style={{ fontSize: 15, color: 'var(--gold2)', margin: '0 0 12px' }}>
            Tipps für gute Bilder
          </h2>
          <ul style={{ margin: 0, padding: '0 0 0 20px', color: 'var(--stone)', fontSize: 12, lineHeight: 1.7 }}>
            <li><strong style={{ color: 'var(--cream)' }}>Tageslicht.</strong> Foto bei großem Fenster, vermeide Neonröhren-Optik.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Aufgeräumt.</strong> Keine Kabel, keine Handtücher auf Stühlen.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Keine Kunden im Bild.</strong> Mieter wollen den Salon sehen, nicht fremde Personen.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Echte Bilder.</strong> Keine Stock-Photos — Mieter erkennen Fake sofort.</li>
            <li><strong style={{ color: 'var(--cream)' }}>Mehrere Perspektiven.</strong> Eingang, Arbeitsplätze, Wartebereich, WC-Bereich (Frontseite).</li>
            <li><strong style={{ color: 'var(--cream)' }}>Hochkant für Stühle.</strong> Querformat für Innenraum-Übersichten.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
