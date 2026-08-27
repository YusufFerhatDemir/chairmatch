'use client'

import { useEffect, useState } from 'react'
import MeinBereichSubPage, { AktuellBox } from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'

/**
 * Meine Bewertungen (Anbieter) — /anbieter/mein-salon/bewertungen
 *
 * Bis Track 10 stand auf dieser Seite eine vollstaendig erfundene Reputation,
 * fest im Quelltext und fuer jeden Saloninhaber dieselbe:
 *
 *   4,9 ★ · "von {count}" · Anna K. ★★★★★ "Super Atmosphäre, sehr freundlich!"
 *                           Max R.  ★★★★★ "Bester Salon in der Stadt."
 *                           Lisa M. ★★★★  "Toll, ein Stern Abzug wegen Wartezeit."
 *
 * Es gab dazu keinen Abruf, keinen Endpunkt und keine Fehlerbehandlung — die
 * Zahlen waren Markup. Ein Salon ohne eine einzige Bewertung sah hier 47
 * davon; ein Salon mit einer 2-Sterne-Bewertung sah 4,9. Der Aufruf
 * `t('subBewertungen.fromCount', { n: 47, x: 3 })` uebergab dazu `n`/`x` an
 * eine Vorlage, die `{count}` erwartet — auf dem Bildschirm stand deshalb
 * woertlich "von {count}".
 *
 * Die Zahl, die ein Betreiber fuer seine eigene Reputation haelt, ist die
 * Grundlage seiner Preise und seiner Werbung. Jetzt kommt sie aus
 * `GET /api/provider/reviews` — den echten Kundenbewertungen seines Salons —
 * und wenn es keine gibt, steht das da. Kein Fallback auf Beispieldaten:
 * schlaegt der Abruf fehl, sagt die Seite genau das.
 */

interface ProviderReview {
  id: string
  rating: number
  comment: string | null
  reply: string | null
  repliedAt: string | null
  createdAt: string
  authorLabel: string
}

interface ReviewsResponse {
  salonId: string | null
  reviewCount: number
  avgRating: number | null
  reviews: ProviderReview[]
}

function fmtRating(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Page() {
  const t = useTranslations()
  const [daten, setDaten] = useState<ReviewsResponse | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)

  useEffect(() => {
    let abgebrochen = false
    fetch('/api/provider/reviews', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body?.error || 'Bewertungen konnten nicht geladen werden.')
        return body as ReviewsResponse
      })
      .then(d => { if (!abgebrochen) { setDaten(d); setFehler(null) } })
      .catch((err: unknown) => {
        if (abgebrochen) return
        setDaten(null)
        setFehler(err instanceof Error ? err.message : 'Bewertungen konnten nicht geladen werden.')
      })
      .finally(() => { if (!abgebrochen) setLaedt(false) })
    return () => { abgebrochen = true }
  }, [])

  const reviews = daten?.reviews ?? []

  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subBewertungen.title')}
      subtitle={t('subBewertungen.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <AktuellBox label={t('subBewertungen.totalLbl')}>
        {laedt ? (
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Wird geladen …</p>
        ) : fehler ? (
          <p style={{ fontSize: 13, color: '#FF9090', textAlign: 'center', lineHeight: 1.5 }}>{fehler}</p>
        ) : daten && daten.avgRating !== null ? (
          <>
            <p style={{ fontSize: 38, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">
              {fmtRating(daten.avgRating)} ★
            </p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>
              {daten.reviewCount === 1 ? 'aus 1 Bewertung' : `aus ${daten.reviewCount} Bewertungen`}
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: 24, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">—</p>
            <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center', lineHeight: 1.5 }}>
              {daten?.salonId
                ? 'Noch keine Bewertung. Nach dem ersten abgeschlossenen Termin kann dein Kunde bewerten.'
                : 'Noch kein Salon hinterlegt — schließe zuerst das Anbieter-Onboarding ab.'}
            </p>
          </>
        )}
      </AktuellBox>

      {reviews.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reviews.map(r => (
            <div key={r.id} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{r.authorLabel}</span>
                <span className="text-gold-metallic" style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))}
                </span>
              </div>
              {r.comment && (
                <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.5 }}>{r.comment}</p>
              )}
              <p style={{ fontSize: 10, color: 'var(--stone)', opacity: 0.7, marginTop: 6 }}>{fmtDate(r.createdAt)}</p>
              {r.reply && (
                <p style={{
                  fontSize: 12, color: 'var(--cream)', lineHeight: 1.5, marginTop: 8,
                  paddingLeft: 10, borderLeft: '2px solid rgba(196,168,106,0.35)',
                }}>
                  <strong style={{ color: 'var(--gold2)' }}>Deine Antwort:</strong> {r.reply}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </MeinBereichSubPage>
  )
}
