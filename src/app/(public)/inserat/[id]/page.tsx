'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'
import { apiGet } from '@/lib/client-api'

/**
 * Inserat-Detailseite — /inserat/[id]
 *
 * Diese Seite hat bis 2026-08-27 fuer JEDE ID dasselbe erfundene Inserat
 * gezeigt: "Salon Anna · Stuhl, Köln-Innenstadt, 1,2 km, VERIFIZIERT", die
 * Preisleiste 15/90/450/1500 €, sieben Ausstattungsmerkmale und Oeffnungs-
 * zeiten "Mo–Fr 9:00–18:00". Nichts davon kam aus der Datenbank; die `id`
 * aus der URL wurde ausschliesslich fuer die Merkliste und den Weiterleitungs-
 * Link benutzt. Wer ein echtes Inserat anklickte, las die Konditionen eines
 * anderen — und klickte dann auf "Jetzt anfragen ab 15 €/h", waehrend das
 * Anfrageformular dahinter die ECHTEN Preise laedt und der Server die echte
 * Kostenschaetzung rechnet. Die beiden Seiten widersprachen einander.
 *
 * Jetzt kommt alles aus GET /api/rental-equipment/[id] — derselben Quelle,
 * aus der auch das Anfrageformular liest.
 */

interface Equipment {
  id: string
  name: string
  type: string
  description: string | null
  features: string[] | null
  images: unknown[] | null
  price_per_day_cents: number
  price_per_hour_cents: number | null
  price_per_week_cents: number | null
  price_per_month_cents: number | null
  available_days: string[] | null
  available_from: string | null
  available_to: string | null
  is_available: boolean
  salons?: { id?: string; name?: string; city?: string | null; slug?: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  stuhl: 'Stuhlvermietung',
  liege: 'Liegenvermietung',
  raum: 'Raumvermietung',
  opraum: 'OP-Raum',
}

const DAY_LABELS: Record<string, string> = {
  mon: 'Mo', tue: 'Di', wed: 'Mi', thu: 'Do', fri: 'Fr', sat: 'Sa', sun: 'So',
}

function euro(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '–'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function InseratDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = (params?.id as string) || ''

  const [equipment, setEquipment] = useState<Equipment | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [isFav, setIsFav] = useState(false)

  const laden = useCallback(async () => {
    setLaedt(true)
    try {
      const res = await apiGet<{ equipment: Equipment }>(`/api/rental-equipment/${id}`)
      setEquipment(res.equipment)
      setFehler(null)
    } catch (err) {
      setEquipment(null)
      setFehler(err instanceof Error ? err.message : 'Inserat konnte nicht geladen werden')
    } finally {
      setLaedt(false)
    }
  }, [id])

  useEffect(() => { if (id) void laden() }, [id, laden])

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      setIsFav(Array.isArray(favs) && favs.includes(id))
    } catch {}
  }, [id])

  function toggleFav() {
    try {
      const favs = JSON.parse(localStorage.getItem('cm_inserate_favs') || '[]')
      const list: string[] = Array.isArray(favs) ? favs : []
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
      localStorage.setItem('cm_inserate_favs', JSON.stringify(next))
      setIsFav(next.includes(id))
    } catch {}
  }

  // Nur die Preise, die der Vermieter wirklich gepflegt hat. Die alte Seite
  // zeigte vier feste Betraege — auch fuer Zeitraeume, die gar nicht
  // angeboten werden.
  const preise = equipment
    ? ([
        ['Stunde', equipment.price_per_hour_cents],
        ['Tag', equipment.price_per_day_cents],
        ['Woche', equipment.price_per_week_cents],
        ['Monat', equipment.price_per_month_cents],
      ] as Array<[string, number | null]>).filter(([, v]) => typeof v === 'number' && v > 0)
    : []

  const merkmale = equipment?.features?.filter((f) => typeof f === 'string' && f.length > 0) ?? []
  const bild = (equipment?.images ?? []).find((i): i is string => typeof i === 'string' && i.length > 0)
  const salonName = equipment?.salons?.name ?? null
  const salonStadt = equipment?.salons?.city ?? null
  const tage = equipment?.available_days?.map((d) => DAY_LABELS[d] ?? d) ?? []

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="ins-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#BF953F"/><stop offset="50%" stopColor="#FCF6BA"/><stop offset="100%" stopColor="#AA771C"/>
          </linearGradient>
        </defs>
      </svg>

      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
      }}>
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            aria-label="Zurück"
            onClick={() => router.back()}
            style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(196,168,106,0.08)', border: '1px solid rgba(196,168,106,0.22)', color: 'var(--gold2)', fontSize: 18, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>
            {equipment ? (TYPE_LABELS[equipment.type] ?? 'Vermietung') : 'Vermietung'}
          </span>
        </div>

        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>CHAIRMATCH</h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {laedt && (
          <p style={{ padding: '30px 20px', textAlign: 'center', fontSize: 12.5, color: 'var(--stone)' }}>
            Inserat wird geladen …
          </p>
        )}

        {!laedt && fehler && (
          <div role="alert" style={{ margin: '0 16px 24px', padding: '24px 16px', textAlign: 'center', background: 'rgba(232,80,64,0.06)', border: '1px solid rgba(232,80,64,0.25)', borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: '#FF8888', lineHeight: 1.6 }}>{fehler}</p>
          </div>
        )}

        {!laedt && !fehler && equipment && (
          <>
            {/* HERO */}
            <div style={{
              margin: '0 16px', aspectRatio: '16/10',
              borderRadius: 18, overflow: 'hidden',
              background: bild
                ? `center/cover no-repeat url(${JSON.stringify(bild)})`
                : 'linear-gradient(135deg,#3A3025,#1F1A0F)',
              position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '0.5px solid rgba(196,168,106,0.18)',
            }}>
              {!bild && (
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="url(#ins-gold)" strokeWidth="1" style={{ opacity: 0.4 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="9" cy="9" r="2"/>
                  <path d="M21 15l-5-5L5 21"/>
                </svg>
              )}
              <button onClick={toggleFav}
                aria-label={isFav ? 'Aus Merkliste entfernen' : 'Auf Merkliste setzen'}
                style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: '50%', background: 'rgba(11,11,15,0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(196,168,106,0.3)', color: isFav ? '#E85040' : 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}
              >{isFav ? '♥' : '♡'}</button>
            </div>

            {/* Kopfkarte */}
            <div style={{
              margin: '14px 16px 0',
              background: 'linear-gradient(145deg, rgba(191,149,63,0.06), var(--c2) 50%, rgba(179,135,40,0.04))',
              border: '1px solid rgba(191,149,63,0.22)',
              borderRadius: 16, padding: 14,
              display: 'flex', gap: 12, alignItems: 'center',
            }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', border: '2px solid var(--gold2)', background: 'linear-gradient(135deg,#2A2418,#161210)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="cinzel text-gold-metallic" style={{ fontSize: 18, fontWeight: 600 }}>
                  {initials(salonName ?? equipment.name)}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700 }}>{equipment.name}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {[salonName, salonStadt].filter(Boolean).join(' · ') || 'Salon nicht hinterlegt'}
                </p>
                {!equipment.is_available && (
                  <span style={{ display: 'inline-block', fontSize: 9, padding: '2px 7px', borderRadius: 6, fontWeight: 700, letterSpacing: 1, background: 'rgba(232,80,64,0.15)', color: '#FF8888', marginTop: 5 }}>
                    DERZEIT NICHT VERFÜGBAR
                  </span>
                )}
              </div>
            </div>

            {/* Preise — nur die gepflegten */}
            {preise.length > 0 && (
              <div style={{ padding: '14px 16px 0', display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, preise.length)}, 1fr)`, gap: 6 }}>
                {preise.map(([label, cents]) => (
                  <div key={label} style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 10, padding: '10px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 8, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                    <div className="cinzel text-gold-metallic" style={{ fontSize: 13, fontWeight: 600, marginTop: 3 }}>{euro(cents as number)}</div>
                  </div>
                ))}
              </div>
            )}

            {equipment.description && (
              <div style={{ padding: '18px 16px 0' }}>
                <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Beschreibung</h3>
                <p style={{ fontSize: 13, color: 'var(--cream)', lineHeight: 1.6 }}>{equipment.description}</p>
              </div>
            )}

            {merkmale.length > 0 && (
              <div style={{ padding: '18px 16px 0' }}>
                <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Ausstattung inklusive</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {merkmale.map(e => (
                    <span key={e} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 8, background: 'rgba(176,144,96,0.1)', color: 'var(--gold2)', fontWeight: 600, border: '1px solid rgba(176,144,96,0.15)' }}>{e}</span>
                  ))}
                </div>
              </div>
            )}

            {(tage.length > 0 || equipment.available_from || equipment.available_to) && (
              <div style={{ padding: '18px 16px 0' }}>
                <h3 className="cinzel text-gold-metallic" style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Verfügbarkeit</h3>
                <div style={{ background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, lineHeight: 1.8, color: 'var(--cream)' }}>
                  {tage.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span>Tage</span>
                      <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>{tage.join(', ')}</span>
                    </div>
                  )}
                  {(equipment.available_from || equipment.available_to) && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <span>Uhrzeit</span>
                      <span style={{ color: 'var(--gold2)', fontWeight: 700 }}>
                        {equipment.available_from?.slice(0, 5) ?? '—'} – {equipment.available_to?.slice(0, 5) ?? '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ padding: '20px 16px 24px' }}>
              <button
                onClick={() => router.push(`/inserat/${id}/anfragen` as never)}
                disabled={!equipment.is_available}
                style={{
                  width: '100%', padding: 16, borderRadius: 14,
                  background: equipment.is_available
                    ? 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)'
                    : 'rgba(176,144,96,0.15)',
                  color: equipment.is_available ? '#1a1000' : 'var(--stone)',
                  border: 'none', fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
                  cursor: equipment.is_available ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  boxShadow: equipment.is_available ? '0 0 22px rgba(196,168,106,0.3)' : 'none',
                }}
              >
                <span>{equipment.is_available ? 'Jetzt anfragen' : 'Derzeit nicht verfügbar'}</span>
                {equipment.is_available && (
                  <span className="cinzel" style={{ fontWeight: 700 }}>
                    ab {euro(equipment.price_per_hour_cents ?? equipment.price_per_day_cents)}
                    {equipment.price_per_hour_cents ? '/h' : '/Tag'} →
                  </span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
