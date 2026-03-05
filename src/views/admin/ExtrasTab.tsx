import { useEffect, useState } from 'react'
import { useExtrasStore } from '@/stores/extrasStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/* ═══ STYLES ═══ */

const s = {
  wrap: { padding: 'var(--pad)' },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontWeight: 700 as const,
    fontSize: 16,
    color: 'var(--gold2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 8,
    marginBottom: 16,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    background: 'var(--c2)',
    border: '1px solid var(--border)',
    textAlign: 'center' as const,
  },
  num: { fontSize: 20, fontWeight: 700 as const, color: 'var(--gold2)' },
  label: { fontSize: 10, color: 'var(--stone)', fontWeight: 600 as const, marginTop: 2 },
  configCard: {
    padding: 16,
    background: 'var(--c2)',
    borderRadius: 12,
    border: '1px solid var(--border)',
    marginBottom: 16,
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 12,
    color: 'var(--stone)',
    fontWeight: 600 as const,
    width: 120,
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  subRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  },
  subEmail: { fontFamily: 'monospace', fontSize: 13, color: 'var(--cream)' },
  subMeta: { fontSize: 11, color: 'var(--stone)' },
  refRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
    gap: 8,
  },
  refCode: { fontFamily: 'monospace', fontSize: 12, color: 'var(--gold2)', fontWeight: 700 as const },
}

function formatEuro(cents: number) {
  return (cents / 100).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

type TabView = 'loyalty' | 'newsletter' | 'referral'

/* ═══ MAIN ═══ */

export function ExtrasTab() {
  const store = useExtrasStore()
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<TabView>('loyalty')

  // Loyalty editing
  const [editStamps, setEditStamps] = useState('')
  const [editReward, setEditReward] = useState('')

  // Referral editing
  const [editRefReward, setEditRefReward] = useState('')
  const [editRefDesc, setEditRefDesc] = useState('')

  useEffect(() => {
    if (!loaded) {
      store.loadAll()
      setLoaded(true)
    }
  }, [loaded])

  useEffect(() => {
    if (store.loyaltyConfig) {
      setEditStamps(String(store.loyaltyConfig.stamps_required))
      setEditReward(store.loyaltyConfig.reward_description)
    }
  }, [store.loyaltyConfig])

  useEffect(() => {
    if (store.referralConfig) {
      setEditRefReward(String(store.referralConfig.reward_cents / 100))
      setEditRefDesc(store.referralConfig.description)
    }
  }, [store.referralConfig])

  const st = store.stats

  return (
    <div style={s.wrap}>
      {/* Error */}
      {store.error && (
        <div style={{ color: '#f66', fontSize: 13, marginBottom: 8, padding: 8, background: 'rgba(220,50,50,0.1)', borderRadius: 8 }}>
          ⚠️ {store.error}
        </div>
      )}

      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        <Button variant={view === 'loyalty' ? 'gold' : 'outline'} onClick={() => setView('loyalty')}>
          🎫 Stempelkarte
        </Button>
        <Button variant={view === 'newsletter' ? 'gold' : 'outline'} onClick={() => setView('newsletter')}>
          📧 Newsletter
        </Button>
        <Button variant={view === 'referral' ? 'gold' : 'outline'} onClick={() => setView('referral')}>
          🤝 Empfehlungen
        </Button>
      </div>

      {/* ═══ LOYALTY / STEMPELKARTE ═══ */}
      {view === 'loyalty' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>🎫 Stempelkarte / Treueprogramm</div>

          {/* Stats */}
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.num}>{st.totalStamps}</div>
              <div style={s.label}>Stempel gesamt</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#82ca9d' }}>{st.redeemedStamps}</div>
              <div style={s.label}>Eingelöst</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#7EC8E3' }}>{st.activeUsers}</div>
              <div style={s.label}>Nutzer</div>
            </div>
          </div>

          {/* Config */}
          {store.loyaltyConfig && (
            <div style={s.configCard}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--cream)', marginBottom: 12 }}>
                ⚙️ Einstellungen
              </div>
              <div style={s.configRow}>
                <span style={s.configLabel}>Stempel nötig</span>
                <Input
                  type="number"
                  value={editStamps}
                  onChange={(e) => setEditStamps(e.target.value)}
                  style={{ width: 80 }}
                />
              </div>
              <div style={s.configRow}>
                <span style={s.configLabel}>Belohnung</span>
                <Input
                  value={editReward}
                  onChange={(e) => setEditReward(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <Button
                  variant="gold"
                  onClick={() => store.updateLoyaltyConfig({
                    stamps_required: parseInt(editStamps) || 10,
                    reward_description: editReward,
                  })}
                >
                  Speichern
                </Button>
                <Button
                  variant={store.loyaltyConfig.is_active ? 'outline' : 'gold'}
                  onClick={() => store.updateLoyaltyConfig({ is_active: !store.loyaltyConfig!.is_active })}
                >
                  {store.loyaltyConfig.is_active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
                </Button>
                <Badge variant={store.loyaltyConfig.is_active ? 'green' : 'red'}>
                  {store.loyaltyConfig.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ NEWSLETTER ═══ */}
      {view === 'newsletter' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>📧 Newsletter Abonnenten</div>

          {/* Stats */}
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.num}>{st.totalSubscribers}</div>
              <div style={s.label}>Gesamt</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#82ca9d' }}>{st.activeSubscribers}</div>
              <div style={s.label}>Aktiv</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#f66' }}>{st.totalSubscribers - st.activeSubscribers}</div>
              <div style={s.label}>Abgemeldet</div>
            </div>
          </div>

          {/* List */}
          {store.subscribers.length === 0 && !store.loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
              Noch keine Abonnenten.
            </div>
          )}

          {store.subscribers.map(sub => (
            <div key={sub.id} style={{ ...s.subRow, opacity: sub.is_active ? 1 : 0.5 }}>
              <div>
                <div style={s.subEmail}>{sub.email}</div>
                <div style={s.subMeta}>
                  {new Date(sub.subscribed_at).toLocaleDateString('de-DE')}
                  {' · '}
                  {sub.source}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge variant={sub.is_active ? 'green' : 'red'}>
                  {sub.is_active ? 'Aktiv' : 'Abgemeldet'}
                </Badge>
                {sub.is_active && (
                  <button
                    onClick={() => store.removeSubscriber(sub.id)}
                    style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--stone)', cursor: 'pointer',
                    }}
                  >
                    Abmelden
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ REFERRAL / EMPFEHLUNGEN ═══ */}
      {view === 'referral' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>🤝 Empfehlungsprogramm</div>

          {/* Stats */}
          <div style={s.grid}>
            <div style={s.card}>
              <div style={s.num}>{st.totalReferrals}</div>
              <div style={s.label}>Gesamt</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#82ca9d' }}>{st.completedReferrals}</div>
              <div style={s.label}>Erfolgreich</div>
            </div>
            <div style={s.card}>
              <div style={{ ...s.num, color: '#C8A84B' }}>{formatEuro(st.totalPayoutCents)}</div>
              <div style={s.label}>Ausgezahlt</div>
            </div>
          </div>

          {/* Config */}
          {store.referralConfig && (
            <div style={s.configCard}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--cream)', marginBottom: 12 }}>
                ⚙️ Einstellungen
              </div>
              <div style={s.configRow}>
                <span style={s.configLabel}>Prämie (€)</span>
                <Input
                  type="number"
                  value={editRefReward}
                  onChange={(e) => setEditRefReward(e.target.value)}
                  style={{ width: 80 }}
                />
              </div>
              <div style={s.configRow}>
                <span style={s.configLabel}>Beschreibung</span>
                <Input
                  value={editRefDesc}
                  onChange={(e) => setEditRefDesc(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                <Button
                  variant="gold"
                  onClick={() => store.updateReferralConfig({
                    reward_cents: Math.round((parseFloat(editRefReward) || 5) * 100),
                    description: editRefDesc,
                  })}
                >
                  Speichern
                </Button>
                <Button
                  variant={store.referralConfig.is_active ? 'outline' : 'gold'}
                  onClick={() => store.updateReferralConfig({ is_active: !store.referralConfig!.is_active })}
                >
                  {store.referralConfig.is_active ? '⏸ Deaktivieren' : '▶ Aktivieren'}
                </Button>
                <Badge variant={store.referralConfig.is_active ? 'green' : 'red'}>
                  {store.referralConfig.is_active ? 'Aktiv' : 'Inaktiv'}
                </Badge>
              </div>
            </div>
          )}

          {/* Referral list */}
          {store.referrals.length === 0 && !store.loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
              Noch keine Empfehlungen.
            </div>
          )}

          {store.referrals.map(ref => (
            <div key={ref.id} style={s.refRow}>
              <div>
                <div style={s.refCode}>{ref.referral_code}</div>
                <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>
                  {new Date(ref.created_at).toLocaleDateString('de-DE')} · {formatEuro(ref.reward_cents)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Badge variant={ref.status === 'completed' ? 'green' : ref.status === 'expired' ? 'red' : 'gold'}>
                  {ref.status === 'completed' ? '✅ Abgeschlossen' : ref.status === 'expired' ? '❌ Abgelaufen' : '⏳ Ausstehend'}
                </Badge>
                {ref.status === 'completed' && !ref.paid_out && (
                  <button
                    onClick={() => store.markReferralPaid(ref.id)}
                    style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10,
                      border: '1px solid #82ca9d', background: 'transparent',
                      color: '#82ca9d', cursor: 'pointer', fontWeight: 700,
                    }}
                  >
                    💰 Auszahlen
                  </button>
                )}
                {ref.paid_out && (
                  <span style={{ fontSize: 10, color: '#82ca9d' }}>✓ Bezahlt</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
