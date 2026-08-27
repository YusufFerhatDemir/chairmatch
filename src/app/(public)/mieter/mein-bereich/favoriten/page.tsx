'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MeinBereichSubPage, { AktuellBox } from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'
import { apiGet } from '@/lib/client-api'
import type { RentalListing } from '@/modules/rentals/rental-listing.types'

/**
 * Merkliste (Mieter) — /mieter/mein-bereich/favoriten
 *
 * Bis 2026-08-27 zeigte die Seite die Kachel "4 Favoriten" und vier erfundene
 * Inserate mit erfundenen Preisen ("Atelier Klein · Düsseldorf, €110/Tag").
 * Die Herzchen, die der Nutzer in der Suche wirklich gesetzt hatte, tauchten
 * nirgends auf.
 *
 * Gemerkt wird geraetelokal (`localStorage['cm_inserate_favs']`), und die
 * Seite sagt das jetzt auch ausdruecklich. Serverseitig ginge es heute nicht:
 * `favorites` hat live nur `customer_id` und `salon_id` — eine `equipment_id`
 * gibt es nicht (Spaltensonde 2026-08-27, 42703). Ein einzelnes Mietobjekt
 * laesst sich dort also gar nicht ablegen; ein Salon ist etwas anderes als
 * der eine Stuhl darin. Das waere eine Migration, keine Codeaenderung.
 *
 * Die Daten zu den gemerkten IDs kommen aus GET /api/rental-listings?ids=…,
 * also aus der Datenbank: Namen und Preise sind echt und aktuell. IDs, zu
 * denen es kein Inserat mehr gibt, verschwinden aus der Liste, statt als
 * Karteileiche mit altem Preis stehen zu bleiben.
 */

const STORAGE_KEY = 'cm_inserate_favs'

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

export default function Page() {
  const t = useTranslations()
  const router = useRouter()
  const [ids, setIds] = useState<string[] | null>(null)
  const [listings, setListings] = useState<RentalListing[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let stored: string[] = []
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      if (Array.isArray(raw)) stored = raw.filter((x): x is string => typeof x === 'string')
    } catch {}
    setIds(stored)
  }, [])

  useEffect(() => {
    if (ids === null) return
    if (ids.length === 0) {
      setListings([])
      setLaedt(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet<{ listings: RentalListing[] }>(
          `/api/rental-listings?ids=${encodeURIComponent(ids.join(','))}`,
        )
        if (cancelled) return
        setListings(res.listings ?? [])
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        setListings([])
        setFehler(err instanceof Error ? err.message : 'Merkliste konnte nicht geladen werden')
      } finally {
        if (!cancelled) setLaedt(false)
      }
    })()
    return () => { cancelled = true }
  }, [ids])

  function entfernen(id: string) {
    const next = (ids ?? []).filter(x => x !== id)
    setIds(next)
    setListings(prev => prev.filter(l => l.id !== id))
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subFavoriten.title')}
      subtitle={t('subFavoriten.subtitle')}
      showSave={false}
      role="mieter"
    >
      {!laedt && !fehler && (
        <AktuellBox label={t('subFavoriten.savedLbl')}>
          <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">{listings.length}</p>
          <p style={{ fontSize: 11, color: 'var(--stone)' }}>{t('subFavoriten.favorites')}</p>
        </AktuellBox>
      )}

      <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.5 }}>
        Deine Merkliste liegt nur auf diesem Gerät. Auf einem anderen Gerät oder nach dem Leeren des
        Browserspeichers ist sie leer.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {laedt && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

        {!laedt && fehler && (
          <p role="alert" style={{ fontSize: 12.5, color: '#FF8888', lineHeight: 1.5 }}>{fehler}</p>
        )}

        {!laedt && !fehler && listings.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
            {(ids?.length ?? 0) > 0
              ? 'Die gemerkten Inserate gibt es nicht mehr.'
              : 'Noch nichts gemerkt. Tippe in der Suche auf das Herz, um einen Platz hier abzulegen.'}
          </p>
        )}

        {!laedt && !fehler && listings.map(l => (
          <div key={l.id} style={{
            background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
            borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div onClick={() => router.push(`/inserat/${l.id}` as never)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>{l.name}</p>
              <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                {[l.salon?.name, l.salon?.city].filter(Boolean).join(' · ') || 'Salon nicht hinterlegt'}
              </p>
            </div>
            <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
              {euro(l.pricePerDayCents)}/Tag
            </span>
            <button onClick={() => entfernen(l.id)} aria-label="Aus Merkliste entfernen"
              style={{ flexShrink: 0, width: 30, height: 30, borderRadius: '50%', background: 'transparent', border: '1px solid rgba(232,80,64,0.3)', color: '#FF8888', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}
            >✕</button>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
