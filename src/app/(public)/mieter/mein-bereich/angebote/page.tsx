'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MeinBereichSubPage from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'
import { apiGet } from '@/lib/client-api'
import type { RentalListing } from '@/modules/rentals/rental-listing.types'

/**
 * Angebote (Mieter) — /mieter/mein-bereich/angebote
 *
 * Bis 2026-08-27 standen hier drei erfundene Angebote mit erfundenen Preisen
 * ("Salon Bella · Köln — Heute frei · 4 Std. — €60/Tag"). Nichts davon
 * existierte; wer daraufgeklickt haette, waere ins Leere gelaufen.
 *
 * Es gibt in der Datenbank kein Konzept "Angebot" — keine Rabatte, keine
 * befristeten Aktionen, keine Tabelle dafuer. Erfunden wird deshalb auch
 * nichts nach: die Seite zeigt die guenstigsten wirklich freien Inserate aus
 * GET /api/rental-listings und sagt genau das im Untertitel. Lieber eine
 * ehrliche Liste als ein erfundenes Schnaeppchen.
 */

const MAX = 10

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

export default function Page() {
  const t = useTranslations()
  const router = useRouter()
  const [listings, setListings] = useState<RentalListing[]>([])
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await apiGet<{ listings: RentalListing[] }>('/api/rental-listings?limit=100')
        if (cancelled) return
        const sorted = [...(res.listings ?? [])]
          .sort((a, b) => a.pricePerDayCents - b.pricePerDayCents)
          .slice(0, MAX)
        setListings(sorted)
        setFehler(null)
      } catch (err) {
        if (cancelled) return
        setListings([])
        setFehler(err instanceof Error ? err.message : 'Angebote konnten nicht geladen werden')
      } finally {
        if (!cancelled) setLaedt(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <MeinBereichSubPage
      parentHref="/mieter/mein-bereich"
      parentLabel={t('meinBereich.title')}
      title={t('subAngebote.title')}
      subtitle="Die günstigsten freien Plätze auf ChairMatch"
      showSave={false}
      role="mieter"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {laedt && <p style={{ fontSize: 12, color: 'var(--stone)' }}>Wird geladen…</p>}

        {!laedt && fehler && (
          <p role="alert" style={{ fontSize: 12.5, color: '#FF8888', lineHeight: 1.5 }}>{fehler}</p>
        )}

        {!laedt && !fehler && listings.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6 }}>
            Zurzeit ist kein Platz frei. Sobald Salons Plätze einstellen, stehen sie hier.
          </p>
        )}

        {!laedt && !fehler && listings.map(l => (
          <div key={l.id} onClick={() => router.push(`/inserat/${l.id}` as never)} style={{
            background: 'linear-gradient(145deg, rgba(191,149,63,0.05), var(--c1) 50%, rgba(179,135,40,0.03))',
            border: '1px solid rgba(191,149,63,0.22)', borderRadius: 14, padding: 14, cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{l.name}</span>
              <span className="text-gold-metallic" style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                {euro(l.pricePerDayCents)}/Tag
              </span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>
              {[l.salon?.name, l.salon?.city].filter(Boolean).join(' · ') || 'Salon nicht hinterlegt'}
              {l.pricePerHourCents !== null ? ` · ${euro(l.pricePerHourCents)}/Std.` : ''}
            </p>
          </div>
        ))}
      </div>
    </MeinBereichSubPage>
  )
}
