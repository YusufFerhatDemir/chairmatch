import { useEffect, useState } from 'react'
import { useWhatsAppStore, type WhatsAppTemplate } from '@/stores/whatsappStore'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

/* ═══ STYLES ═══ */

const s = {
  wrap: { padding: 'var(--pad)' },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: 700 as const,
    fontSize: 16,
    color: 'var(--gold2)',
    marginBottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statsRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
    marginBottom: 16,
  },
  statCard: {
    padding: '8px 14px',
    borderRadius: 10,
    background: 'var(--c2)',
    border: '1px solid var(--border)',
    textAlign: 'center' as const,
    minWidth: 70,
  },
  statNum: { fontSize: 20, fontWeight: 700 as const, color: 'var(--gold2)' },
  statLabel: { fontSize: 10, color: 'var(--stone)', fontWeight: 600 as const, marginTop: 2 },
  tabs: {
    display: 'flex',
    gap: 6,
    marginBottom: 16,
    overflowX: 'auto' as const,
  },
  tab: (active: boolean) => ({
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700 as const,
    cursor: 'pointer' as const,
    border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
    background: active ? 'rgba(200,168,75,0.12)' : 'transparent',
    color: active ? 'var(--gold2)' : 'var(--stone)',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  }),
  card: {
    padding: 14,
    borderBottom: '1px solid var(--border)',
  },
  templateCard: {
    padding: 16,
    background: 'var(--c2)',
    borderRadius: 12,
    marginBottom: 12,
    border: '1px solid var(--border)',
  },
  templateTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  templateKey: {
    fontFamily: 'monospace',
    fontSize: 11,
    color: 'var(--stone)',
    background: 'var(--c3)',
    padding: '2px 6px',
    borderRadius: 4,
  },
  msgRow: {
    display: 'flex',
    gap: 8,
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
    fontSize: 13,
  },
  msgIcon: { fontSize: 16, flexShrink: 0 },
  msgBody: { flex: 1, minWidth: 0 },
  msgPhone: { fontFamily: 'monospace', fontSize: 12, color: 'var(--gold2)' },
  msgText: {
    fontSize: 12,
    color: 'var(--cream)',
    marginTop: 4,
    whiteSpace: 'pre-wrap' as const,
    maxHeight: 60,
    overflow: 'hidden' as const,
  },
  msgMeta: { fontSize: 10, color: 'var(--stone)', marginTop: 4 },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--c1)',
    color: 'var(--cream)',
    fontSize: 13,
    fontFamily: 'monospace',
    minHeight: 80,
    resize: 'vertical' as const,
  },
  label: {
    fontSize: 11,
    color: 'var(--stone)',
    fontWeight: 600 as const,
    marginBottom: 3,
    marginTop: 8,
    display: 'block' as const,
  },
}

const MSG_TYPE_ICONS: Record<string, string> = {
  verification: '🔑',
  booking_confirm: '✅',
  reminder_24h: '🔔',
  reminder_1h: '⏰',
  cancellation: '❌',
  custom: '💬',
  welcome: '👋',
}

const STATUS_COLORS: Record<string, 'green' | 'gold' | 'red'> = {
  sent: 'gold',
  delivered: 'green',
  read: 'green',
  failed: 'red',
  pending: 'gold',
}

const MSG_FILTERS = [
  { value: 'all', label: 'Alle' },
  { value: 'verification', label: '🔑 Verifizierung' },
  { value: 'booking_confirm', label: '✅ Bestätigung' },
  { value: 'reminder_24h', label: '🔔 24h' },
  { value: 'reminder_1h', label: '⏰ 1h' },
  { value: 'cancellation', label: '❌ Storno' },
  { value: 'custom', label: '💬 Sonstige' },
]

/* ═══ TEMPLATE EDITOR ═══ */

function TemplateEditor({
  template,
  onSave,
  onToggle,
}: {
  template: WhatsAppTemplate
  onSave: (id: string, body: string) => void
  onToggle: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(template.body_template)

  return (
    <div style={{ ...s.templateCard, opacity: template.is_active ? 1 : 0.5 }}>
      <div style={s.templateTitle}>
        <div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--cream)' }}>
            {MSG_TYPE_ICONS[template.template_key] || '📝'} {template.title}
          </span>
          <span style={{ ...s.templateKey, marginLeft: 8 }}>{template.template_key}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <Badge variant={template.is_active ? 'green' : 'red'}>
            {template.is_active ? 'Aktiv' : 'Inaktiv'}
          </Badge>
          <button
            onClick={() => onToggle(template.id)}
            style={{
              padding: '3px 6px', borderRadius: 6, fontSize: 11,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--stone)', cursor: 'pointer',
            }}
          >
            {template.is_active ? '⏸' : '▶'}
          </button>
        </div>
      </div>

      {template.description && (
        <div style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 8 }}>
          {template.description}
        </div>
      )}

      {editing ? (
        <>
          <textarea
            style={s.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div style={{ fontSize: 10, color: 'var(--stone)', marginTop: 4 }}>
            Verfügbare Variablen: {'{{code}}'} {'{{salon}}'} {'{{date}}'} {'{{time}}'} {'{{service}}'} {'{{price}}'} {'{{name}}'} {'{{address}}'}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button variant="gold" onClick={() => { onSave(template.id, body); setEditing(false) }}>
              Speichern
            </Button>
            <Button variant="ghost" onClick={() => { setBody(template.body_template); setEditing(false) }}>
              Abbrechen
            </Button>
          </div>
        </>
      ) : (
        <>
          <div style={{
            ...s.textarea,
            minHeight: 'auto',
            whiteSpace: 'pre-wrap',
            cursor: 'pointer',
            opacity: 0.9,
          }} onClick={() => setEditing(true)}>
            {template.body_template}
          </div>
          <div style={{ fontSize: 10, color: 'var(--stone)', marginTop: 4 }}>
            Klicken zum Bearbeiten
          </div>
        </>
      )}
    </div>
  )
}

/* ═══ MAIN COMPONENT ═══ */

export function WhatsAppTab() {
  const store = useWhatsAppStore()
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<'messages' | 'templates'>('messages')

  useEffect(() => {
    if (!loaded) {
      store.loadMessages()
      store.loadTemplates()
      setLoaded(true)
    }
  }, [loaded])

  const filtered = store.getFilteredMessages()
  const stats = store.getStats()

  const handleSaveTemplate = async (id: string, body: string) => {
    await store.updateTemplate(id, { body_template: body })
  }

  return (
    <div style={s.wrap}>
      {/* Stats */}
      <div style={s.statsRow}>
        <div style={s.statCard}>
          <div style={s.statNum}>{stats.total}</div>
          <div style={s.statLabel}>Gesamt</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#82ca9d' }}>{stats.sent}</div>
          <div style={s.statLabel}>Gesendet</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#7EC8E3' }}>{stats.delivered}</div>
          <div style={s.statLabel}>Zugestellt</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#6ABF80' }}>{stats.read}</div>
          <div style={s.statLabel}>Gelesen</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: '#f66' }}>{stats.failed}</div>
          <div style={s.statLabel}>Fehler</div>
        </div>
        <div style={s.statCard}>
          <div style={{ ...s.statNum, color: 'var(--stone)' }}>{stats.pending}</div>
          <div style={s.statLabel}>Wartend</div>
        </div>
      </div>

      {/* View Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Button
          variant={view === 'messages' ? 'gold' : 'outline'}
          onClick={() => setView('messages')}
        >
          📨 Nachrichten
        </Button>
        <Button
          variant={view === 'templates' ? 'gold' : 'outline'}
          onClick={() => setView('templates')}
        >
          📝 Vorlagen
        </Button>
      </div>

      {/* Error */}
      {store.error && (
        <div style={{
          color: '#f66', fontSize: 13, marginBottom: 8, padding: 8,
          background: 'rgba(220,50,50,0.1)', borderRadius: 8,
        }}>
          ⚠️ {store.error}
        </div>
      )}

      {/* Loading */}
      {store.loading && (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>Lade...</div>
      )}

      {/* ═══ MESSAGES VIEW ═══ */}
      {view === 'messages' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>📨 Nachrichtenprotokoll</div>

          {/* Filter */}
          <div style={s.tabs}>
            {MSG_FILTERS.map((f) => (
              <button
                key={f.value}
                style={s.tab(store.messageFilter === f.value)}
                onClick={() => store.setMessageFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Message List */}
          {!store.loading && filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
              Keine Nachrichten vorhanden.
            </div>
          )}

          {filtered.map((msg) => (
            <div key={msg.id} style={s.msgRow}>
              <div style={s.msgIcon}>
                {MSG_TYPE_ICONS[msg.message_type] || '📝'}
              </div>
              <div style={s.msgBody}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={s.msgPhone}>{msg.phone}</span>
                  <Badge variant={STATUS_COLORS[msg.status] || 'gold'}>
                    {msg.status}
                  </Badge>
                </div>
                <div style={s.msgText}>{msg.message_text}</div>
                <div style={s.msgMeta}>
                  {new Date(msg.created_at).toLocaleString('de-DE', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                  {msg.error_details && (
                    <span style={{ color: '#f66', marginLeft: 8 }}>
                      Fehler: {msg.error_details.slice(0, 60)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ TEMPLATES VIEW ═══ */}
      {view === 'templates' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>📝 Nachrichtenvorlagen</div>
          <div style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16 }}>
            Bearbeiten Sie die WhatsApp-Nachrichtenvorlagen. Verwenden Sie {'{{variablen}}'} als Platzhalter.
          </div>

          {store.templates.map((tmpl) => (
            <TemplateEditor
              key={tmpl.id}
              template={tmpl}
              onSave={handleSaveTemplate}
              onToggle={(id) => store.toggleTemplateActive(id)}
            />
          ))}

          {store.templates.length === 0 && !store.loading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--stone)' }}>
              Keine Vorlagen vorhanden.
            </div>
          )}
        </div>
      )}

      {/* API Status */}
      <div style={{
        padding: 12,
        background: 'var(--c2)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        marginTop: 16,
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold2)', marginBottom: 6 }}>
          🔧 WhatsApp API Status
        </div>
        <div style={{ fontSize: 11, color: 'var(--stone)' }}>
          Die WhatsApp Business API benötigt einen Meta Business Account und API-Token.
          Konfigurieren Sie <span style={{ fontFamily: 'monospace' }}>WHATSAPP_TOKEN</span> und{' '}
          <span style={{ fontFamily: 'monospace' }}>WHATSAPP_PHONE_ID</span> in den Supabase Edge Function Secrets.
        </div>
        <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 4 }}>
          Im Dev-Modus werden Nachrichten protokolliert, aber nicht tatsächlich über WhatsApp gesendet.
        </div>
      </div>
    </div>
  )
}
