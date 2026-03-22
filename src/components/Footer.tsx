import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid rgba(176,144,96,.12)', marginTop: 40, paddingBottom: 100 }}>

      {/* So funktioniert's */}
      <section style={{ padding: '32px var(--pad) 24px' }}>
        <h3 style={{ fontSize: 'var(--font-md)', fontWeight: 700, color: 'var(--gold2)', marginBottom: 20, textAlign: 'center', letterSpacing: 1 }}>
          SO FUNKTIONIERT&apos;S
        </h3>

        {/* Für Kunden */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 8, letterSpacing: 1 }}>FÜR KUNDEN</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { step: '1', title: 'Salon finden', desc: 'Durchsuche Salons nach Kategorie, Standort oder Bewertung' },
              { step: '2', title: 'Termin buchen', desc: 'Wähle Service, Spezialist und Wunschzeit' },
              { step: '3', title: 'Genießen', desc: 'Bezahle sicher online oder vor Ort' },
            ].map(s => (
              <div key={s.step} style={{ flex: 1, padding: '12px 10px', background: 'var(--c1)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold2)', marginBottom: 6 }}>{s.step}</div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 9, color: 'var(--stone)', lineHeight: 1.4 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Für Salonbesitzer */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 8, letterSpacing: 1 }}>FÜR SALONBESITZER</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { step: '1', title: 'Registrieren', desc: 'Kostenloses Profil in 5 Minuten erstellen' },
              { step: '2', title: 'Profil einrichten', desc: 'Services, Fotos, Öffnungszeiten hinzufügen' },
              { step: '3', title: 'Kunden empfangen', desc: 'Buchungen verwalten, Umsatz steigern' },
            ].map(s => (
              <div key={s.step} style={{ flex: 1, padding: '12px 10px', background: 'var(--c1)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'var(--gold2)', marginBottom: 6 }}>{s.step}</div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--cream)', marginBottom: 2 }}>{s.title}</p>
                <p style={{ fontSize: 9, color: 'var(--stone)', lineHeight: 1.4 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
          {[
            { icon: '0%', label: 'Keine Provision für Salons' },
            { icon: '11', label: 'Beauty-Kategorien' },
            { icon: '24/7', label: 'Online-Buchung' },
            { icon: 'PWA', label: 'App ohne Download' },
          ].map(f => (
            <div key={f.label} style={{ padding: '10px 12px', background: 'var(--c1)', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold2)', minWidth: 32 }}>{f.icon}</span>
              <span style={{ fontSize: 10, color: 'var(--stone)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Links */}
      <div style={{ padding: '0 var(--pad) 12px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cream)', marginBottom: 6, letterSpacing: 1 }}>PLATTFORM</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link href="/explore" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Salons entdecken</Link>
            <Link href="/offers" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Angebote</Link>
            <Link href="/shop" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Shop</Link>
            <Link href="/rentals" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Stuhlvermietung</Link>
          </nav>
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cream)', marginBottom: 6, letterSpacing: 1 }}>FÜR PROFIS</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link href="/register/anbieter" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Salon registrieren</Link>
            <Link href="/statistik" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Statistiken</Link>
            <Link href="/investor" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Investoren</Link>
            <Link href="/pitch" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Pitch Deck</Link>
          </nav>
        </div>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--cream)', marginBottom: 6, letterSpacing: 1 }}>RECHTLICHES</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Link href="/impressum" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Impressum</Link>
            <Link href="/datenschutz" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Datenschutz</Link>
            <Link href="/agb" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>AGB</Link>
            <Link href="/cookie-settings" style={{ fontSize: 11, color: 'var(--stone)', textDecoration: 'none' }}>Cookies</Link>
          </nav>
        </div>
      </div>

      {/* Copyright */}
      <div style={{ padding: '16px var(--pad) 8px', textAlign: 'center', borderTop: '1px solid rgba(176,144,96,.06)' }}>
        <p style={{ fontSize: 10, color: 'var(--stone2)', letterSpacing: 1 }}>
          © {new Date().getFullYear()} ChairMatch GmbH (i. Gr.) · Deutschland
        </p>
        <p style={{ fontSize: 9, color: 'var(--stone2)', marginTop: 4 }}>
          Made with Liebe in Deutschland
        </p>
      </div>
    </footer>
  )
}
