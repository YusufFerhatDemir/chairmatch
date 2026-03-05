import { Helmet } from 'react-helmet-async'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Logo } from '@/components/ui/Logo'
import { t } from '@/i18n'

export function AuthPage() {
  const navigate = useNavigate()
  const { signIn, signUp, loading, error } = useAuthStore()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    if (isLogin) {
      await signIn(email, password)
      if (!useAuthStore.getState().error) {
        navigate('/account')
      }
    } else {
      const err = await signUp(email, password, name)
      if (!err) {
        // Check if auto-signed in
        const state = useAuthStore.getState()
        if (state.user) {
          navigate('/account')
        } else {
          // Auto-login after successful signup (email auto-confirmed by trigger)
          const loginErr = await signIn(email, password)
          if (!loginErr) {
            navigate('/account')
          } else {
            setSuccessMsg(t('registerSuccess'))
            setIsLogin(true)
          }
        }
      }
    }
  }

  return (
    <div style={{ padding: 'var(--pad)', paddingTop: 40 }}>
      <Helmet>
        <title>Anmelden | ChairMatch</title>
        <meta name="description" content="Melde dich an oder erstelle ein Konto bei ChairMatch." />
        <link rel="canonical" href="https://chairmatch.de/auth" />
      </Helmet>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        <Logo size={60} />
      </div>
      <h1 className="cinzel" style={{ textAlign: 'center', fontSize: 'var(--font-xl)', fontWeight: 700, marginBottom: 8 }}>
        {isLogin ? t('login') : t('registerBtn')}
      </h1>
      <p style={{ textAlign: 'center', fontSize: 'var(--font-sm)', color: 'var(--stone)', marginBottom: 28 }}>
        {isLogin ? t('login_subtitle') : t('register_subtitle')}
      </p>

      {successMsg && (
        <div style={{ background: 'rgba(130,202,157,0.15)', border: '1px solid #82ca9d', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#82ca9d', fontSize: 'var(--font-sm)', textAlign: 'center' }}>
          ✅ {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!isLogin && <Input label={t('name')} value={name} onChange={e => setName(e.target.value)} placeholder={t('your_name')} required />}
        <Input label={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('your_email')} required />
        <Input label={t('password')} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        {error && <div style={{ color: 'var(--red)', fontSize: 'var(--font-sm)', textAlign: 'center' }}>{error}</div>}
        <Button type="submit" loading={loading}>{isLogin ? t('login') : t('registerBtn')}</Button>
      </form>

      <button
        onClick={() => setIsLogin(!isLogin)}
        style={{ width: '100%', textAlign: 'center', marginTop: 16, color: 'var(--gold)', fontSize: 'var(--font-sm)', fontWeight: 600 }}
      >
        {isLogin ? t('no_account') : t('has_account')}
      </button>

      <button onClick={() => navigate(-1)} style={{ width: '100%', textAlign: 'center', marginTop: 12, color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>
        {t('back')}
      </button>
    </div>
  )
}
