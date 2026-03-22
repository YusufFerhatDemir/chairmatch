import Link from 'next/link'

export default function InvestorDokumentePage() {
  const docs = [
    { title: 'Pitch Deck', desc: 'Online-Version des Pitch Decks', href: '/pitch', available: true },
    { title: 'Geschäftsplan', desc: 'Detaillierter Business Plan', href: '#', available: false },
    { title: 'Cap Table', desc: 'Beteiligungsstruktur', href: '#', available: false },
    { title: 'Term Sheet', desc: 'Investitionsbedingungen', href: '#', available: false },
    { title: 'Finanzprognose', desc: '3-Jahres-Finanzmodell', href: '#', available: false },
    { title: 'Due Diligence', desc: 'Rechtliche und finanzielle Dokumente', href: '#', available: false },
  ]

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 8 }}>Investoren-Dokumente</h2>
      <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 24 }}>
        Verfügbare Dokumente für Due Diligence und Investment-Entscheidung.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
        {docs.map(doc => (
          <div key={doc.title} style={{
            background: 'var(--c1)',
            border: '1px solid rgba(176,144,96,0.08)',
            borderRadius: 12,
            padding: 20,
            opacity: doc.available ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{doc.available ? '📄' : '🔒'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>{doc.title}</p>
                <p style={{ fontSize: 11, color: 'var(--stone)', margin: '2px 0 0' }}>{doc.desc}</p>
              </div>
              {doc.available ? (
                <Link href={doc.href as '/pitch'} style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--gold2)', textDecoration: 'none',
                  padding: '6px 12px', border: '1px solid rgba(176,144,96,0.2)', borderRadius: 8,
                }}>
                  Öffnen
                </Link>
              ) : (
                <span style={{ fontSize: 10, color: 'var(--stone2)' }}>Bald verfügbar</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, padding: 20, background: 'rgba(176,144,96,0.04)', borderRadius: 12, border: '1px solid rgba(176,144,96,0.08)' }}>
        <p style={{ fontSize: 12, color: 'var(--stone)', margin: 0 }}>
          Weitere Dokumente auf Anfrage verfügbar. Kontaktieren Sie uns unter{' '}
          <span style={{ color: 'var(--gold2)', fontWeight: 600 }}>legal@chairmatch.de</span>
        </p>
      </div>
    </div>
  )
}
