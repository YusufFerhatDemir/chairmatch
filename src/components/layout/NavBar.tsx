import { useLocation, useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'

const NAV = [
  { id: 'home', path: '/', icon: '⌂', label: 'START' },
  { id: 'explore', path: '/explore', icon: '◫', label: 'TERMIN' },
  { id: 'favorites', path: '/favorites', icon: '♡', label: 'FAVORITEN' },
  { id: 'offers', path: '/offers', icon: '❋', label: 'ANGEBOTE' },
  { id: 'account', path: '/account', icon: '◎', label: 'KONTO' },
]

export function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const notifications = useUIStore(s => s.notifications)
  const hasUnread = notifications.some(n => !n.read)

  const getActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="nav" role="navigation" aria-label="Hauptnavigation">
      {NAV.map(item => {
        const active = getActive(item.path)
        return (
          <button
            key={item.id}
            className="nbtn"
            onClick={() => navigate(item.path)}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
          >
            {item.id === 'account' && hasUnread && <span className="notif-dot" />}
            <span style={{
              fontSize: 22,
              color: active ? 'var(--gold)' : 'var(--stone)',
              lineHeight: 1,
            }}>
              {item.icon}
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '.05em',
              color: active ? 'var(--gold)' : 'var(--stone2)',
              marginTop: 1,
            }}>
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
