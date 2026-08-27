'use client'

import { useEffect, useState } from 'react'
import { apiGet, ApiError } from '@/lib/client-api'

/**
 * Die drei Zahlen oben auf den Rollen-Dashboards.
 *
 * Bis 2026-08-27 standen sie fest im Quelltext — "Umsatz Monat 480 EUR",
 * "Bewertung 4,9", "Anfragen offen 5" — bei JEDEM Nutzer dieselben. Dazu
 * Badges an den Kacheln darunter, die wie offene Vorgaenge aussahen und keine
 * waren. Ein Vermieter mit "5 offene Anfragen" fand hinter der Kachel null,
 * seit dort in Track 7 die echte Liste haengt.
 *
 * Diese Komponente holt die Zahlen aus /api/me/dashboard-stats und zeigt
 * ausschliesslich, was von dort kommt. Vier ehrliche Zustaende statt einem
 * erfundenen:
 *
 *   laedt         — nichts behaupten, solange nichts da ist
 *   nicht         — 401: die Zahlen haengen an der Anmeldung
 *   angemeldet
 *   fehler        — sichtbar, nicht als "du hast halt nichts" getarnt
 *   kein Salon    — es gibt schlicht noch nichts zu zaehlen
 *
 * Eine Kachel, deren Wert `null` ist, wird WEGGELASSEN. Es gibt bewusst
 * keinen Platzhalter und keinen Schaetzwert.
 */

export type DashboardRolle = 'anbieter' | 'vermieter' | 'mieter'

interface AnbieterStats {
  role: 'anbieter'
  hasSalon: boolean
  termineHeute?: number
  bewertung?: number | null
  bewertungAnzahl?: number
  umsatzMonatCents?: number
  aktiveServices?: number
}
interface VermieterStats {
  role: 'vermieter'
  hasSalon: boolean
  anfragenOffen?: number
  buchungenMonat?: number
  umsatzMonatCents?: number
}
interface MieterStats {
  role: 'mieter'
  anfragenOffen: number
  anfragenBestaetigt: number
  durchschnittTagCents: number | null
}
export type DashboardStatsDaten = AnbieterStats | VermieterStats | MieterStats

interface Zustand {
  daten: DashboardStatsDaten | null
  fehler: string | null
  nichtAngemeldet: boolean
  laedt: boolean
}

/** Auch von den Seiten selbst benutzt — fuer die Badges an den Kacheln. */
export function useDashboardStats(rolle: DashboardRolle): Zustand {
  const [zustand, setZustand] = useState<Zustand>({
    daten: null,
    fehler: null,
    nichtAngemeldet: false,
    laedt: true,
  })

  useEffect(() => {
    let abgebrochen = false
    apiGet<DashboardStatsDaten>(`/api/me/dashboard-stats?role=${rolle}`)
      .then((daten) => {
        if (!abgebrochen) setZustand({ daten, fehler: null, nichtAngemeldet: false, laedt: false })
      })
      .catch((e: unknown) => {
        if (abgebrochen) return
        const istApi = e instanceof ApiError
        setZustand({
          daten: null,
          nichtAngemeldet: istApi && e.status === 401,
          fehler: istApi && e.status === 401 ? null : (e as Error)?.message ?? 'Zahlen konnten nicht geladen werden.',
          laedt: false,
        })
      })
    return () => {
      abgebrochen = true
    }
  }, [rolle])

  return zustand
}

function euro(cents: number): string {
  return `€${(cents / 100).toLocaleString('de-DE', { maximumFractionDigits: 0 })}`
}

interface Kachel {
  wert: string
  label: string
}

function kacheln(daten: DashboardStatsDaten, labels: [string, string, string]): Kachel[] {
  const raus: Kachel[] = []
  if (daten.role === 'mieter') {
    raus.push({ wert: String(daten.anfragenOffen), label: labels[0] })
    raus.push({ wert: String(daten.anfragenBestaetigt), label: labels[1] })
    if (daten.durchschnittTagCents !== null) {
      raus.push({ wert: euro(daten.durchschnittTagCents), label: labels[2] })
    }
    return raus
  }
  if (daten.role === 'anbieter') {
    raus.push({ wert: String(daten.termineHeute ?? 0), label: labels[0] })
    // Ohne Bewertung gibt es keine Bewertung — keine 0,0 und kein "—".
    if (daten.bewertung !== null && daten.bewertung !== undefined) {
      raus.push({ wert: `${daten.bewertung.toFixed(1).replace('.', ',')}★`, label: labels[1] })
    }
    raus.push({ wert: euro(daten.umsatzMonatCents ?? 0), label: labels[2] })
    return raus
  }
  raus.push({ wert: String(daten.anfragenOffen ?? 0), label: labels[0] })
  raus.push({ wert: String(daten.buchungenMonat ?? 0), label: labels[1] })
  raus.push({ wert: euro(daten.umsatzMonatCents ?? 0), label: labels[2] })
  return raus
}

const HINWEIS: React.CSSProperties = {
  margin: '0 20px 18px',
  background: 'var(--c1)',
  border: '0.5px solid rgba(196,168,106,0.12)',
  borderRadius: 14,
  padding: '12px 14px',
  fontSize: 12,
  lineHeight: 1.45,
  color: 'var(--stone)',
}

export default function DashboardStats({
  rolle,
  labels,
  zustand,
}: {
  rolle: DashboardRolle
  labels: [string, string, string]
  /** Wenn die Seite den Hook schon selbst haelt (fuer Badges), hier durchreichen. */
  zustand?: Zustand
}) {
  const eigener = useDashboardStats(rolle)
  const { daten, fehler, nichtAngemeldet, laedt } = zustand ?? eigener

  if (laedt) {
    return (
      <div style={{ margin: '0 20px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} aria-hidden style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.12)', borderRadius: 14, padding: '12px 6px', height: 62, opacity: 0.45 }} />
        ))}
      </div>
    )
  }

  if (nichtAngemeldet) {
    return <p style={HINWEIS}>Deine Zahlen erscheinen hier, sobald du angemeldet bist.</p>
  }

  if (fehler) {
    return (
      <p role="alert" style={{ ...HINWEIS, color: '#FF8888' }}>
        {fehler} — das heißt nicht, dass es keine Vorgänge gibt.
      </p>
    )
  }

  if (!daten) return null

  if (daten.role !== 'mieter' && !daten.hasSalon) {
    return <p style={HINWEIS}>Noch kein Salon angelegt — sobald einer existiert, stehen hier deine echten Zahlen.</p>
  }

  const liste = kacheln(daten, labels)

  return (
    <div style={{ margin: '0 20px 18px', display: 'grid', gridTemplateColumns: `repeat(${liste.length}, 1fr)`, gap: 8 }}>
      {liste.map((k, i) => (
        <div key={i} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.12)', borderRadius: 14, padding: '12px 6px', textAlign: 'center' }}>
          <div className="cinzel text-gold-metallic" style={{ fontSize: 19, fontWeight: 600 }}>{k.wert}</div>
          <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'var(--stone)', marginTop: 3, textTransform: 'uppercase' }}>{k.label}</div>
        </div>
      ))}
    </div>
  )
}
