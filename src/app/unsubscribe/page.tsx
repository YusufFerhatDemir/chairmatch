export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Newsletter abmelden',
  description: 'Newsletter-Abmeldung von ChairMatch.',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ token?: string; action?: string; state?: string }>
}

/**
 * Public-Unsubscribe-Seite. Funktioniert ohne JS — das Formular unten ist ein
 * gewoehnliches POST.
 *
 *   GET  /unsubscribe?token=…            → fragt nach ("Wirklich abmelden?")
 *   POST /api/newsletter/unsubscribe     → meldet ab, leitet hierher zurueck
 *   GET  /unsubscribe?state=success      → Ergebnis
 *
 * Bis Track 19 hat der erste dieser drei Aufrufe die Abmeldung selbst
 * vorgenommen. Das war aus zwei Gruenden falsch, und der zweite hat wehgetan:
 *
 *  1. Ein GET soll nichts aendern. Wer den Link in der Adresszeile
 *     zurueckklickt oder die Seite neu laedt, loest sonst die Aktion erneut
 *     aus — bei `action=resubscribe` sogar die Gegenrichtung.
 *
 *  2. Postfaecher oeffnen Links in eingehenden Mails, bevor ein Mensch sie
 *     sieht: Microsoft Defender (Safe Links), Barracuda, Proofpoint, diverse
 *     Virenscanner. JEDE dieser Pruefungen hat den Empfaenger abgemeldet. Ein
 *     Abonnent, der nie geklickt hat, war nach der ersten Mail weg — und im
 *     Bestand steht daneben `status = 'unsubscribed'`, also genau das
 *     Gegenteil dessen, was er wollte.
 *
 * Die E-Mail-Adresse stand vorher auf der Ergebnisseite ("Wir haben
 * name@example.de entfernt"). Sie steht jetzt nicht mehr da: der Token wandert
 * durch Referrer, Proxy-Logs und Browserverlauf, und wer die URL sieht,
 * bekaeme sonst die dazugehoerige Adresse mitgeliefert.
 */
export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = (params.token || '').trim()
  const action = params.action === 'resubscribe' ? 'resubscribe' : 'unsubscribe'
  const state = params.state || ''

  const card: React.CSSProperties = {
    maxWidth: 480,
    width: '100%',
    background: 'var(--c1, #111114)',
    border: '1px solid rgba(176,144,96,0.18)',
    borderRadius: 18,
    padding: '36px 28px',
    textAlign: 'center',
    color: 'var(--cream, #F5F5F7)',
  }
  const button: React.CSSProperties = {
    display: 'inline-block',
    background: 'linear-gradient(135deg,#D4AF37,#FCF6BA)',
    color: '#1A1000',
    padding: '12px 26px',
    borderRadius: 12,
    fontWeight: 700,
    textDecoration: 'none',
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
  }
  const text: React.CSSProperties = {
    fontSize: 14,
    color: 'rgba(245,245,247,0.7)',
    marginBottom: 24,
    lineHeight: 1.6,
  }

  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg, #0B0B0F)',
        padding: 20,
      }}
    >
      <div style={card}>
        <h1
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 28,
            letterSpacing: 6,
            margin: '0 0 4px',
            color: '#D4AF37',
          }}
        >
          CHAIR<span style={{ color: '#FCF6BA' }}>MATCH</span>
        </h1>
        <p style={{ fontSize: 11, letterSpacing: 4, color: '#8A7248', textTransform: 'uppercase', margin: '0 0 28px' }}>
          Newsletter
        </p>

        {state === 'success' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Du wurdest abgemeldet</h2>
            <p style={text}>
              Deine E-Mail wurde aus unserer Newsletter-Liste entfernt.
              <br />
              Du erhältst keine weiteren Newsletter mehr von uns.
            </p>
            {token && (
              <>
                <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', marginBottom: 16 }}>War das ein Versehen?</p>
                <form method="post" action="/api/newsletter/unsubscribe">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="action" value="resubscribe" />
                  <button type="submit" style={button}>Wieder anmelden</button>
                </form>
              </>
            )}
          </>
        )}

        {state === 'reactivated' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Willkommen zurück!</h2>
            <p style={text}>Deine E-Mail ist wieder für unseren Newsletter angemeldet.</p>
            <a href="/" style={button}>Zur Startseite</a>
          </>
        )}

        {state === 'error' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Fehler</h2>
            <p style={text}>
              Beim Verarbeiten deiner Anfrage ist ein Fehler aufgetreten. Bitte versuche es später erneut
              oder schreib uns an <a href="mailto:support@chairmatch.de" style={{ color: '#D4AF37' }}>support@chairmatch.de</a>.
            </p>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Ungültiger Link</h2>
            <p style={text}>
              Der Abmelde-Link ist ungültig oder bereits verwendet worden.
              Falls du weiterhin Newsletter erhältst, kontaktiere uns bitte unter{' '}
              <a href="mailto:support@chairmatch.de" style={{ color: '#D4AF37' }}>support@chairmatch.de</a>.
            </p>
          </>
        )}

        {/* Kein Ergebnis-Status: hier wird nur gefragt, nichts geaendert. */}
        {!state && token && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>
              {action === 'resubscribe' ? 'Newsletter wieder abonnieren?' : 'Newsletter abbestellen?'}
            </h2>
            <p style={text}>
              {action === 'resubscribe'
                ? 'Du bekommst unseren Newsletter dann wieder.'
                : 'Du erhältst danach keine weiteren Newsletter mehr von uns.'}
            </p>
            <form method="post" action="/api/newsletter/unsubscribe">
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="action" value={action} />
              <button type="submit" style={button}>
                {action === 'resubscribe' ? 'Wieder anmelden' : 'Jetzt abmelden'}
              </button>
            </form>
          </>
        )}

        {!state && !token && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Ungültiger Link</h2>
            <p style={text}>
              Dieser Abmelde-Link ist unvollständig. Nutze bitte den Link aus deiner Newsletter-E-Mail
              oder schreib uns an <a href="mailto:support@chairmatch.de" style={{ color: '#D4AF37' }}>support@chairmatch.de</a>.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
