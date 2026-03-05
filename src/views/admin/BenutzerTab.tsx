import { useEffect, useState } from 'react'
import { useUserManagementStore, type ManagedUser } from '@/stores/userManagementStore'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import type { UserRole } from '@/lib/types'

/* ═══ ROLE CONFIG ═══ */

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'kunde', label: 'Kunde', color: '#7EC8E3' },
  { value: 'anbieter', label: 'Anbieter', color: '#82ca9d' },
  { value: 'admin', label: 'Admin', color: '#C8A84B' },
  { value: 'super_admin', label: 'Super Admin', color: '#E8D06A' },
]

const FILTER_OPTIONS: { value: UserRole | 'all'; label: string }[] = [
  { value: 'all', label: 'Alle' },
  { value: 'kunde', label: 'Kunden' },
  { value: 'anbieter', label: 'Anbieter' },
  { value: 'admin', label: 'Admins' },
  { value: 'super_admin', label: 'Super Admins' },
]

/* ═══ STYLES ═══ */

const s = {
  wrap: { padding: 'var(--pad)' },
  searchRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap' as const,
  },
  filterBtn: (active: boolean) => ({
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700 as const,
    cursor: 'pointer' as const,
    border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
    background: active ? 'rgba(200,168,75,0.12)' : 'transparent',
    color: active ? 'var(--gold2)' : 'var(--stone)',
    transition: 'all 0.2s',
  }),
  filterRow: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    overflowX: 'auto' as const,
    scrollbarWidth: 'none' as const,
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderBottom: '1px solid var(--border)',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: 'var(--c3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    color: 'var(--stone)',
    flexShrink: 0,
    overflow: 'hidden' as const,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontWeight: 700 as const,
    fontSize: 14,
    color: 'var(--cream)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  email: {
    fontSize: 12,
    color: 'var(--stone)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  select: {
    padding: '4px 8px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--c2)',
    color: 'var(--cream)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer' as const,
  },
  count: {
    fontSize: 13,
    color: 'var(--stone)',
    marginBottom: 12,
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700 as const,
    background: 'rgba(200,168,75,0.08)',
    color: 'var(--gold2)',
  },
}

/* ═══ USER ROW COMPONENT ═══ */

function UserRow({
  user,
  isSuperAdmin,
  onRoleChange,
  onToggleActive,
}: {
  user: ManagedUser
  isSuperAdmin: boolean
  onRoleChange: (userId: string, role: UserRole) => void
  onToggleActive: (userId: string) => void
}) {
  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : (user.email?.[0]?.toUpperCase() || '?')

  const roleInfo = ROLE_OPTIONS.find((r) => r.value === user.role)
  const date = new Date(user.created_at).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })

  return (
    <div style={s.card}>
      {/* Avatar */}
      <div style={s.avatar}>
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          initials
        )}
      </div>

      {/* Info */}
      <div style={s.info}>
        <div style={s.name}>{user.full_name || 'Kein Name'}</div>
        <div style={s.email}>{user.email}</div>
        <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
          Seit {date} · {user.preferred_language.toUpperCase()}
        </div>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        {isSuperAdmin ? (
          <select
            style={{
              ...s.select,
              borderColor: roleInfo?.color || 'var(--border)',
            }}
            value={user.role}
            onChange={(e) => onRoleChange(user.id, e.target.value as UserRole)}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        ) : (
          <Badge
            variant={user.role === 'admin' || user.role === 'super_admin' ? 'gold' : 'green'}
          >
            {roleInfo?.label || user.role}
          </Badge>
        )}

        {isSuperAdmin && (
          <button
            onClick={() => onToggleActive(user.id)}
            style={{
              width: 36,
              height: 20,
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              background: user.is_active ? 'var(--gold)' : 'var(--c3)',
              position: 'relative',
              transition: 'background 0.2s',
              flexShrink: 0,
            }}
            title={user.is_active ? 'Deaktivieren' : 'Aktivieren'}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                left: user.is_active ? 18 : 2,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left 0.2s',
              }}
            />
          </button>
        )}
      </div>
    </div>
  )
}

/* ═══ MAIN COMPONENT ═══ */

export function BenutzerTab({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const store = useUserManagementStore()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!loaded) {
      store.loadUsers()
      setLoaded(true)
    }
  }, [loaded])

  const filtered = store.getFilteredUsers()

  // Role counts
  const roleCounts = store.users.reduce(
    (acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const handleRoleChange = async (userId: string, role: UserRole) => {
    await store.updateUserRole(userId, role)
  }

  const handleToggleActive = async (userId: string) => {
    await store.toggleUserActive(userId)
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.count}>
        <span style={s.countBadge}>👥 Gesamt: {store.users.length}</span>
        {ROLE_OPTIONS.map((r) => (
          <span key={r.value} style={s.countBadge}>
            {r.label}: {roleCounts[r.value] || 0}
          </span>
        ))}
        <span style={s.countBadge}>
          🔴 Inaktiv: {store.users.filter((u) => !u.is_active).length}
        </span>
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Suche nach Name, E-Mail oder Telefon..."
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Filter */}
      <div style={s.filterRow}>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.value}
            style={s.filterBtn(store.roleFilter === f.value)}
            onClick={() => store.setRoleFilter(f.value)}
          >
            {f.label}
            {f.value !== 'all' && roleCounts[f.value]
              ? ` (${roleCounts[f.value]})`
              : f.value === 'all'
                ? ` (${store.users.length})`
                : ''}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Lade Benutzer...
        </div>
      )}
      {store.error && (
        <div
          style={{
            padding: 12,
            marginBottom: 12,
            borderRadius: 10,
            background: 'rgba(220,50,50,0.1)',
            color: '#f66',
            fontSize: 13,
          }}
        >
          ⚠️ {store.error}
        </div>
      )}

      {/* User List */}
      {!store.loading && filtered.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
          Keine Benutzer gefunden.
        </div>
      )}

      {filtered.map((user) => (
        <UserRow
          key={user.id}
          user={user}
          isSuperAdmin={isSuperAdmin}
          onRoleChange={handleRoleChange}
          onToggleActive={handleToggleActive}
        />
      ))}
    </div>
  )
}
