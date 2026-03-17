import type { Metadata } from 'next'
import Link from 'next/link'

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

        {/* For Providers */}
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

        {/* Investor CTA */}
        <section style={{ padding: '40px var(--pad)', textAlign: 'center' }}>
          <h3 className="cinzel" style={{ fontSize: 16, color: 'var(--gold2)', marginBottom: 8 }}>
            Für Investoren
          </h3>
          <p style={{ fontSize: 13, color: 'var(--stone)', marginBottom: 20, lineHeight: 1.5 }}>
            €15 Mrd. Beauty-Markt in Deutschland.<br />Seien Sie von Anfang an dabei.
          </p>
          <Link href="/pitch" className="boutline" style={{ display: 'inline-block', padding: '14px 28px', textDecoration: 'none', fontSize: 14 }}>
            Pitch Deck ansehen
          </Link>
        </section>

        {/* Footer */}
        <footer style={{ padding: '24px var(--pad) 100px', borderTop: '1px solid rgba(176,144,96,0.08)', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'var(--stone2)', lineHeight: 1.7 }}>
            ChairMatch GmbH (i. Gr.) · Deutschland · © 2026
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
            <Link href="/impressum" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Datenschutz</Link>
            <Link href="/agb" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>AGB</Link>
          </div>
        </footer>

      </div>
    </div>
  )
}
