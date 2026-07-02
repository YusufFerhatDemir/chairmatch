export const dynamic = 'force-dynamic'

import type { Metadata } from 'next'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export const metadata: Metadata = {
  title: 'Newsletter abmelden',
  description: 'Newsletter-Abmeldung von ChairMatch.',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{ token?: string; action?: string }>
}

/**
 * Public-Unsubscribe-Seite.
 * GET /unsubscribe?token=...           → meldet ab
 * GET /unsubscribe?token=...&action=resubscribe → reaktiviert
 *
 * Funktioniert ohne JS — alles serverseitig.
 */
export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams
  const token = (params.token || '').trim()
  const action = params.action || 'unsubscribe'

  let state: 'success' | 'reactivated' | 'invalid' | 'error' = 'invalid'
  let email: string | null = null

  if (token) {
    const sb = getSupabaseAdmin()
    const { data: sub } = await sb
      .from('newsletter_subscribers')
      .select('id, email, status')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (sub) {
      email = sub.email
      if (action === 'resubscribe') {
        const { error } = await sb
          .from('newsletter_subscribers')
          .update({ status: 'active', unsubscribed_at: null })
          .eq('id', sub.id)
        state = error ? 'error' : 'reactivated'
      } else {
        const { error } = await sb
          .from('newsletter_subscribers')
          .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
          .eq('id', sub.id)
        state = error ? 'error' : 'success'
      }
    } else {
      state = 'invalid'
    }
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
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          background: 'var(--c1, #111114)',
          border: '1px solid rgba(176,144,96,0.18)',
          borderRadius: 18,
          padding: '36px 28px',
          textAlign: 'center',
          color: 'var(--cream, #F5F5F7)',
        }}
      >
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
            <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
              {email ? `Wir haben ${email} aus unserer Newsletter-Liste entfernt.` : 'Deine E-Mail wurde aus unserer Newsletter-Liste entfernt.'}
              <br />
              Du erhältst keine weiteren Newsletter mehr von uns.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.5)', marginBottom: 16 }}>War das ein Versehen?</p>
            <a
              href={`/unsubscribe?token=${encodeURIComponent(token)}&action=resubscribe`}
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg,#D4AF37,#FCF6BA)',
                color: '#1A1000',
                padding: '12px 26px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              Wieder anmelden
            </a>
          </>
        )}

        {state === 'reactivated' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Willkommen zurück!</h2>
            <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
              {email ? `${email} ist wieder für unseren Newsletter angemeldet.` : 'Deine E-Mail ist wieder für unseren Newsletter angemeldet.'}
            </p>
            <a
              href="/"
              style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg,#D4AF37,#FCF6BA)',
                color: '#1A1000',
                padding: '12px 26px',
                borderRadius: 12,
                fontWeight: 700,
                textDecoration: 'none',
                fontSize: 14,
              }}
            >
              Zur Startseite
            </a>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Ungültiger Link</h2>
            <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
              Der Abmelde-Link ist ungültig oder bereits verwendet worden.
              Falls du weiterhin Newsletter erhältst, kontaktiere uns bitte unter{' '}
              <a href="mailto:support@chairmatch.de" style={{ color: '#D4AF37' }}>support@chairmatch.de</a>.
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <h2 style={{ fontSize: 22, marginBottom: 12, color: '#F5F5F7' }}>Fehler</h2>
            <p style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)', marginBottom: 24, lineHeight: 1.6 }}>
              Beim Verarbeiten deiner Anfrage ist ein Fehler aufgetreten. Bitte versuche es später erneut
              oder schreib uns an <a href="mailto:support@chairmatch.de" style={{ color: '#D4AF37' }}>support@chairmatch.de</a>.
            </p>
          </>
        )}
      </div>
    </section>
  )
}
