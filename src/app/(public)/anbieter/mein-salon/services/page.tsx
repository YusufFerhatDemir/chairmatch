'use client'

import { useEffect, useState } from 'react'
import MeinBereichSubPage, { AktuellBox, TippsBox, GoldButton } from '@/components/MeinBereichSubPage'
import { useTranslations } from '@/i18n/client'

/**
 * Meine Leistungen (Anbieter) — /anbieter/mein-salon/services
 *
 * Bis Track 10 zeigte diese Seite eine fest verdrahtete "0" und darunter
 * "Noch keine Services" — auch fuer einen Salon mit acht gepflegten
 * Leistungen. Es gab keinen Abruf: `/api/provider/services` konnte anlegen,
 * aendern und loeschen, hatte aber gar kein GET. Und der Knopf "Service
 * hinzufügen" war ein `<GoldButton>` ohne `onClick` — er sah aus wie eine
 * Aktion und tat nichts.
 *
 * Die einzige Oberflaeche, die Leistungen wirklich pflegen konnte, war
 * `src/components/ProviderDashboardClient.tsx` — eine Komponente, die
 * nirgends mehr importiert wurde (die Route /provider/dashboard rendert
 * `components/provider/DashboardClient.tsx`). Anbieter hatten damit keinen
 * Weg, ihre Leistungen zu pflegen; genau die Leistungen, aus denen die
 * Buchungsstrecke Preis und Dauer nimmt. Die tote Komponente ist inzwischen
 * geloescht — diese Seite hier hat ihre Aufgabe uebernommen.
 *
 * Jetzt: echter Bestand aus `GET /api/provider/services`, Anlegen und
 * Loeschen ueber dieselben (bereits besitzgepruef­ten) Endpunkte, und ein
 * sichtbarer Fehler statt einer stillen Null, wenn der Abruf scheitert.
 */

interface ProviderService {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number
  is_active: boolean
  sort_order: number
}

interface ServicesResponse {
  services: ProviderService[]
  activeCount: number
}

function preisLabel(cents: number): string {
  return `${(cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

/** "12,50" und "12.50" sind beide gemeint; alles andere ist kein Preis. */
function euroZuCent(eingabe: string): number | null {
  const bereinigt = eingabe.trim().replace(',', '.')
  if (bereinigt === '') return 0
  if (!/^\d+(\.\d{1,2})?$/.test(bereinigt)) return null
  return Math.round(parseFloat(bereinigt) * 100)
}

const INPUT_STYLE: React.CSSProperties = {
  width: '100%', padding: '11px 13px',
  background: 'var(--c1)', color: 'var(--cream)',
  border: '0.5px solid rgba(196,168,106,0.25)', borderRadius: 12,
  fontSize: 14, fontFamily: 'inherit',
}

export default function Page() {
  const t = useTranslations()
  const [services, setServices] = useState<ProviderService[] | null>(null)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)

  const [formOffen, setFormOffen] = useState(false)
  const [name, setName] = useState('')
  const [preis, setPreis] = useState('')
  const [dauer, setDauer] = useState('30')
  const [speichert, setSpeichert] = useState(false)
  const [formFehler, setFormFehler] = useState<string | null>(null)

  async function laden() {
    setLaedt(true)
    try {
      const res = await fetch('/api/provider/services', { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Leistungen konnten nicht geladen werden.')
      setServices((body as ServicesResponse).services ?? [])
      setLadeFehler(null)
    } catch (err) {
      // Kein Fallback auf eine Null: "keine Leistungen" und "Abruf
      // fehlgeschlagen" sind fuer den Betreiber zwei verschiedene Saetze.
      setServices(null)
      setLadeFehler(err instanceof Error ? err.message : 'Leistungen konnten nicht geladen werden.')
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => { void laden() }, [])

  async function anlegen() {
    setFormFehler(null)
    const cents = euroZuCent(preis)
    if (name.trim().length < 2) { setFormFehler('Bitte einen Namen mit mindestens 2 Zeichen eingeben.'); return }
    if (cents === null) { setFormFehler('Preis bitte als Zahl eingeben, z. B. 39,00.'); return }
    const minuten = parseInt(dauer, 10)
    if (!Number.isFinite(minuten) || minuten < 5) { setFormFehler('Dauer bitte in Minuten angeben (mindestens 5).'); return }

    setSpeichert(true)
    try {
      const res = await fetch('/api/provider/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), price_cents: cents, duration_minutes: minuten }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Leistung konnte nicht angelegt werden.')
      setServices(prev => [...(prev ?? []), body as ProviderService])
      setName(''); setPreis(''); setDauer('30'); setFormOffen(false)
    } catch (err) {
      setFormFehler(err instanceof Error ? err.message : 'Leistung konnte nicht angelegt werden.')
    } finally {
      setSpeichert(false)
    }
  }

  async function loeschen(id: string) {
    setFormFehler(null)
    try {
      const res = await fetch('/api/provider/services', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Leistung konnte nicht gelöscht werden.')
      setServices(prev => (prev ?? []).filter(s => s.id !== id))
    } catch (err) {
      setFormFehler(err instanceof Error ? err.message : 'Leistung konnte nicht gelöscht werden.')
    }
  }

  const aktive = (services ?? []).filter(s => s.is_active).length

  return (
    <MeinBereichSubPage
      parentHref="/anbieter/mein-salon"
      parentLabel={t('meinSalon.title')}
      title={t('subServices.title')}
      subtitle={t('subServices.subtitle')}
      showSave={false}
      role="anbieter"
    >
      <AktuellBox label={t('subServices.activeLbl')}>
        {laedt ? (
          <p style={{ fontSize: 13, color: 'var(--stone)' }}>Wird geladen …</p>
        ) : ladeFehler ? (
          <p style={{ fontSize: 13, color: '#FF9090', textAlign: 'center', lineHeight: 1.5 }}>{ladeFehler}</p>
        ) : (
          <>
            <p style={{ fontSize: 32, fontFamily: 'Cinzel', fontWeight: 600 }} className="text-gold-metallic">{aktive}</p>
            <p style={{ fontSize: 11, color: 'var(--stone)' }}>
              {aktive === 0 ? t('subServices.noneYet') : aktive === 1 ? 'aktive Leistung' : 'aktive Leistungen'}
            </p>
          </>
        )}
      </AktuellBox>

      {services && services.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {services.map(s => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
              background: 'var(--c1)', border: '0.5px solid rgba(196,168,106,0.15)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--cream)' }}>
                  {s.name}
                  {!s.is_active && <span style={{ fontSize: 10, color: 'var(--stone)', marginLeft: 8 }}>(inaktiv)</span>}
                </p>
                <p style={{ fontSize: 11.5, color: 'var(--stone)' }}>{s.duration_minutes} min · {preisLabel(s.price_cents)}</p>
              </div>
              <button
                type="button"
                onClick={() => void loeschen(s.id)}
                aria-label={`${s.name} löschen`}
                style={{
                  flexShrink: 0, background: 'transparent', border: '1px solid rgba(232,80,64,0.35)',
                  color: '#FF9090', borderRadius: 10, padding: '6px 12px',
                  fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                }}
              >Löschen</button>
            </div>
          ))}
        </div>
      )}

      {formFehler && (
        <p style={{ fontSize: 12.5, color: '#FF9090', lineHeight: 1.5 }}>{formFehler}</p>
      )}

      {formOffen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input style={INPUT_STYLE} placeholder="Name der Leistung" value={name} onChange={e => setName(e.target.value)} />
          <div style={{ display: 'flex', gap: 10 }}>
            <input style={INPUT_STYLE} inputMode="decimal" placeholder="Preis in € (z. B. 39,00)" value={preis} onChange={e => setPreis(e.target.value)} />
            <input style={INPUT_STYLE} inputMode="numeric" placeholder="Dauer in Minuten" value={dauer} onChange={e => setDauer(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => { setFormOffen(false); setFormFehler(null) }}
              style={{
                flex: 1, padding: 13, borderRadius: 14, background: 'transparent',
                border: '1px solid rgba(196,168,106,0.3)', color: 'var(--gold2)',
                fontFamily: 'inherit', fontSize: 14, cursor: 'pointer',
              }}
            >Abbrechen</button>
            <div style={{ flex: 1 }}>
              <GoldButton onClick={() => { if (!speichert) void anlegen() }}>
                {speichert ? 'Wird gespeichert …' : 'Speichern'}
              </GoldButton>
            </div>
          </div>
        </div>
      ) : (
        <GoldButton onClick={() => setFormOffen(true)}>{t('subServices.addBtn')}</GoldButton>
      )}

      <TippsBox title={t('subServices.tippsTitle')} tipps={[
        t('subServices.tip1'), t('subServices.tip2'), t('subServices.tip3'), t('subServices.tip4'),
      ]} />
    </MeinBereichSubPage>
  )
}
