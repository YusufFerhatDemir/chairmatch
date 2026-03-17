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
  const embedUrl = `https://www.google.com/maps?q=${mapQuery}&output=embed`

  return (
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
        allowFullScreen
      />
    </div>
  )
}
