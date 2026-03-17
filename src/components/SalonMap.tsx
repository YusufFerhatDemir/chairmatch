'use client'

interface SalonMapProps {
  address: string
  salonName: string
}

export default function SalonMap({ address, salonName }: SalonMapProps) {
  if (!address) {
    return (
      <div
        style={{
          width: '100%',
          height: 250,
          borderRadius: 16,
          border: '1px solid var(--gold-500)',
          background: 'var(--c2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--stone)',
          fontSize: 14,
        }}
      >
        Keine Adresse verfügbar
      </div>
    )
  }

  const mapQuery = encodeURIComponent(`${salonName}, ${address}`)
  const embedUrl = `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`

  return (
    <div style={{ width: '100%' }}>
      <div
        style={{
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid var(--gold-500)',
        }}
      >
        <iframe
          title={`Standort von ${salonName}`}
          src={embedUrl}
          width="100%"
          height={250}
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
      <a
        href={mapsLink}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          marginTop: 8,
          padding: '10px 16px',
          borderRadius: 12,
          border: '1px solid rgba(176,144,96,0.2)',
          background: 'rgba(176,144,96,0.06)',
          color: 'var(--gold2)',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        In Google Maps öffnen →
      </a>
    </div>
  )
}
