import type { Metadata } from 'next'
import Link from 'next/link'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'ChairMatch — Deutschlands Beauty-Booking-Plattform',
  description: '0% Provision. Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios. Stuhlvermietung, OP-Raum mieten, Compliance-Paket.',
}

const FEATURES = [
  { icon: '💈', title: '0% Provision', desc: 'Salons behalten ihren gesamten Umsatz. Keine versteckten Gebühren.' },
  { icon: '💺', title: 'Stuhlvermietung', desc: 'Erster digitaler Marktplatz für Stuhl-, Kabinen- und OP-Raum-Vermietung.' },
  { icon: '📋', title: 'Compliance-Paket', desc: 'Gesundheitsamt-Dokumente digital verwalten. Behördenpaket auf Knopfdruck.' },
  { icon: '📱', title: 'PWA App', desc: 'Installierbar wie eine native App. Offline-fähig mit Push Notifications.' },
  { icon: '🔒', title: 'DSGVO-konform', desc: '2FA, Verschlüsselung, Datenexport, Recht auf Löschung — alles dabei.' },
  { icon: '⭐', title: 'Bewertungen', desc: 'Echte Bewertungen, Melden-Funktion, DSA-konform.' },
]

const STATS = [
  { value: '11', label: 'Kategorien' },
  { value: '15+', label: 'Salons' },
  { value: '7', label: 'Städte' },
  { value: '0%', label: 'Provision' },
]

const HOW_IT_WORKS = {
  customers: [
    { step: '1', title: 'Salon finden', desc: 'Suche nach Kategorie, Standort oder Bewertung' },
    { step: '2', title: 'Termin buchen', desc: 'Wähle Service, Spezialist und Wunschzeit' },
    { step: '3', title: 'Genießen', desc: 'Bezahle sicher online oder vor Ort' },
  ],
  providers: [
    { step: '1', title: 'Registrieren', desc: 'Kostenloses Profil in 5 Minuten erstellen' },
    { step: '2', title: 'Profil einrichten', desc: 'Services, Fotos und Öffnungszeiten hinzufügen' },
    { step: '3', title: 'Kunden empfangen', desc: 'Buchungen verwalten, Umsatz steigern' },
  ],
}

const FAQ = [
  { q: 'Ist ChairMatch wirklich kostenlos für Salons?', a: 'Ja. Der Basis-Eintrag ist dauerhaft kostenlos mit 0% Provision auf Buchungen. Premium-Features sind optional.' },
  { q: 'Wie funktioniert die Stuhlvermietung?', a: 'Salons können freie Stühle, Kabinen und OP-Räume digital zur Vermietung anbieten. Freelancer und Fachkräfte buchen direkt über die Plattform.' },
  { q: 'Ist die App DSGVO-konform?', a: 'Ja. ChairMatch erfüllt alle DSGVO-Anforderungen: 2FA, Datenverschlüsselung, Recht auf Löschung, Datenexport und transparente Cookie-Einwilligungen.' },
  { q: 'Muss ich eine App herunterladen?', a: 'Nein. ChairMatch ist eine PWA (Progressive Web App), die direkt im Browser funktioniert und wie eine native App installiert werden kann.' },
  { q: 'Welche Zahlungsmethoden werden akzeptiert?', a: 'Wir unterstützen Kartenzahlung, Apple Pay, Google Pay und SEPA-Lastschrift über unseren Partner Stripe.' },
]

export default function LandingPage() {
  return (
    <div className="shell">
      <div className="screen" style={{ padding: '0' }}>

        {/* Hero */}
        <section style={{ padding: '60px var(--pad) 40px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(176,144,96,0.08) 0%, transparent 100%)' }}>
          <h1 className="cinzel" style={{ fontSize: 32, color: 'var(--gold2)', letterSpacing: 3, lineHeight: 1.2 }}>
            CHAIR<span style={{ color: 'var(--gold3)' }}>MATCH</span>
          </h1>
          <p style={{ fontSize: 11, letterSpacing: 4, color: 'var(--stone)', marginTop: 4, textTransform: 'uppercase' }}>
            Deutschland
          </p>
          <h2 style={{ fontSize: 20, color: 'var(--cream)', marginTop: 24, lineHeight: 1.4, fontWeight: 400 }}>
            Die Beauty-Booking-Plattform<br />
            <strong style={{ color: 'var(--gold)' }}>ohne Provision</strong>
          </h2>
          <p style={{ fontSize: 14, color: 'var(--stone)', marginTop: 12, lineHeight: 1.6, maxWidth: 340, margin: '12px auto 0' }}>
            Buche Termine bei Top-Salons, Barbershops & Kosmetikstudios in ganz Deutschland.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <Link href="/" className="bgold" style={{ padding: '14px 24px', textDecoration: 'none', fontSize: 14 }}>
              App öffnen
            </Link>
            <Link href="/register/anbieter" className="boutline" style={{ padding: '14px 24px', textDecoration: 'none', fontSize: 14 }}>
              Salon eintragen
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section style={{ padding: '0 var(--pad) 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {STATS.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', padding: '16px 0' }}>
                <div className="cinzel" style={{ fontSize: 24, fontWeight: 700, color: 'var(--gold)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--stone)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: '32px var(--pad)', background: 'linear-gradient(180deg, rgba(176,144,96,0.04) 0%, transparent 100%)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 24, letterSpacing: 1 }}>
            So funktioniert&apos;s
          </h3>

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 10, letterSpacing: 1 }}>FÜR KUNDEN</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {HOW_IT_WORKS.customers.map(s => (
              <div key={s.step} style={{ flex: 1, padding: '14px 10px', background: 'var(--c1)', borderRadius: 12, border: '1px solid rgba(176,144,96,0.08)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--gold2)', marginBottom: 8 }}>{s.step}</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>{s.title}</p>
                <p style={{ fontSize: 10, color: 'var(--stone)', lineHeight: 1.4 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 10, letterSpacing: 1 }}>FÜR SALONBESITZER</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {HOW_IT_WORKS.providers.map(s => (
              <div key={s.step} style={{ flex: 1, padding: '14px 10px', background: 'var(--c1)', borderRadius: 12, border: '1px solid rgba(176,144,96,0.08)' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'var(--gold2)', marginBottom: 8 }}>{s.step}</div>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>{s.title}</p>
                <p style={{ fontSize: 10, color: 'var(--stone)', lineHeight: 1.4 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: '32px var(--pad)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 20 }}>
            Warum ChairMatch?
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--cream)', marginBottom: 4 }}>{f.title}</h4>
                <p style={{ fontSize: 11, color: 'var(--stone)', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For salon owners */}
        <section style={{ padding: '32px var(--pad)', background: 'linear-gradient(135deg, rgba(176,144,96,0.06), transparent)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 8 }}>
            Für Salons & Anbieter
          </h3>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.5 }}>
            Registriere deinen Salon kostenlos und erreiche Tausende neue Kunden.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Kostenloser Basis-Eintrag für jeden Salon',
              'Online-Terminbuchung mit Kalender-Sync',
              'Stuhlvermietung & Raumvermietung anbieten',
              'Compliance-Dokumente digital verwalten',
              'Dashboard mit Statistiken & Bewertungen',
              'Produkte im Marketplace verkaufen',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: 'var(--gold)', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--cream)' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/register/anbieter" className="bgold" style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none', fontSize: 14 }}>
              Jetzt kostenlos eintragen
            </Link>
          </div>
        </section>

        {/* For barbers / stylists */}
        <section style={{ padding: '32px var(--pad)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 8 }}>
            Für Friseure & Stylisten
          </h3>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.5 }}>
            Freelancer? Finde den perfekten Stuhl oder Raum für dein Business.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Stühle, Kabinen und OP-Räume tageweise mieten',
              'Transparente Preise ohne Überraschungen',
              'Eigene Kunden behalten, 0% Abgabe',
              'Flexible Mietmodelle (Tag, Woche, Monat)',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ color: 'var(--gold)', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--cream)' }}>{item}</span>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link href="/rentals" className="boutline" style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none', fontSize: 14 }}>
              Stühle entdecken
            </Link>
          </div>
        </section>

        {/* Trust & Safety */}
        <section style={{ padding: '32px var(--pad)', background: 'linear-gradient(180deg, rgba(176,144,96,0.04) 0%, transparent 100%)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 20 }}>
            Sicherheit & Vertrauen
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {[
              { icon: '🔐', label: 'Zwei-Faktor-Authentifizierung' },
              { icon: '🇩🇪', label: 'Hosting in Deutschland' },
              { icon: '📜', label: 'DSGVO-konform' },
              { icon: '💳', label: 'Stripe sichere Zahlungen' },
              { icon: '🛡', label: 'SSL-Verschlüsselung' },
              { icon: '📤', label: 'Datenexport & Löschung' },
            ].map((item, i) => (
              <div key={i} style={{
                padding: '12px', background: 'var(--c1)', borderRadius: 10,
                border: '1px solid rgba(176,144,96,0.06)', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 20 }}>{item.icon}</span>
                <span style={{ fontSize: 11, color: 'var(--cream)', fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ padding: '32px var(--pad)' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', textAlign: 'center', marginBottom: 20 }}>
            Häufige Fragen
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ.map((item, i) => (
              <details key={i} style={{
                background: 'var(--c1)', borderRadius: 12,
                border: '1px solid rgba(176,144,96,0.06)', overflow: 'hidden',
              }}>
                <summary style={{
                  padding: '14px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  color: 'var(--cream)', listStyle: 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  {item.q}
                  <span style={{ color: 'var(--gold2)', fontSize: 16, fontWeight: 300, marginLeft: 8 }}>+</span>
                </summary>
                <div style={{ padding: '0 16px 14px', fontSize: 12, color: 'var(--stone)', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Investor CTA */}
        <section style={{ padding: '40px var(--pad)', textAlign: 'center' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', marginBottom: 8 }}>
            Für Investoren
          </h3>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.5 }}>
            €15 Mrd. Beauty-Markt in Deutschland.<br />Seien Sie von Anfang an dabei.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link href="/pitch" className="boutline" style={{ display: 'inline-block', padding: '14px 24px', textDecoration: 'none', fontSize: 14 }}>
              Pitch Deck
            </Link>
            <Link href="/statistik" className="boutline" style={{ display: 'inline-block', padding: '14px 24px', textDecoration: 'none', fontSize: 14 }}>
              Statistiken
            </Link>
          </div>
        </section>

        <Footer />
        <div style={{ height: 80 }} />
      </div>
    </div>
  )
}
