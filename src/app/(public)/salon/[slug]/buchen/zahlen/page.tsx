'use client'

import { useParams, useRouter } from 'next/navigation'
import { BrandLogo } from '@/components/BrandLogo'

/**
 * Bezahl-Seite — /salon/[slug]/buchen/zahlen
 *
 * Diese Seite war der Ort, an dem die Buchungskette gerissen ist, ohne dass
 * es jemand merkte. Sie hat:
 *
 *  1. Kartennummer, Ablaufdatum, CVC und Karteninhaber abgefragt. Die Felder
 *     gingen nirgendwohin — es gab keine Stripe-Session, keinen Endpunkt,
 *     nichts. Eingegebene Kartendaten lagen im Browserzustand und waren
 *     danach weg.
 *  2. Den zu zahlenden Betrag aus der URL gelesen (`?price=`). Ein Preis aus
 *     dem Query-String ist ein Preis, den der Besucher selbst setzt.
 *  3. Beim Klick auf "Bezahlen" gemeldet: "Buchung wurde trotzdem
 *     gespeichert" — und dann einen Eintrag in `localStorage['cm_bookings']`
 *     geschrieben. Gespeichert war gar nichts: der Salon hat von diesen
 *     Terminen nie erfahren, auf einem zweiten Geraet waren sie unsichtbar,
 *     und beim Leeren des Browserspeichers verschwanden sie.
 *
 * Der Termin entsteht jetzt in Schritt 3 von `/salon/[slug]/buchen` ueber
 * `POST /api/bookings` — echt, in der Datenbank, mit Slot-Pruefung. Bezahlt
 * wird vor Ort. Diese Seite bleibt nur als Wegweiser bestehen, damit alte
 * Links nicht ins Leere laufen; sie nimmt keine Zahlungsdaten mehr entgegen
 * und gibt vor allem nicht mehr vor, etwas zu speichern.
 */
export default function ZahlenPage() {
  const router = useRouter()
  const params = useParams()
  const slug = (params?.slug as string) || ''

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '22px 14px 0',
    }}>
      <div style={{
        width: '100%', maxWidth: 430, background: 'var(--bg)',
        borderRadius: 38, overflow: 'hidden',
        border: '1px solid rgba(196,168,106,0.12)',
        boxShadow: '0 50px 120px rgba(0,0,0,0.78)',
        marginBottom: 24,
        padding: '16px 20px 28px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        <h2 className="cinzel text-gold-metallic" style={{ fontSize: 22, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.2, marginBottom: 10 }}>
          Online-Bezahlung ist noch nicht aktiv
        </h2>

        <p style={{ fontSize: 13, color: 'var(--stone)', lineHeight: 1.65, marginBottom: 14 }}>
          Termine bei ChairMatch werden derzeit <strong style={{ color: 'var(--cream)' }}>vor Ort im Salon</strong> bezahlt.
          Du buchst hier nur den Termin — es wird nichts abgebucht und es werden keine Zahlungsdaten erfasst.
        </p>

        <div style={{ background: 'rgba(176,144,96,0.06)', border: '1px solid rgba(176,144,96,0.18)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--cream)', lineHeight: 1.6, marginBottom: 18 }}>
          Deine bereits gebuchten Termine findest du jederzeit unter <strong style={{ color: 'var(--gold2)' }}>Meine Buchungen</strong>.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => router.push(`/salon/${slug}/buchen` as never)}
            style={{
              padding: 14, borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
              color: '#1a1000', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}
          >Termin buchen →</button>
          <button
            onClick={() => router.push('/termine' as never)}
            style={{
              padding: 14, borderRadius: 14,
              background: 'transparent', color: 'var(--gold2)',
              border: '1px solid rgba(196,168,106,0.3)',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >Meine Buchungen</button>
        </div>
      </div>
    </div>
  )
}
