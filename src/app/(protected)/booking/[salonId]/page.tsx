'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PROVS, type DemoSpec } from '@/lib/demo-data'
import { naechsteTage } from '@/lib/booking-days'

/**
 * Termin-Buchung — /booking/[salonId]
 *
 * Zwei Erfindungen sassen bis Track 9 in dieser Datei, beide direkt am
 * Geldbetrag und beide fuer den Nutzer nicht als Erfindung erkennbar.
 *
 * 1. STILLER ERFOLG FUER DEMO-SALONS.
 *    `PROVS` sind dreissig erfundene Salons, die Startseite, Suche und
 *    Kategorien tragen. Ihre IDs (p1 … p30) und ihre Leistungs-IDs stehen in
 *    keiner Datenbank — eine Buchung darauf kann nicht gelingen. Der Code
 *    schickte sie trotzdem los, mit `salonId: undefined`, und fing die
 *    unvermeidliche Absage ab:
 *
 *        if (!res.ok) { if (demoP) { saveAndRedirectToSuccess(); return } }
 *        catch      { if (demoP) { saveAndRedirectToSuccess(); return } }
 *
 *    Ergebnis: /booking/success zeigte "BESTÄTIGT!" samt Salon, Leistung,
 *    Datum, Uhrzeit und Preis — fuer einen Termin, den es nirgends gab.
 *    Kein Eintrag in `bookings`, keine E-Mail, kein Salon, der davon wusste.
 *    Serverseitig war derselbe Fehler in Track 6 geschlossen worden
 *    (createBooking meldete `success` ohne salonId); der Browser hat ihn
 *    danach weiter selbst erzeugt.
 *
 *    Jetzt: ein Demo-Eintrag sagt vorab, dass er ein Beispiel ist, und
 *    bietet gar kein Formular an. Fehlschlaege echter Buchungen werden
 *    gemeldet, nie verschluckt.
 *
 * 2. RABATT AUS EINER BROWSER-KONSTANTE.
 *    `PROMO_CODES` in src/lib/constants.ts fuehrte CHAIR2026 (15 %),
 *    WELCOME10 (10 %) und BEAUTY5 (5 €). Der Server kennt diese Liste nicht
 *    — er prueft `promo_codes` in der Datenbank und belegt dort ein
 *    Kontingent (siehe claimPromoCode). Die Seite meldete "✓ Code gültig!
 *    Du sparst 15 €" und rechnete eine "Gesamt"-Zeile aus, ohne den Server
 *    je gefragt zu haben. Bei abgelaufenem, aufgebrauchtem oder gar nicht
 *    existierendem Code stand dort ein Preis, den niemand zugesagt hatte.
 *
 *    Jetzt wird der Code unveraendert mitgeschickt und ausschliesslich
 *    serverseitig geprueft. Was auf der Bestaetigung steht, ist der Preis
 *    aus der angelegten Buchung (`priceCents` aus der Antwort).
 *
 * Track 10 nimmt sich die dritte Erfindung vor: DIE FREIEN ZEITEN.
 *
 * 3. EIN SLOT-RASTER AUS DEM QUELLTEXT.
 *    Hier stand eine feste Liste `timeSlots` — 09:00 bis 18:30 in
 *    Halbstundenschritten, zwanzig Knoepfe, alle immer anklickbar. Sie kannte
 *    weder die Oeffnungszeiten des Salons noch seine Bestandsbuchungen noch
 *    die Dauer der gewaehlten Leistung noch die Uhrzeit. Angeboten wurden
 *    damit:
 *      - Termine an Tagen, an denen der Salon geschlossen hat,
 *      - Termine ausserhalb der Oeffnungszeiten,
 *      - Termine, auf denen laengst eine andere Buchung liegt,
 *      - Termine, die heute schon vorbei sind.
 *    `createBooking` weist all das ab (Track 6), der Kunde landete also
 *    zuverlaessig in einer Fehlermeldung — nach drei Schritten und nach
 *    Eingabe seiner Kontaktdaten. Die zweite, gehaertete Buchungsstrecke
 *    (/salon/[slug]/buchen) fragt seit Track 6 `/api/availability`; diese
 *    hier hat es nie getan. Jetzt beide.
 *
 * 4. DAS DATUM WAR UM EINEN TAG VERSCHOBEN — ABENDS.
 *    Der Tagesstreifen entstand aus `new Date()`, beschriftet wurde mit
 *    `d.getDate()`/`d.getMonth()` (Ortszeit des Browsers, in Deutschland
 *    also Berlin), abgeschickt wurde `d.toISOString().split('T')[0]` (UTC).
 *    Zwischen 22:00 und Mitternacht Berliner Sommerzeit sind das zwei
 *    verschiedene Tage: der Kunde tippte auf "Fr 28" und buchte den 27.
 *    Beides kommt jetzt aus `berlinToday()` — derselben Quelle, aus der
 *    auch die Belegungsrechnung ihren "heute"-Begriff nimmt.
 */

interface Service {
  id: string
  name: string
  durationMinutes?: number
  duration_minutes?: number
  priceCents?: number
  price_cents?: number
  risk_level?: string | null
}

interface Staff {
  id: string
  name: string
  title: string | null
}

interface SalonData {
  id: string
  name: string
  category: string
  city: string
  phone?: string
  services: Service[]
  staff: Staff[]
}

/** Antwort von POST /api/bookings fuer eine wirklich angelegte Buchung. */
interface ServerBooking {
  success: true
  bookingId: string
  /** Der Preis, der in der Buchung steht — inklusive eines Rabatts, den der Server anerkannt hat. */
  priceCents: number
  /** Wurde ein Kontingent aus `promo_codes` belegt? */
  promoApplied?: boolean
}

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const salonId = params.salonId as string

  const [step, setStep] = useState(1)
  const [salon, setSalon] = useState<SalonData | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDay, setSelectedDay] = useState(0)
  const [startTime, setStartTime] = useState('')
  const [selectedSpec, setSelectedSpec] = useState<DemoSpec | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentGiven, setConsentGiven] = useState(false)
  const [slots, setSlots] = useState<string[]>([])
  const [laedtSlots, setLaedtSlots] = useState(false)
  const [slotFehler, setSlotFehler] = useState<string | null>(null)
  /**
   * `message` aus `/api/availability` — der Grund, warum der Tag leer ist,
   * wenn er nicht am Andrang liegt (Feiertag, Ruhetag, gesperrter Salon).
   * Ohne ihn stand hier fuer jeden leeren Tag dieselbe Vermutung
   * („geschlossen oder ausgebucht"), auch wenn der Server es genau wusste.
   */
  const [slotHinweis, setSlotHinweis] = useState<string | null>(null)

  /**
   * Beispiel-Eintrag aus `PROVS`? Dann ist hier nichts buchbar — weder der
   * Salon noch seine Leistungen existieren in der Datenbank. Das wird unten
   * gesagt, statt ein Formular anzubieten, das nur scheitern kann.
   */
  const demoP = PROVS.find(p => p.id === salonId)

  useEffect(() => {
    if (demoP) return
    let abgebrochen = false
    fetch(`/api/salons/${salonId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: SalonData) => {
        if (abgebrochen) return
        setSalon(data)
        /*
         * `/listings/[slug]` verlinkt hierher als
         * `/booking/{salonId}?service={id}` — die Leistung, auf deren Seite
         * der Kunde gerade den Preis gelesen hat. Der Parameter wurde bis
         * Track 10 verworfen: die Seite oeffnete mit leerer Auswahl, und der
         * Kunde musste die Leistung erneut suchen.
         *
         * Uebernommen wird nur, was dieser Salon wirklich anbietet — eine
         * Service-ID aus der URL ist eine Behauptung des Aufrufers. Gelesen
         * wird sie hier statt ueber `useSearchParams`, weil dieser Hook in
         * einer Client-Page eine Suspense-Grenze verlangt.
         */
        const gewuenscht = new URLSearchParams(window.location.search).get('service')
        const treffer = (data.services || []).find(s => s.id === gewuenscht)
        if (treffer) setSelectedService(treffer)
      })
      .catch(() => { if (!abgebrochen) setError('Dieser Salon konnte nicht geladen werden.') })
    return () => { abgebrochen = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonId])

  /**
   * Sieben Tage ab heute — Beschriftung und ISO-Wert aus DERSELBEN Quelle.
   * Vorher stammte das eine aus der Ortszeit und das andere aus UTC (siehe
   * Punkt 4 im Kopfkommentar).
   */
  const days = useMemo(() => naechsteTage(7), [])

  const dateIso = days[selectedDay]?.iso ?? ''

  /**
   * Echte freie Zeiten. Quelle ist `/api/availability` — dieselbe Rechnung,
   * die auch `createBooking` anstellt: Oeffnungszeiten des Salons, Dauer der
   * Leistung, Bestandsbuchungen als Intervalle, und heute nichts, was schon
   * vorbei ist.
   */
  const slotsLaden = useCallback(async () => {
    if (!salon?.id || !selectedService?.id || !dateIso) {
      setSlots([])
      return
    }
    setLaedtSlots(true)
    setSlotFehler(null)
    setSlotHinweis(null)
    setStartTime('')
    try {
      const url =
        `/api/availability?salonId=${encodeURIComponent(salon.id)}` +
        `&serviceId=${encodeURIComponent(selectedService.id)}` +
        `&date=${encodeURIComponent(dateIso)}`
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        // Kein Rueckfall auf ein Raster: eine erfundene freie Zeit ist
        // schlimmer als gar keine.
        setSlots([])
        setSlotFehler('Freie Zeiten konnten nicht geladen werden.')
        return
      }
      const data = await res.json()
      setSlots(Array.isArray(data?.slots) ? (data.slots as string[]) : [])
      setSlotHinweis(typeof data?.message === 'string' ? data.message : null)
    } catch {
      setSlots([])
      setSlotFehler('Verbindungsfehler — freie Zeiten konnten nicht geladen werden.')
    } finally {
      setLaedtSlots(false)
    }
  }, [salon?.id, selectedService?.id, dateIso])

  useEffect(() => { void slotsLaden() }, [slotsLaden])

  /**
   * Listenpreis der gewaehlten Leistung — der einzige Betrag, den der Browser
   * kennt. Ob ein Rabattcode greift, entscheidet allein der Server; bis die
   * Buchung steht, wird hier deshalb kein Abzug und keine Endsumme gezeigt.
   */
  const basePrice = selectedService ? ((selectedService.priceCents ?? selectedService.price_cents ?? 0) / 100) : 0

  const needsConsent = selectedService && ['HIGH', 'VERY_HIGH'].includes(String((selectedService as Service).risk_level ?? ''))
  const canSubmit = !needsConsent || consentGiven

  async function handleSubmit() {
    if (!salon?.id) {
      setError('Dieser Salon konnte nicht geladen werden.')
      return
    }
    if (!selectedService || !startTime) {
      setError('Bitte Service und Uhrzeit auswählen.')
      return
    }
    if (needsConsent && !consentGiven) {
      setError('Bitte bestätige die Risikoaufklärung und Kontraindikationen.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salonId: salon.id,
          serviceId: selectedService.id,
          staffId: selectedSpec?.id || undefined,
          date: dateIso,
          startTime,
          notes: notes || undefined,
          promoCode: promoCode.trim() || undefined,
          customerName: name || undefined,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          consentGiven: needsConsent ? true : undefined,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        setError('Bitte melde dich an, um zu buchen.')
        router.push(`/auth?callbackUrl=${encodeURIComponent(`/booking/${salonId}`)}` as never)
        return
      }

      // Kein stiller Erfolg: was der Server ablehnt, wird gemeldet.
      if (!res.ok || !data?.success || typeof data.bookingId !== 'string') {
        setError(data?.error || 'Buchung fehlgeschlagen.')
        // Hat jemand den Slot zwischen Auswahl und Absenden belegt, ist die
        // Liste im Browser veraltet — neu holen und zurueck zur Auswahl,
        // statt den Kunden auf denselben Knopf drueckenzulassen.
        if (String(data?.error ?? '').includes('belegt')) {
          setStep(1)
          await slotsLaden()
        }
        return
      }

      saveAndRedirectToSuccess(data as ServerBooking)
    } catch {
      setError('Verbindungsfehler — die Buchung wurde nicht gespeichert.')
    } finally {
      setLoading(false)
    }
  }

  const BOOKING_SUCCESS_KEY = 'cm_booking_success'

  /**
   * Wird ausschliesslich mit der Antwort einer wirklich angelegten Buchung
   * aufgerufen. Preis und Rabatt kommen aus dieser Antwort, nicht aus dem
   * Browser — die Bestaetigung zeigt damit den Betrag, der in `bookings`
   * steht.
   */
  function saveAndRedirectToSuccess(gebucht: ServerBooking) {
    const listenpreis = basePrice
    const gezahlt = gebucht.priceCents / 100
    const payload = {
      bookingId: gebucht.bookingId,
      salonId: salon?.id ?? salonId,
      salonName: salon?.name ?? '',
      serviceName: selectedService?.name ?? '',
      durationMinutes: selectedService?.durationMinutes ?? selectedService?.duration_minutes ?? 0,
      dateFull: days[selectedDay]?.full ?? '',
      bookingDate: days[selectedDay]?.iso ?? '',
      startTime,
      finalPrice: gezahlt,
      discountAmount: Math.max(0, listenpreis - gezahlt),
      specName: selectedSpec?.nm,
      hasPromo: gebucht.promoApplied === true,
      salonPhone: salon?.phone ?? '',
    }
    try {
      sessionStorage.setItem(BOOKING_SUCCESS_KEY, JSON.stringify(payload))
    } catch {}
    router.replace('/booking/success')
  }

  /*
   * Beispiel-Eintrag: kein Formular. Frueher lief hier der volle Ablauf
   * durch und endete in einer erfundenen Bestaetigung (siehe Kopfkommentar).
   */
  if (demoP) {
    return (
      <div className="shell">
        <div className="screen" style={{ padding: 'var(--pad)' }}>
          <Link href={`/salon/${salonId}`} style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
          <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12, marginBottom: 4 }}>Termin buchen</h1>
          <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 16 }}>{demoP.nm}</p>
          <div className="card" style={{ padding: 16 }}>
            <p style={{ fontSize: 13.5, color: 'var(--cream)', fontWeight: 700, marginBottom: 8 }}>
              Dieser Eintrag ist ein Beispiel
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
              {demoP.nm} zeigt, wie ein Salonprofil bei ChairMatch aussieht. Es ist kein echter Betrieb —
              hier lässt sich kein Termin buchen. Echte Salons in {demoP.city} findest du über die Suche.
            </p>
          </div>
          <Link href={`/search?q=${encodeURIComponent(demoP.city)}`} className="bgold" style={{ display: 'block', textAlign: 'center', marginTop: 16, textDecoration: 'none' }}>
            Salons in {demoP.city} suchen
          </Link>
          <div style={{ height: 40 }} />
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="screen" style={{ padding: 'var(--pad)' }}>
        <Link href={`/salon/${salonId}`} style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', textDecoration: 'none' }}>← Zurück</Link>
        <h1 style={{ fontSize: 'var(--font-xl)', fontWeight: 700, color: 'var(--cream)', marginTop: 12, marginBottom: 4 }}>Termin buchen</h1>
        {salon && <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)', marginBottom: 16 }}>{salon.name}</p>}

        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: '100%', height: 3, borderRadius: 2,
                background: step >= s ? 'var(--gold)' : 'var(--c3)',
              }} />
              <span style={{ fontSize: 10, color: step >= s ? 'var(--gold2)' : 'var(--stone)', fontWeight: step === s ? 700 : 400 }}>
                {s === 1 ? 'Service' : s === 2 ? 'Spezialist' : 'Details'}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(232,80,64,0.1)', border: '1px solid rgba(232,80,64,0.3)', borderRadius: 12, padding: 12, marginBottom: 16, color: 'var(--red)', fontSize: 'var(--font-sm)' }}>
            {error}
          </div>
        )}

        {/* STEP 1: Service + Day + Time */}
        {step === 1 && (
          <div>
            {/* Service Selection */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Service</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {(salon?.services || []).map(s => (
                <button key={s.id} onClick={() => setSelectedService(s)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '13px 15px', background: 'var(--c2)', borderRadius: 13, cursor: 'pointer',
                  border: selectedService?.id === s.id ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                  textAlign: 'left',
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>{s.name}</p>
                    <p style={{ fontSize: 12, color: 'var(--stone)' }}>{s.durationMinutes ?? s.duration_minutes ?? 0} min</p>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold2)' }}>{((s.priceCents ?? s.price_cents ?? 0) / 100).toFixed(0)} €</span>
                </button>
              ))}
            </div>

            {/* Day Selection — 7 day scroll */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Tag</p>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 20, paddingBottom: 4 }}>
              {days.map((d, i) => (
                <button key={i} onClick={() => setSelectedDay(i)} style={{
                  flexShrink: 0, width: 56, padding: '10px 0', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
                  background: selectedDay === i ? 'rgba(176,144,96,.1)' : 'var(--c2)',
                  border: selectedDay === i ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: selectedDay === i ? 'var(--gold2)' : 'var(--stone)' }}>{d.day}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: selectedDay === i ? 'var(--gold2)' : 'var(--cream)' }}>{d.dt}</p>
                  <p style={{ fontSize: 10, color: 'var(--stone)' }}>{d.mo}.</p>
                </button>
              ))}
            </div>

            {/* Time Grid */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Uhrzeit</p>
            {/*
              Was hier steht, kommt aus /api/availability. Ein leerer Tag ist
              eine echte Aussage (geschlossen oder ausgebucht) und wird als
              solche gezeigt — frueher standen hier immer dieselben zwanzig
              Knoepfe.
            */}
            {!selectedService ? (
              <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 20 }}>
                Wähle zuerst einen Service — die freien Zeiten hängen an seiner Dauer.
              </p>
            ) : laedtSlots ? (
              <p style={{ fontSize: 12.5, color: 'var(--stone)', marginBottom: 20 }}>Freie Zeiten werden geladen …</p>
            ) : slotFehler ? (
              <p style={{ fontSize: 12.5, color: 'var(--red)', lineHeight: 1.5, marginBottom: 20 }}>{slotFehler}</p>
            ) : slots.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 20 }}>
                {slotHinweis
                  ? `${slotHinweis} Wähle einen anderen Tag.`
                  : `Am ${days[selectedDay]?.full} ist für diesen Service nichts mehr frei — der Salon hat geschlossen oder der Tag ist ausgebucht. Wähle einen anderen Tag.`}
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 20 }}>
                {slots.map(t => (
                  <button key={t} onClick={() => setStartTime(t)} style={{
                    padding: '10px 0', borderRadius: 10, fontSize: 'var(--font-sm)', fontWeight: 600, cursor: 'pointer',
                    background: startTime === t ? 'var(--gold)' : 'var(--c2)',
                    color: startTime === t ? '#080706' : 'var(--cream)',
                    border: startTime === t ? '1px solid var(--gold)' : '1px solid var(--border)',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            )}

            <button onClick={() => { if (selectedService && startTime) setStep(2); else setError('Bitte Service und Uhrzeit wählen.') }} className="bgold">
              Weiter
            </button>
          </div>
        )}

        {/* STEP 2: Specialist */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Spezialist wählen</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
              {(salon?.staff || []).map(m => (
                <button key={m.id} onClick={() => setSelectedSpec({ id: m.id, nm: m.name, role: m.title || '', rt: 0, cat: '', ini: m.name.split(' ').map(n => n[0]).join('').slice(0, 2), col: 'var(--c3)' })} style={{
                  flexShrink: 0, width: 106, padding: '13px 10px', borderRadius: 16, textAlign: 'center', cursor: 'pointer',
                  background: selectedSpec?.id === m.id ? 'rgba(176,144,96,.08)' : 'var(--c2)',
                  border: selectedSpec?.id === m.id ? '1.5px solid var(--gold)' : '1px solid var(--border)',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--c3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, margin: '0 auto 6px', color: 'var(--cream)' }}>
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <p style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, color: 'var(--cream)' }}>{m.name}</p>
                  {m.title && <p style={{ fontSize: 9, color: 'var(--stone)' }}>{m.title}</p>}
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16, textAlign: 'center' }}>
              {(salon?.staff || []).length === 0
                ? 'Für diesen Salon sind keine Mitarbeitenden hinterlegt — der Termin wird ohne Zuordnung gebucht.'
                : !selectedSpec ? 'Tippe auf einen Spezialisten oder überspringe' : `${selectedSpec.nm} ausgewählt`}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} className="boutline" style={{ flex: 1, cursor: 'pointer' }}>Zurück</button>
              <button onClick={() => setStep(3)} className="bgold" style={{ flex: 1 }}>
                {selectedSpec ? 'Weiter' : 'Überspringen'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Contact + Promo */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 10 }}>Kontaktdaten</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              <input className="inp" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <input className="inp" placeholder="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              <input className="inp" placeholder="Telefon" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              <textarea className="inp" placeholder="Anmerkungen (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'none' }} />
            </div>

            {/* Booking Summary */}
            <div className="card" style={{ padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold2)', marginBottom: 8 }}>Zusammenfassung</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Service</span>
                <span style={{ color: 'var(--cream)' }}>{selectedService?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Datum</span>
                <span style={{ color: 'var(--cream)' }}>{days[selectedDay]?.full}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Uhrzeit</span>
                <span style={{ color: 'var(--cream)' }}>{startTime}</span>
              </div>
              {selectedSpec && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--stone)' }}>Spezialist</span>
                  <span style={{ color: 'var(--cream)' }}>{selectedSpec.nm}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                <span style={{ color: 'var(--stone)' }}>Preis</span>
                <span style={{ fontWeight: 700, color: 'var(--gold2)' }}>{basePrice.toFixed(0)} €</span>
              </div>
            </div>

            {/* Promo-Code — geprueft wird ausschliesslich beim Buchen, serverseitig. */}
            <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Promo-Code (optional)</p>
            <input className="inp" placeholder="Code eingeben" value={promoCode} onChange={e => setPromoCode(e.target.value)} style={{ width: '100%', marginBottom: 8 }} />
            <p style={{ fontSize: 11.5, color: 'var(--stone)', lineHeight: 1.5, marginBottom: 16 }}>
              Der Code wird beim Buchen geprüft. Greift er, steht der ermäßigte Preis auf der Bestätigung —
              vorher steht hier der Listenpreis.
            </p>

            {/* Storno-Policy (AGB § 4a) */}
            <div style={{ marginBottom: 16, padding: 14, background: 'var(--c2)', border: '1px solid var(--border)', borderRadius: 12 }}>
              <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--stone)', textTransform: 'uppercase', marginBottom: 8 }}>Storno</p>
              <p style={{ fontSize: 12, color: 'var(--stone)', lineHeight: 1.6, margin: 0 }}>
                Kostenlos bis 24h vorher · 50 % bei weniger als 24h · 100 % bei No-Show. <Link href="/agb" style={{ color: 'var(--gold2)', textDecoration: 'underline' }}>AGB</Link>
              </p>
            </div>

            {needsConsent && (
              <div style={{ marginBottom: 16, padding: 14, background: 'rgba(232,80,64,0.08)', border: '1px solid rgba(232,80,64,0.2)', borderRadius: 12 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--cream)' }}>
                  <input type="checkbox" checked={consentGiven} onChange={e => setConsentGiven(e.target.checked)} style={{ marginTop: 2 }} />
                  <span>Ich bestätige die Risikoaufklärung, Kontraindikationen und Datenschutz-Hinweise für diese Behandlung.</span>
                </label>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} className="boutline" style={{ flex: 1, cursor: 'pointer' }}>Zurück</button>
              <button type="button" onClick={handleSubmit} className="bgold" style={{ flex: 1 }} disabled={loading || !canSubmit}>
                {loading ? 'Wird gebucht...' : 'Jetzt buchen'}
              </button>
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  )
}
