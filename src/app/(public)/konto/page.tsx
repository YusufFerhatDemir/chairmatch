'use client'

import { BrandLogo } from '@/components/BrandLogo'
import BottomNav from '@/components/BottomNav'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  name: string
  email: string
  role: 'anbieter' | 'mieter' | 'vermieter' | 'kunde'
}

export default function KontoPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [agbOk, setAgbOk] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cm_user')
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  function showToast(msg: string, type: 'ok' | 'err' = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2200)
  }

  async function handleLogin() {
    if (!email || !password) {
      showToast('Email und Passwort eingeben', 'err')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 500))
    // Detect role from prior onboarding
    let role: User['role'] = 'kunde'
    try {
      if (localStorage.getItem('cm_anbieter_draft')) role = 'anbieter'
      else if (localStorage.getItem('cm_vermieter_draft')) role = 'vermieter'
      else if (localStorage.getItem('cm_mieter_draft')) role = 'mieter'
    } catch {}
    const u: User = { name: email.split('@')[0], email, role }
    try { localStorage.setItem('cm_user', JSON.stringify(u)) } catch {}
    setUser(u)
    setLoading(false)
    showToast('Angemeldet ✓', 'ok')
  }

  async function handleRegister() {
    if (!name || !email || !password) {
      showToast('Bitte alle Felder ausfüllen', 'err')
      return
    }
    if (password.length < 8) {
      showToast('Passwort min. 8 Zeichen', 'err')
      return
    }
    if (!agbOk) {
      showToast('Bitte AGB akzeptieren', 'err')
      return
    }
    setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    let role: User['role'] = 'kunde'
    try {
      if (localStorage.getItem('cm_anbieter_draft')) role = 'anbieter'
      else if (localStorage.getItem('cm_vermieter_draft')) role = 'vermieter'
      else if (localStorage.getItem('cm_mieter_draft')) role = 'mieter'
    } catch {}
    const u: User = { name, email, role }
    try { localStorage.setItem('cm_user', JSON.stringify(u)) } catch {}
    setUser(u)
    setLoading(false)
    showToast('Konto erstellt ✓ Bestätigungs-Mail versendet', 'ok')
  }

  function handleLogout() {
    try { localStorage.removeItem('cm_user') } catch {}
    setUser(null)
    setEmail(''); setPassword(''); setName('')
    showToast('Abgemeldet', 'ok')
  }

  const roleLabel: Record<User['role'], string> = {
    anbieter: 'Anbieter',
    vermieter: 'Vermieter',
    mieter: 'Mieter',
    kunde: 'Kunde',
  }
  const roleHref: Record<User['role'], { lbl: string; sub: string; href: string }> = {
    anbieter:  { lbl: 'Mein Salon',   sub: 'Profil bearbeiten', href: '/anbieter/mein-salon' },
    vermieter: { lbl: 'Mein Inserat', sub: 'Inserat bearbeiten', href: '/vermieter/mein-inserat' },
    mieter:    { lbl: 'Mein Bereich', sub: 'Suche & Anfragen', href: '/mieter/mein-bereich' },
    kunde:     { lbl: 'Startseite',   sub: 'Salons entdecken', href: '/' },
  }

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
        marginBottom: 24, position: 'relative',
      }}>
        {toast && (
          <div style={{
            position: 'absolute', left: '50%', top: 60, transform: 'translateX(-50%)',
            background: toast.type === 'ok' ? '#4A8A5A' : '#E85040',
            color: '#0B0B0F',
            padding: '10px 18px', borderRadius: 14,
            fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)', zIndex: 50, whiteSpace: 'nowrap',
          }}>
            <span>{toast.type === 'ok' ? '✓' : '⚠'}</span><span>{toast.msg}</span>
          </div>
        )}

        {/* Top bar */}
        <div style={{ padding: '16px 20px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(196,168,106,0.08)',
              border: '1px solid rgba(196,168,106,0.22)',
              color: 'var(--gold2)', fontSize: 18, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >‹</button>
          <span style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--stone)', fontWeight: 600, textTransform: 'uppercase' }}>Konto</span>
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <BrandLogo size={54} variant="glow" animateStar={false} priority={true} />
          <div>
            <h1 className="cinzel text-gold-metallic" style={{ fontSize: 15, fontWeight: 700, letterSpacing: 3, lineHeight: 1 }}>
              CHAIRMATCH
            </h1>
            <p style={{ fontSize: 8, letterSpacing: 3, color: 'var(--gold2)', marginTop: 3 }}>DEUTSCHLAND</p>
          </div>
        </div>

        {user ? (
          // ════════ EINGELOGGT ════════
          <>
            <div style={{ padding: '0 20px 18px' }}>
              <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
                Mein Konto
              </h2>
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>Profil und Einstellungen</p>
            </div>

            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Profile card */}
              <div style={{
                background: 'linear-gradient(145deg, rgba(191,149,63,0.05) 0%, var(--c1) 50%, rgba(179,135,40,0.03) 100%)',
                border: '1px solid rgba(191,149,63,0.22)',
                borderRadius: 18, padding: 20,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 62, height: 62, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2A2418, #161210)',
                  border: '2px solid var(--gold2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="cinzel text-gold-metallic" style={{ fontWeight: 600, fontSize: 24 }}>
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--cream)', marginBottom: 3 }}>{user.name}</h4>
                  <p style={{ fontSize: 11, color: 'var(--stone)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</p>
                  <span style={{
                    marginTop: 6, display: 'inline-block',
                    fontSize: 9, letterSpacing: 1.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                    background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                    color: '#1a1000', textTransform: 'uppercase',
                  }}>{roleLabel[user.role]}</span>
                </div>
              </div>

              {/* Menu */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: '🏠', lbl: roleHref[user.role].lbl, sub: roleHref[user.role].sub, href: roleHref[user.role].href },
                  { icon: '🔒', lbl: 'Passwort ändern', sub: 'Zugang sichern', href: '/konto' },
                  { icon: '🌍', lbl: 'Sprache', sub: 'Deutsch', href: '/konto' },
                  { icon: '🔔', lbl: 'Benachrichtigungen', sub: 'Email · Push aktiviert', href: '/konto' },
                  { icon: '📄', lbl: 'AGB & Datenschutz', sub: 'Rechtliches', href: '/agb' },
                ].map((m) => (
                  <button
                    key={m.lbl}
                    onClick={() => router.push(m.href as never)}
                    style={{
                      width: '100%',
                      background: 'var(--c1)',
                      border: '0.5px solid rgba(196,168,106,0.15)',
                      borderRadius: 12, padding: 14,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                      fontFamily: 'inherit', color: 'var(--cream)',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'radial-gradient(circle, rgba(212,175,55,0.10), transparent 70%)',
                      border: '1px solid rgba(212,175,55,0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                    }}>{m.icon}</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <p style={{ fontSize: 13, fontWeight: 700 }}>{m.lbl}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--stone)' }}>{m.sub}</p>
                    </div>
                    <span style={{ fontSize: 18, color: 'var(--gold2)' }}>›</span>
                  </button>
                ))}
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%', padding: 14, borderRadius: 14,
                  background: 'transparent', color: 'var(--gold2)',
                  border: '1px solid rgba(196,168,106,0.3)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>↩</span><span>Abmelden</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('Konto wirklich unwiderruflich löschen?')) {
                    try { localStorage.clear() } catch {}
                    setUser(null)
                    showToast('Konto gelöscht', 'ok')
                  }
                }}
                style={{
                  width: '100%', padding: 14, borderRadius: 14,
                  background: 'transparent', color: '#FF8888',
                  border: '1px solid rgba(232,80,64,0.3)',
                  fontFamily: 'inherit', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <span>🗑</span><span>Konto löschen</span>
              </button>
            </div>
            <BottomNav role={user.role === 'kunde' ? 'mieter' : (user.role as 'anbieter' | 'vermieter' | 'mieter')} />
          </>
        ) : (
          // ════════ NICHT EINGELOGGT — Login / Register ════════
          <>
            <div style={{ padding: '0 20px 18px' }}>
              <h2 className="cinzel text-gold-metallic" style={{ fontSize: 26, fontWeight: 500, letterSpacing: 0.5, lineHeight: 1.15, marginBottom: 5 }}>
                {tab === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--stone)' }}>
                {tab === 'login' ? 'Melde dich an oder erstelle ein Konto.' : 'In 30 Sekunden registriert.'}
              </p>
            </div>

            <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tabs */}
              <div style={{
                display: 'flex', background: 'var(--c1)',
                border: '0.5px solid rgba(196,168,106,0.18)',
                borderRadius: 14, padding: 4,
              }}>
                {(['login', 'register'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: 10, borderRadius: 10,
                      background: tab === t ? 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)' : 'transparent',
                      color: tab === t ? '#1a1000' : 'var(--stone)',
                      border: 'none', fontFamily: 'inherit', fontSize: 13,
                      fontWeight: tab === t ? 700 : 600, cursor: 'pointer',
                    }}
                  >
                    {t === 'login' ? 'Anmelden' : 'Registrieren'}
                  </button>
                ))}
              </div>

              {/* Name (only on register) */}
              {tab === 'register' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Dein Name</label>
                  <input
                    type="text" value={name} onChange={(e) => setName(e.target.value)}
                    placeholder="Yusuf Demir"
                    style={{
                      width: '100%', padding: '13px 14px',
                      background: 'var(--c1)', color: 'var(--cream)',
                      border: '0.5px solid rgba(196,168,106,0.25)',
                      borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Email</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="dein@email.de"
                  style={{
                    width: '100%', padding: '13px 14px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.25)',
                    borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, letterSpacing: 1.5, color: 'var(--stone)', textTransform: 'uppercase' }}>Passwort</label>
                <input
                  type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  style={{
                    width: '100%', padding: '13px 14px',
                    background: 'var(--c1)', color: 'var(--cream)',
                    border: '0.5px solid rgba(196,168,106,0.25)',
                    borderRadius: 12, fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>

              {tab === 'register' && (
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: 'var(--cream)', lineHeight: 1.5 }}>
                  <input
                    type="checkbox" checked={agbOk} onChange={(e) => setAgbOk(e.target.checked)}
                    style={{ marginTop: 3, accentColor: '#C4A86A', width: 16, height: 16, flexShrink: 0 }}
                  />
                  <span>Ich akzeptiere die <span style={{ color: '#C4A86A', fontWeight: 700 }}>AGB</span> &amp; <span style={{ color: '#C4A86A', fontWeight: 700 }}>Datenschutzerklärung</span></span>
                </label>
              )}

              {tab === 'login' && (
                <p style={{ textAlign: 'right', fontSize: 12, color: 'var(--gold2)', fontWeight: 600, marginTop: -6, cursor: 'pointer' }}>
                  Passwort vergessen?
                </p>
              )}

              <button
                onClick={tab === 'login' ? handleLogin : handleRegister}
                disabled={loading}
                style={{
                  width: '100%', padding: 14, borderRadius: 14,
                  background: 'linear-gradient(135deg, #D4AF37 0%, #BF953F 25%, #FCF6BA 50%, #B38728 75%, #AA771C 100%)',
                  color: '#1a1000', border: 'none',
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: loading ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 0 18px rgba(196,168,106,0.25)', opacity: loading ? 0.7 : 1,
                }}
              >
                <span>{loading ? 'Bitte warten...' : (tab === 'login' ? 'Anmelden' : 'Konto erstellen')}</span>
                {!loading && <span>→</span>}
              </button>

              {tab === 'register' && (
                <p style={{ fontSize: 11, color: 'var(--stone)', textAlign: 'center', marginTop: -4 }}>
                  Du bekommst eine Bestätigungs-Mail mit einem Link.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
