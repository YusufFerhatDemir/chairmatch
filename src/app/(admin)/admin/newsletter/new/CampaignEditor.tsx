'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface CampaignData {
  id: string
  subject: string
  preview_text: string | null
  html_content: string
  audience_filter: Record<string, unknown> | null
  status: string
}

interface Props {
  initial: CampaignData | null
  availableTags: string[]
  defaultTestEmail: string
}

const DEFAULT_BODY = `<h2 style="color:#D4AF37;font-family:Georgia,serif;font-size:24px;margin:0 0 16px">Hallo!</h2>
<p>Willkommen zum neuesten ChairMatch-Newsletter.</p>
<p>Hier kommt dein <strong>spannender Content</strong>. Du kannst HTML verwenden — z.B. Links, fett, kursiv, Listen.</p>
<ul>
  <li>Neue Salons in deiner Nähe</li>
  <li>Aktuelle Angebote</li>
  <li>Beauty-Tipps der Woche</li>
</ul>
<p style="margin-top:24px">
  <a href="https://www.chairmatch.de" style="background:linear-gradient(135deg,#D4AF37,#FCF6BA);color:#1A1000;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;display:inline-block">Jetzt entdecken</a>
</p>
<p>Bis bald,<br/>dein ChairMatch-Team</p>`

export default function CampaignEditor({ initial, availableTags, defaultTestEmail }: Props) {
  const router = useRouter()
  const [id, setId] = useState<string | undefined>(initial?.id)
  const [subject, setSubject] = useState(initial?.subject || '')
  const [previewText, setPreviewText] = useState(initial?.preview_text || '')
  const [html, setHtml] = useState(initial?.html_content || DEFAULT_BODY)
  const audienceInit = (initial?.audience_filter || {}) as { tags?: string[]; source?: string; exclude_tags?: string[] }
  const [tags, setTags] = useState<string[]>(audienceInit.tags || [])
  const [excludeTags, setExcludeTags] = useState<string[]>(audienceInit.exclude_tags || [])
  const [source, setSource] = useState(audienceInit.source || '')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [testEmail, setTestEmail] = useState(defaultTestEmail)
  const [showPreview, setShowPreview] = useState(false)

  const status = initial?.status || 'draft'
  const isLocked = status === 'sent' || status === 'sending'

  const previewSrcDoc = useMemo(() => {
    return `<!DOCTYPE html><html><body style="margin:0;background:#0B0B0F;font-family:-apple-system,sans-serif;color:#F5F5F7">
      <div style="max-width:600px;margin:24px auto;background:#111114;border:1px solid rgba(176,144,96,0.18);border-radius:16px;padding:32px;color:#F5F5F7;font-size:15px;line-height:1.7">
        ${html}
      </div>
    </body></html>`
  }, [html])

  async function save(): Promise<string | null> {
    setSaving(true)
    setMsg(null)
    try {
      const audience: Record<string, unknown> = {}
      if (tags.length > 0) audience.tags = tags
      if (excludeTags.length > 0) audience.exclude_tags = excludeTags
      if (source.trim()) audience.source = source.trim()

      const res = await fetch('/api/admin/newsletter/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          subject,
          preview_text: previewText || null,
          html_content: html,
          audience_filter: audience,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ type: 'error', text: data.error || 'Fehler beim Speichern' })
        return null
      }
      if (data.id && !id) setId(data.id)
      setMsg({ type: 'success', text: 'Gespeichert' })
      return data.id || id || null
    } catch {
      setMsg({ type: 'error', text: 'Netzwerkfehler' })
      return null
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    if (!testEmail) {
      setMsg({ type: 'error', text: 'Test-E-Mail-Adresse fehlt' })
      return
    }
    const campaignId = await save()
    if (!campaignId) return
    setTesting(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.error || 'Test-Versand fehlgeschlagen' })
      } else if (!data.resendActive) {
        setMsg({ type: 'info', text: `Dry-Run: Test-Mail an ${testEmail} wäre gesendet worden (RESEND_API_KEY nicht aktiv).` })
      } else {
        setMsg({ type: 'success', text: `Test-E-Mail an ${testEmail} gesendet` })
      }
    } catch {
      setMsg({ type: 'error', text: 'Netzwerkfehler' })
    } finally {
      setTesting(false)
    }
  }

  async function sendCampaign() {
    if (!confirm(`Wirklich an alle passenden Subscriber senden? Diese Aktion kann nicht rückgängig gemacht werden.`)) return
    const campaignId = await save()
    if (!campaignId) return
    setSending(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/newsletter/campaigns/${campaignId}/send`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setMsg({ type: 'error', text: data.error || 'Versand fehlgeschlagen' })
      } else {
        const dry = data.resendActive ? '' : ' (Dry-Run — RESEND_API_KEY nicht aktiv)'
        setMsg({
          type: 'success',
          text: `Versand abgeschlossen${dry}: ${data.totalSent}/${data.totalRecipients} gesendet${data.totalFailed > 0 ? `, ${data.totalFailed} Fehler` : ''}.`,
        })
        setTimeout(() => router.push('/admin/newsletter'), 2500)
      }
    } catch {
      setMsg({ type: 'error', text: 'Netzwerkfehler' })
    } finally {
      setSending(false)
    }
  }

  function toggleTag(tag: string, list: string[], setList: (t: string[]) => void) {
    if (list.includes(tag)) setList(list.filter(t => t !== tag))
    else setList([...list, tag])
  }

  function addCustomTag(label: string, list: string[], setList: (t: string[]) => void) {
    const t = label.trim()
    if (!t) return
    if (!list.includes(t)) setList([...list, t])
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', margin: 0 }}>
            {id ? 'Kampagne bearbeiten' : 'Neue Kampagne'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--stone)', marginTop: 4 }}>
            Status: <strong style={{ color: 'var(--gold2)' }}>{status}</strong>
          </p>
        </div>
        <Link href="/admin/newsletter" style={{ fontSize: 12, color: 'var(--gold2)', textDecoration: 'none' }}>
          ← Zurück zur Übersicht
        </Link>
      </div>

      {msg && (
        <div style={{
          padding: '12px 16px',
          background: msg.type === 'success' ? 'rgba(74,138,90,0.15)' : msg.type === 'error' ? 'rgba(232,80,64,0.15)' : 'rgba(176,144,96,0.10)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(74,138,90,0.3)' : msg.type === 'error' ? 'rgba(232,80,64,0.3)' : 'rgba(176,144,96,0.3)'}`,
          color: msg.type === 'success' ? '#9DD8A8' : msg.type === 'error' ? '#FBA39A' : 'var(--cream)',
          borderRadius: 10,
          fontSize: 13,
          marginBottom: 16,
        }}>{msg.text}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 20 }}>
        {/* Linke Spalte: Editor */}
        <div>
          <Field label="Betreff *">
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Z.B. Neue Salons in deiner Stadt"
              maxLength={200}
              disabled={isLocked}
              style={inputStyle}
            />
          </Field>

          <Field label="Preview-Text (max. 200 Zeichen)">
            <input
              type="text"
              value={previewText}
              onChange={e => setPreviewText(e.target.value)}
              placeholder="Wird in der Inbox-Vorschau angezeigt"
              maxLength={200}
              disabled={isLocked}
              style={inputStyle}
            />
          </Field>

          <Field label="HTML-Inhalt *">
            <textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              disabled={isLocked}
              style={{ ...inputStyle, minHeight: 360, fontFamily: 'Menlo, ui-monospace, monospace', fontSize: 12, lineHeight: 1.5 }}
            />
            <p style={{ fontSize: 11, color: 'var(--stone2)', marginTop: 4 }}>
              Tipp: Verwende inline-Styles für gute Email-Client-Kompatibilität. Logo, Header und Unsubscribe-Footer werden automatisch hinzugefügt.
            </p>
          </Field>

          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setShowPreview(s => !s)}
              style={outlineBtn}
            >
              {showPreview ? 'Vorschau ausblenden' : 'Vorschau einblenden'}
            </button>
          </div>

          {showPreview && (
            <iframe
              srcDoc={previewSrcDoc}
              style={{
                width: '100%',
                height: 500,
                border: '1px solid rgba(176,144,96,0.18)',
                borderRadius: 14,
                background: '#0B0B0F',
              }}
              title="Vorschau"
            />
          )}
        </div>

        {/* Rechte Spalte: Audience + Actions */}
        <div>
          <div style={cardStyle}>
            <h3 style={subTitle}>Empfänger</h3>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 12 }}>
              Leer = alle aktiven Subscriber. Filter sind kumulativ.
            </p>

            <Field label="Source (optional)">
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="z.B. web, csv_import"
                disabled={isLocked}
                style={inputStyle}
              />
            </Field>

            <Field label="Tags einschließen (OR)">
              <TagPicker
                available={availableTags}
                selected={tags}
                onToggle={(t) => toggleTag(t, tags, setTags)}
                onAdd={(t) => addCustomTag(t, tags, setTags)}
                disabled={isLocked}
              />
            </Field>

            <Field label="Tags ausschließen">
              <TagPicker
                available={availableTags}
                selected={excludeTags}
                onToggle={(t) => toggleTag(t, excludeTags, setExcludeTags)}
                onAdd={(t) => addCustomTag(t, excludeTags, setExcludeTags)}
                disabled={isLocked}
              />
            </Field>
          </div>

          <div style={cardStyle}>
            <h3 style={subTitle}>Test-Versand</h3>
            <Field label="An">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="deine@email.de"
                style={inputStyle}
              />
            </Field>
            <button
              type="button"
              onClick={sendTest}
              disabled={testing || isLocked || !subject || !html}
              style={outlineBtn}
            >
              {testing ? 'Sende Test...' : 'Test-Mail senden'}
            </button>
          </div>

          <div style={cardStyle}>
            <h3 style={subTitle}>Versand</h3>
            <p style={{ fontSize: 12, color: 'var(--stone)', marginBottom: 16, lineHeight: 1.5 }}>
              Sendet an alle aktiven Subscriber, die zu den Filtern passen.
              <br/>Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <button
              type="button"
              onClick={save}
              disabled={saving || isLocked || !subject || !html}
              style={{ ...outlineBtn, marginBottom: 8 }}
            >
              {saving ? 'Speichere...' : 'Entwurf speichern'}
            </button>
            <button
              type="button"
              onClick={sendCampaign}
              disabled={sending || isLocked || !subject || !html}
              style={goldBtn}
            >
              {sending ? 'Sende...' : isLocked ? `Bereits ${status}` : 'Jetzt an alle senden'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── helpers ─── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--c2, #1A1A1F)',
  border: '1px solid rgba(176,144,96,0.18)',
  borderRadius: 10,
  padding: '10px 12px',
  color: 'var(--cream, #F5F5F7)',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--cardbg, #111114)',
  border: '1px solid rgba(176,144,96,0.10)',
  borderRadius: 14,
  padding: 16,
  marginBottom: 16,
}

const subTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--cream)',
  margin: '0 0 12px',
}

const goldBtn: React.CSSProperties = {
  background: 'linear-gradient(135deg, #D4AF37, #FCF6BA)',
  color: '#1A1000',
  padding: '12px 20px',
  borderRadius: 12,
  fontWeight: 700,
  fontSize: 14,
  border: 'none',
  cursor: 'pointer',
  width: '100%',
}

const outlineBtn: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--gold, #B09060)',
  padding: '10px 16px',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 13,
  border: '1px solid rgba(176,144,96,0.30)',
  cursor: 'pointer',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--stone)', letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  )
}

function TagPicker({
  available,
  selected,
  onToggle,
  onAdd,
  disabled,
}: {
  available: string[]
  selected: string[]
  onToggle: (t: string) => void
  onAdd: (t: string) => void
  disabled?: boolean
}) {
  const [input, setInput] = useState('')

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {selected.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => !disabled && onToggle(t)}
            disabled={disabled}
            style={{
              background: 'linear-gradient(135deg,#D4AF37,#FCF6BA)',
              color: '#1A1000',
              padding: '4px 10px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {t} ×
          </button>
        ))}
        {available.filter(t => !selected.includes(t)).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => !disabled && onToggle(t)}
            disabled={disabled}
            style={{
              background: 'transparent',
              color: 'var(--stone)',
              padding: '4px 10px',
              borderRadius: 99,
              fontSize: 11,
              border: '1px solid rgba(176,144,96,0.18)',
              cursor: 'pointer',
            }}
          >
            + {t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              onAdd(input)
              setInput('')
            }
          }}
          disabled={disabled}
          placeholder="Neuen Tag hinzufügen + Enter"
          style={{ ...inputStyle, fontSize: 12, padding: '6px 10px' }}
        />
      </div>
    </div>
  )
}
