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
 *
 * TRACK 25 — DIE ANTWORT. Diese Seite ZEIGTE eine Antwort des Inhabers
 * (`r.reply &&` weiter unten), bot aber nirgends an, eine zu SCHREIBEN. Der
 * Weg dorthin war vollstaendig fertig und gehaertet: `POST
 * /api/reviews/[id]/reply` mit `replyToReview` dahinter (Eigentuemer-Pruefung,
 * Miet-Bewertungen ausgeschlossen, verschlucktes Update repariert) — nur
 * hatte die Route im gesamten Repository keinen einzigen Aufrufer. Die
 * Spalten `reply`/`replied_at` konnten damit nie einen Wert bekommen, und die
 * Anzeige darunter war seit jeher toter Code. Eine oeffentliche Bewertung,
 * auf die der Betrieb nicht antworten kann, ist fuer ihn das Ende des
 * Gespraechs — dabei liest die Salonseite `reply` ebenfalls schon aus.
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

/**
 * Antwort schreiben oder aendern.
 *
 * `replySchema` verlangt 1–1000 Zeichen; beides wird hier schon abgefangen,
 * damit der Anbieter nicht erst nach dem Absenden erfaehrt, dass sein Text zu
 * lang ist. Die Route bleibt trotzdem die Instanz, die entscheidet.
 */
function AntwortFormular({
  review,
  onGespeichert,
}: {
  review: ProviderReview
  onGespeichert: (reply: string) => void
}) {
  const [offen, setOffen] = useState(false)
  const [text, setText] = useState(review.reply ?? '')
  const [speichert, setSpeichert] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const MAX = 1000
  const zuLang = text.length > MAX
  const leer = text.trim().length === 0

  async function speichern() {
    if (leer || zuLang) return
    setSpeichert(true)
    setFehler(null)
    try {
      const res = await fetch(`/api/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: text.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFehler(body?.error || 'Antwort konnte nicht gespeichert werden.')
        return
      }
      onGespeichert(text.trim())
      setOffen(false)
    } catch {
      setFehler('Antwort konnte nicht gespeichert werden.')
    } finally {
      setSpeichert(false)
    }
  }

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => { setText(review.reply ?? ''); setFehler(null); setOffen(true) }}
        style={{
          marginTop: 8, background: 'none', border: '0.5px solid rgba(196,168,106,0.35)',
          borderRadius: 8, color: 'var(--gold2)', fontSize: 11, padding: '6px 12px', cursor: 'pointer',
        }}
      >
        {review.reply ? 'Antwort bearbeiten' : 'Antworten'}
      </button>
    )
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <textarea aria-label="Deine Antwort — für Kundinnen und Kunden öffentlich sichtbar."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        placeholder="Deine Antwort — für Kundinnen und Kunden öffentlich sichtbar."
        style={{
          width: '100%', padding: 10, borderRadius: 8, background: 'var(--c2)',
          border: '0.5px solid rgba(196,168,106,0.25)', color: 'var(--cream)',
          fontSize: 12, lineHeight: 1.5, resize: 'vertical', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: zuLang ? '#FF9090' : 'var(--stone)', opacity: 0.8 }}>
          {text.length} / {MAX}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => { setOffen(false); setFehler(null) }}
            disabled={speichert}
            style={{
              background: 'none', border: 'none', color: 'var(--stone)',
              fontSize: 11, padding: '6px 10px', cursor: 'pointer',
            }}
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={speichern}
            disabled={speichert || leer || zuLang}
            style={{
              background: 'none', border: '0.5px solid rgba(196,168,106,0.45)', borderRadius: 8,
              color: speichert || leer || zuLang ? 'var(--stone)' : 'var(--gold2)',
              fontSize: 11, padding: '6px 12px',
              cursor: speichert || leer || zuLang ? 'default' : 'pointer',
            }}
          >
            {speichert ? 'Wird gespeichert …' : 'Antwort speichern'}
          </button>
        </div>
      </div>
      {fehler && <p style={{ fontSize: 11, color: '#FF9090', lineHeight: 1.4 }}>{fehler}</p>}
    </div>
  )
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

  /**
   * Die gespeicherte Antwort sofort in die Liste ziehen, ohne die Seite neu
   * zu laden. Geschrieben hat sie die Route — hier wird nur nachgezogen, was
   * dort bereits bestaetigt ist.
   */
  function antwortUebernehmen(reviewId: string, reply: string) {
    setDaten(vorher =>
      vorher
        ? {
            ...vorher,
            reviews: vorher.reviews.map(r =>
              r.id === reviewId ? { ...r, reply, repliedAt: new Date().toISOString() } : r,
            ),
          }
        : vorher,
    )
  }

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
              <AntwortFormular review={r} onGespeichert={reply => antwortUebernehmen(r.id, reply)} />
            </div>
          ))}
        </div>
      )}
    </MeinBereichSubPage>
  )
}
