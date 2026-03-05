import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { t } from '@/i18n'

export function AccountPage() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuthStore()
  const { theme, toggleTheme, language, setLanguage } = useUIStore()

  if (!user) {
    return (
      <div>
        <Helmet>
          <title>Konto | ChairMatch</title>
          <meta name="description" content="Verwalte dein ChairMatch-Konto, Einstellungen und Profil." />
          <link rel="canonical" href="https://chairmatch.de/account" />
        </Helmet>
        <Header>
          <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{t('account')}</div>
        </Header>
        <div style={{ padding: 'var(--pad)', textAlign: 'center' }}>
          <div style={{ marginBottom: 16, fontSize: 44, color: 'var(--stone)' }}>◎</div>
          <p style={{ color: 'var(--stone)', marginBottom: 20 }}>{t('login_prompt')}</p>
          <Button onClick={() => navigate('/auth')}>{t('login')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Helmet>
        <title>Konto | ChairMatch</title>
        <meta name="description" content="Verwalte dein ChairMatch-Konto, Einstellungen und Profil." />
        <link rel="canonical" href="https://chairmatch.de/account" />
      </Helmet>
      <Header>
        <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>{t('account')}</div>
      </Header>
      <div style={{ padding: 'var(--pad)' }}>
        {/* Profile section */}
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#080706', fontSize: 20 }}>
              {(profile?.full_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>{profile?.full_name || t('user')}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{user.email}</div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="lsm" style={{ marginBottom: 12 }}>{t('settings')}</div>
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <Switch checked={theme === 'light'} onChange={toggleTheme} label={t('light_mode')} />
          <div style={{ height: 16 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--font-md)' }}>{t('language')}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['de', 'en', 'tr'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? 'badge bgd' : 'badge'}
                  style={{ cursor: 'pointer', border: language !== lang ? '1px solid var(--border)' : undefined }}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Provider / Admin Dashboard */}
        {(profile?.role === 'anbieter' || profile?.role === 'admin' || profile?.role === 'super_admin') && (
          <Button variant="outline" onClick={() => navigate('/provider')} style={{ marginBottom: 12 }}>
            {profile?.role === 'admin' || profile?.role === 'super_admin' ? t('adminPanel') : t('provider_dashboard')}
          </Button>
        )}

        <Button variant="outline" onClick={signOut} style={{ marginTop: 8, color: 'var(--red)', borderColor: 'rgba(232,80,64,0.3)' }}>
          {t('logout')}
        </Button>
      </div>
    </div>
  )
}
