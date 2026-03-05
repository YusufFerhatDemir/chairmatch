import { useState, useEffect, useCallback } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useCategoryStore, type Category } from '@/stores/categoryStore'
import { useOnboardingStore, type OnboardingSlide } from '@/stores/onboardingStore'
import { BenutzerTab } from '@/views/admin/BenutzerTab'
import { AnbieterTab } from '@/views/admin/AnbieterTab'
import { VorlagenTab } from '@/views/admin/VorlagenTab'
import { PromoCodesTab } from '@/views/admin/PromoCodesTab'
import { WhatsAppTab } from '@/views/admin/WhatsAppTab'
import { StatistikTab } from '@/views/admin/StatistikTab'
import { BuchungenTab } from '@/views/admin/BuchungenTab'
import { ExtrasTab } from '@/views/admin/ExtrasTab'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { t } from '@/i18n'

/* ═══ HELPERS ═══ */

const autoSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[äöüß]/g, (m) => ({ ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[m] || m))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

type AdminTab = 'kategorien' | 'onboarding' | 'anbieter' | 'buchungen' | 'extras' | 'vorlagen' | 'promocodes' | 'whatsapp' | 'statistik' | 'benutzer'

const ADMIN_TABS: { key: AdminTab; label: string; icon: string; superOnly?: boolean }[] = [
  { key: 'kategorien', label: 'Kategorien', icon: '🗂' },
  { key: 'onboarding', label: 'Onboarding', icon: '🎬' },
  { key: 'anbieter', label: 'Anbieter', icon: '👤' },
  { key: 'buchungen', label: 'Buchungen', icon: '📅' },
  { key: 'extras', label: 'Extras', icon: '⭐' },
  { key: 'vorlagen', label: 'Vorlagen', icon: '📋' },
  { key: 'promocodes', label: 'Promo Codes', icon: '🎫' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', superOnly: true },
  { key: 'statistik', label: 'Statistik', icon: '📊', superOnly: true },
  { key: 'benutzer', label: 'Benutzer', icon: '👥', superOnly: true },
]

interface CategoryFormData {
  label: string
  slug: string
  description: string
  icon_url: string
  sort_order: number
  is_active: boolean
}

const EMPTY_FORM: CategoryFormData = {
  label: '',
  slug: '',
  description: '',
  icon_url: '',
  sort_order: 0,
  is_active: true,
}

/* ═══ INLINE STYLES ═══ */

const styles = {
  tabBar: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto' as const,
    padding: '12px var(--pad)',
    borderBottom: '1px solid var(--border)',
    scrollbarWidth: 'none' as const,
    msOverflowStyle: 'none' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  tab: (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: 10,
    fontSize: 'var(--font-sm)' as const,
    fontWeight: 700 as const,
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer' as const,
    border: active ? '1.5px solid var(--gold)' : '1.5px solid var(--border)',
    background: active ? 'rgba(200, 168, 75, 0.12)' : 'transparent',
    color: active ? 'var(--gold2)' : 'var(--stone)',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  }),
  catItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottom: '1px solid var(--border)',
  },
  catThumb: (url: string | null) => ({
    width: 48,
    height: 72,
    borderRadius: 10,
    background: url ? 'transparent' : 'var(--c3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden' as const,
    border: '1px solid var(--border)',
    fontSize: 24,
    color: 'var(--stone)',
  }),
  catInfo: {
    flex: 1,
    minWidth: 0,
  },
  catLabel: {
    fontWeight: 700 as const,
    fontSize: 'var(--font-md)' as const,
    color: 'var(--cream)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  catDesc: {
    fontSize: 'var(--font-xs)' as const,
    color: 'var(--stone)',
    marginTop: 2,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
  },
  catActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: (color?: string) => ({
    width: 36,
    height: 36,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    cursor: 'pointer' as const,
    color: color || 'var(--stone)',
    background: 'var(--c3)',
    border: '1px solid var(--border)',
    transition: 'background 0.15s, color 0.15s',
    flexShrink: 0,
  }),
  formSection: {
    padding: '20px var(--pad)',
    background: 'var(--c2)',
    borderBottom: '1px solid var(--border)',
  },
  formGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 14,
  },
  formRow: {
    display: 'flex',
    gap: 10,
  },
  formBtns: {
    display: 'flex',
    gap: 10,
    marginTop: 6,
  },
  deleteConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: 'rgba(232, 80, 64, 0.08)',
    borderRadius: 10,
    border: '1px solid rgba(232, 80, 64, 0.2)',
    fontSize: 'var(--font-sm)' as const,
    color: '#F07060',
  },
  sortBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: 'var(--c4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--font-xs)' as const,
    fontWeight: 800 as const,
    color: 'var(--stone)',
    flexShrink: 0,
  },
  arrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    cursor: 'pointer' as const,
    color: 'var(--stone)',
    background: 'var(--c3)',
    border: '1px solid var(--border)',
    transition: 'color 0.15s',
    flexShrink: 0,
  },
  placeholder: {
    padding: 40,
    textAlign: 'center' as const,
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  placeholderText: {
    color: 'var(--stone)',
    fontSize: 'var(--font-md)' as const,
  },
  errorBar: {
    padding: '10px var(--pad)',
    background: 'rgba(232, 80, 64, 0.1)',
    color: '#F07060',
    fontSize: 'var(--font-sm)' as const,
    fontWeight: 600 as const,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px var(--pad)',
    borderBottom: '1px solid var(--border)',
  },
} as const

/* ═══ CATEGORY FORM COMPONENT ═══ */

function CategoryForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: CategoryFormData
  onSave: (data: CategoryFormData) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<CategoryFormData>(initial)
  const [slugManual, setSlugManual] = useState(false)

  const updateField = <K extends keyof CategoryFormData>(key: K, val: CategoryFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val }
      if (key === 'label' && !slugManual) {
        next.slug = autoSlug(val as string)
      }
      return next
    })
  }

  const handleSlugChange = (val: string) => {
    setSlugManual(true)
    setForm((prev) => ({ ...prev, slug: autoSlug(val) }))
  }

  const canSubmit = form.label.trim().length > 0 && form.slug.trim().length > 0

  return (
    <div style={styles.formSection}>
      <div style={styles.formGrid}>
        <Input
          label="Label *"
          placeholder="z.B. Friseur"
          value={form.label}
          onChange={(e) => updateField('label', e.target.value)}
          autoFocus
        />
        <Input
          label="Slug"
          placeholder="z.B. friseur"
          value={form.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
        />
        <Input
          label="Beschreibung"
          placeholder="Kurze Beschreibung der Kategorie"
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
        />
        <div style={styles.formRow}>
          <div style={{ flex: 1 }}>
            <Input
              label="Icon URL"
              placeholder="/icons/myicon.png"
              value={form.icon_url}
              onChange={(e) => updateField('icon_url', e.target.value)}
            />
          </div>
          <div style={{ width: 100 }}>
            <Input
              label="Reihenfolge"
              type="number"
              min={0}
              value={String(form.sort_order)}
              onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
        <Switch
          checked={form.is_active}
          onChange={(v) => updateField('is_active', v)}
          label="Aktiv"
        />
        {form.icon_url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Vorschau:</span>
            <div
              style={{
                width: 48,
                height: 72,
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--c3)',
              }}
            >
              <img
                src={form.icon_url}
                alt="Icon Vorschau"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          </div>
        )}
        <div style={styles.formBtns}>
          <Button
            variant="gold"
            fullWidth
            onClick={() => onSave(form)}
            disabled={!canSubmit}
            loading={saving}
          >
            Speichern
          </Button>
          <Button variant="outline" fullWidth onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══ CATEGORY ITEM COMPONENT ═══ */

function CategoryItem({
  cat,
  onEdit,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  confirmDeleteId,
  setConfirmDeleteId,
}: {
  cat: Category
  onEdit: (cat: Category) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (cat: Category) => void
  onMoveDown: (cat: Category) => void
  isFirst: boolean
  isLast: boolean
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
}) {
  const isDeleting = confirmDeleteId === cat.id

  return (
    <div>
      <div style={styles.catItem}>
        {/* Thumbnail */}
        <div style={styles.catThumb(cat.icon_url)}>
          {cat.icon_url ? (
            <img
              src={cat.icon_url}
              alt={cat.label}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
                ;(e.target as HTMLImageElement).parentElement!.textContent = '🖼'
              }}
            />
          ) : (
            '🖼'
          )}
        </div>

        {/* Info */}
        <div style={styles.catInfo}>
          <div style={styles.catLabel}>{cat.label}</div>
          {cat.description && <div style={styles.catDesc}>{cat.description}</div>}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge variant={cat.is_active ? 'green' : 'red'}>
              {cat.is_active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone2)' }}>
              /{cat.slug}
            </span>
          </div>
        </div>

        {/* Sort Order + Arrows */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            marginRight: 4,
          }}
        >
          <button
            style={styles.arrowBtn}
            onClick={() => onMoveUp(cat)}
            disabled={isFirst}
            aria-label="Nach oben"
            title="Nach oben"
          >
            ▲
          </button>
          <div style={styles.sortBadge}>{cat.sort_order}</div>
          <button
            style={styles.arrowBtn}
            onClick={() => onMoveDown(cat)}
            disabled={isLast}
            aria-label="Nach unten"
            title="Nach unten"
          >
            ▼
          </button>
        </div>

        {/* Action Buttons */}
        <div style={styles.catActions}>
          <button
            style={styles.iconBtn('var(--gold2)')}
            onClick={() => onEdit(cat)}
            aria-label="Bearbeiten"
            title="Bearbeiten"
          >
            ✏️
          </button>
          <button
            style={styles.iconBtn(cat.is_active ? 'var(--green)' : 'var(--stone)')}
            onClick={() => onToggle(cat.id)}
            aria-label={cat.is_active ? 'Deaktivieren' : 'Aktivieren'}
            title={cat.is_active ? 'Deaktivieren' : 'Aktivieren'}
          >
            {cat.is_active ? '👁' : '👁‍🗨'}
          </button>
          <button
            style={styles.iconBtn('var(--red)')}
            onClick={() => setConfirmDeleteId(cat.id)}
            aria-label="Löschen"
            title="Löschen"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {isDeleting && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={styles.deleteConfirm}>
            <span style={{ flex: 1 }}>
              Wirklich <strong>{cat.label}</strong> löschen?
            </span>
            <button
              className="bgold"
              style={{
                padding: '6px 14px',
                fontSize: 'var(--font-xs)',
                minHeight: 32,
                width: 'auto',
                background: 'var(--red)',
                boxShadow: 'none',
              }}
              onClick={() => onDelete(cat.id)}
            >
              Ja
            </button>
            <button
              className="boutline"
              style={{
                padding: '6px 14px',
                fontSize: 'var(--font-xs)',
                minHeight: 32,
                width: 'auto',
              }}
              onClick={() => setConfirmDeleteId(null)}
            >
              Nein
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ KATEGORIEN TAB ═══ */

function KategorienTab() {
  const { categories, loading, error, loadCategories, addCategory, updateCategory, deleteCategory, toggleActive, reorder } =
    useCategoryStore()

  const [showForm, setShowForm] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)

  const handleAdd = () => {
    setEditingCat(null)
    const maxOrder = sorted.length > 0 ? Math.max(...sorted.map((c) => c.sort_order)) : 0
    setShowForm(true)
    EMPTY_FORM.sort_order = maxOrder + 1
  }

  const handleEdit = (cat: Category) => {
    setEditingCat(cat)
    setShowForm(true)
    setConfirmDeleteId(null)
  }

  const handleSave = async (data: CategoryFormData) => {
    setSaving(true)
    let ok: boolean
    if (editingCat) {
      ok = await updateCategory(editingCat.id, {
        label: data.label,
        slug: data.slug,
        description: data.description || null,
        icon_url: data.icon_url || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
    } else {
      ok = await addCategory({
        label: data.label,
        slug: data.slug,
        description: data.description || null,
        icon_url: data.icon_url || null,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
    }
    setSaving(false)
    if (ok) {
      setShowForm(false)
      setEditingCat(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingCat(null)
  }

  const handleDelete = async (id: string) => {
    await deleteCategory(id)
    setConfirmDeleteId(null)
  }

  const handleToggle = async (id: string) => {
    await toggleActive(id)
  }

  const handleMoveUp = useCallback(
    async (cat: Category) => {
      const idx = sorted.findIndex((c) => c.id === cat.id)
      if (idx <= 0) return
      const prev = sorted[idx - 1]
      await reorder(cat.id, prev.sort_order)
      await reorder(prev.id, cat.sort_order)
    },
    [sorted, reorder],
  )

  const handleMoveDown = useCallback(
    async (cat: Category) => {
      const idx = sorted.findIndex((c) => c.id === cat.id)
      if (idx < 0 || idx >= sorted.length - 1) return
      const next = sorted[idx + 1]
      await reorder(cat.id, next.sort_order)
      await reorder(next.id, cat.sort_order)
    },
    [sorted, reorder],
  )

  const formInitial: CategoryFormData = editingCat
    ? {
        label: editingCat.label,
        slug: editingCat.slug,
        description: editingCat.description || '',
        icon_url: editingCat.icon_url || '',
        sort_order: editingCat.sort_order,
        is_active: editingCat.is_active,
      }
    : { ...EMPTY_FORM }

  return (
    <div>
      {/* Error Bar */}
      {error && (
        <div style={styles.errorBar}>
          <span>Fehler: {error}</span>
        </div>
      )}

      {/* Top Bar with Add Button */}
      <div style={styles.topBar}>
        <div>
          <span className="lgold" style={{ letterSpacing: '0.1em' }}>
            KATEGORIEN
          </span>
          <span
            style={{
              marginLeft: 8,
              fontSize: 'var(--font-xs)',
              color: 'var(--stone)',
            }}
          >
            ({categories.length})
          </span>
        </div>
        <Button
          variant="gold"
          fullWidth={false}
          onClick={handleAdd}
          style={{ padding: '8px 16px', fontSize: 'var(--font-sm)', minHeight: 36 }}
        >
          + Neue Kategorie
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <CategoryForm
          key={editingCat?.id || 'new'}
          initial={formInitial}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Loading State */}
      {loading && categories.length === 0 && (
        <div style={styles.placeholder}>
          <div style={{ ...styles.placeholderIcon, animation: 'pulse 1.5s infinite' }}>...</div>
          <p style={styles.placeholderText}>Kategorien werden geladen...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && categories.length === 0 && (
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}>🗂</div>
          <p style={styles.placeholderText}>Noch keine Kategorien vorhanden.</p>
          <p style={{ ...styles.placeholderText, fontSize: 'var(--font-xs)', marginTop: 6 }}>
            Erstelle deine erste Kategorie mit dem Button oben.
          </p>
        </div>
      )}

      {/* Category List */}
      {sorted.length > 0 && (
        <div className="card" style={{ margin: 'var(--pad)', overflow: 'hidden' }}>
          {sorted.map((cat, i) => (
            <CategoryItem
              key={cat.id}
              cat={cat}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══ ONBOARDING SLIDE FORM ═══ */

interface SlideFormData {
  title: string
  subtitle: string
  image_url: string
  sort_order: number
  is_active: boolean
}

const EMPTY_SLIDE_FORM: SlideFormData = {
  title: '',
  subtitle: '',
  image_url: '',
  sort_order: 0,
  is_active: true,
}

function OnboardingSlideForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: SlideFormData
  onSave: (data: SlideFormData, imageFile?: File) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<SlideFormData>(initial)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(initial.image_url || null)

  const updateField = <K extends keyof SlideFormData>(key: K, val: SlideFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = () => setPreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const canSubmit = form.title.trim().length > 0

  return (
    <div style={styles.formSection}>
      <div style={styles.formGrid}>
        <Input
          label="Titel *"
          placeholder="z.B. Willkommen bei ChairMatch"
          value={form.title}
          onChange={(e) => updateField('title', e.target.value)}
          autoFocus
        />
        <Input
          label="Untertitel"
          placeholder="Beschreibung der Folie"
          value={form.subtitle}
          onChange={(e) => updateField('subtitle', e.target.value)}
        />
        <div>
          <label style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)', display: 'block', marginBottom: 6 }}>
            Bild hochladen
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{
              fontSize: 'var(--font-sm)',
              color: 'var(--cream)',
              background: 'var(--c3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              width: '100%',
              cursor: 'pointer',
            }}
          />
        </div>
        {!imageFile && (
          <Input
            label="Oder Bild-URL"
            placeholder="https://... oder /icons/..."
            value={form.image_url}
            onChange={(e) => {
              updateField('image_url', e.target.value)
              setPreview(e.target.value || null)
            }}
          />
        )}
        <div style={styles.formRow}>
          <div style={{ width: 120 }}>
            <Input
              label="Reihenfolge"
              type="number"
              min={0}
              value={String(form.sort_order)}
              onChange={(e) => updateField('sort_order', parseInt(e.target.value) || 0)}
            />
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <Switch
              checked={form.is_active}
              onChange={(v) => updateField('is_active', v)}
              label="Aktiv"
            />
          </div>
        </div>
        {preview && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>Vorschau:</span>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                background: 'var(--c3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={preview}
                alt="Vorschau"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          </div>
        )}
        <div style={styles.formBtns}>
          <Button
            variant="gold"
            fullWidth
            onClick={() => onSave(form, imageFile || undefined)}
            disabled={!canSubmit}
            loading={saving}
          >
            Speichern
          </Button>
          <Button variant="outline" fullWidth onClick={onCancel}>
            Abbrechen
          </Button>
        </div>
      </div>
    </div>
  )
}

/* ═══ ONBOARDING SLIDE ITEM ═══ */

function OnboardingSlideItem({
  slide,
  onEdit,
  onToggle,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  confirmDeleteId,
  setConfirmDeleteId,
}: {
  slide: OnboardingSlide
  onEdit: (slide: OnboardingSlide) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onMoveUp: (slide: OnboardingSlide) => void
  onMoveDown: (slide: OnboardingSlide) => void
  isFirst: boolean
  isLast: boolean
  confirmDeleteId: string | null
  setConfirmDeleteId: (id: string | null) => void
}) {
  const isDeleting = confirmDeleteId === slide.id

  return (
    <div>
      <div style={styles.catItem}>
        {/* Thumbnail */}
        <div style={{ ...styles.catThumb(slide.image_url), width: 64, height: 64, borderRadius: 12 }}>
          {slide.image_url ? (
            <img
              src={slide.image_url}
              alt={slide.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
                ;(e.target as HTMLImageElement).parentElement!.textContent = '🖼'
              }}
            />
          ) : (
            '🎬'
          )}
        </div>

        {/* Info */}
        <div style={styles.catInfo}>
          <div style={styles.catLabel}>{slide.title}</div>
          {slide.subtitle && <div style={styles.catDesc}>{slide.subtitle}</div>}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge variant={slide.is_active ? 'green' : 'red'}>
              {slide.is_active ? 'Aktiv' : 'Inaktiv'}
            </Badge>
          </div>
        </div>

        {/* Sort Order + Arrows */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            marginRight: 4,
          }}
        >
          <button
            style={styles.arrowBtn}
            onClick={() => onMoveUp(slide)}
            disabled={isFirst}
            aria-label="Nach oben"
            title="Nach oben"
          >
            ▲
          </button>
          <div style={styles.sortBadge}>{slide.sort_order}</div>
          <button
            style={styles.arrowBtn}
            onClick={() => onMoveDown(slide)}
            disabled={isLast}
            aria-label="Nach unten"
            title="Nach unten"
          >
            ▼
          </button>
        </div>

        {/* Action Buttons */}
        <div style={styles.catActions}>
          {slide.image_url && (
            <a
              href={slide.image_url}
              target="_blank"
              rel="noopener noreferrer"
              download
              style={{ ...styles.iconBtn('var(--stone)'), textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Bild herunterladen"
            >
              ⬇
            </a>
          )}
          <button
            style={styles.iconBtn('var(--gold2)')}
            onClick={() => onEdit(slide)}
            aria-label="Bearbeiten"
            title="Bearbeiten"
          >
            ✏️
          </button>
          <button
            style={styles.iconBtn(slide.is_active ? 'var(--green)' : 'var(--stone)')}
            onClick={() => onToggle(slide.id)}
            aria-label={slide.is_active ? 'Deaktivieren' : 'Aktivieren'}
            title={slide.is_active ? 'Deaktivieren' : 'Aktivieren'}
          >
            {slide.is_active ? '👁' : '👁‍🗨'}
          </button>
          <button
            style={styles.iconBtn('var(--red)')}
            onClick={() => setConfirmDeleteId(slide.id)}
            aria-label="Löschen"
            title="Löschen"
          >
            🗑
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      {isDeleting && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={styles.deleteConfirm}>
            <span style={{ flex: 1 }}>
              Wirklich <strong>{slide.title}</strong> löschen?
            </span>
            <button
              className="bgold"
              style={{
                padding: '6px 14px',
                fontSize: 'var(--font-xs)',
                minHeight: 32,
                width: 'auto',
                background: 'var(--red)',
                boxShadow: 'none',
              }}
              onClick={() => onDelete(slide.id)}
            >
              Ja
            </button>
            <button
              className="boutline"
              style={{
                padding: '6px 14px',
                fontSize: 'var(--font-xs)',
                minHeight: 32,
                width: 'auto',
              }}
              onClick={() => setConfirmDeleteId(null)}
            >
              Nein
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══ ONBOARDING TAB ═══ */

function OnboardingTab() {
  const { slides, loading, error, loadSlides, addSlide, updateSlide, deleteSlide, toggleActive, reorder, uploadImage, deleteImage } =
    useOnboardingStore()

  const [showForm, setShowForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<OnboardingSlide | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSlides()
  }, [loadSlides])

  const sorted = [...slides].sort((a, b) => a.sort_order - b.sort_order)

  const handleAdd = () => {
    setEditingSlide(null)
    const maxOrder = sorted.length > 0 ? Math.max(...sorted.map((s) => s.sort_order)) : 0
    EMPTY_SLIDE_FORM.sort_order = maxOrder + 1
    setShowForm(true)
  }

  const handleEdit = (slide: OnboardingSlide) => {
    setEditingSlide(slide)
    setShowForm(true)
    setConfirmDeleteId(null)
  }

  const handleSave = async (data: SlideFormData, imageFile?: File) => {
    setSaving(true)
    let imageUrl = data.image_url || null

    // Upload image if file provided
    if (imageFile) {
      const url = await uploadImage(imageFile)
      if (url) {
        imageUrl = url
        // Delete old image if replacing
        if (editingSlide?.image_url && editingSlide.image_url.includes('onboarding-images')) {
          await deleteImage(editingSlide.image_url)
        }
      }
    }

    let ok: boolean
    if (editingSlide) {
      ok = await updateSlide(editingSlide.id, {
        title: data.title,
        subtitle: data.subtitle || '',
        image_url: imageUrl,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
    } else {
      ok = await addSlide({
        title: data.title,
        subtitle: data.subtitle || '',
        image_url: imageUrl,
        sort_order: data.sort_order,
        is_active: data.is_active,
      })
    }
    setSaving(false)
    if (ok) {
      setShowForm(false)
      setEditingSlide(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingSlide(null)
  }

  const handleDelete = async (id: string) => {
    const slide = slides.find(s => s.id === id)
    if (slide?.image_url && slide.image_url.includes('onboarding-images')) {
      await deleteImage(slide.image_url)
    }
    await deleteSlide(id)
    setConfirmDeleteId(null)
  }

  const handleToggle = async (id: string) => {
    await toggleActive(id)
  }

  const handleMoveUp = useCallback(
    async (slide: OnboardingSlide) => {
      const idx = sorted.findIndex((s) => s.id === slide.id)
      if (idx <= 0) return
      const prev = sorted[idx - 1]
      await reorder(slide.id, prev.sort_order)
      await reorder(prev.id, slide.sort_order)
    },
    [sorted, reorder],
  )

  const handleMoveDown = useCallback(
    async (slide: OnboardingSlide) => {
      const idx = sorted.findIndex((s) => s.id === slide.id)
      if (idx < 0 || idx >= sorted.length - 1) return
      const next = sorted[idx + 1]
      await reorder(slide.id, next.sort_order)
      await reorder(next.id, slide.sort_order)
    },
    [sorted, reorder],
  )

  const formInitial: SlideFormData = editingSlide
    ? {
        title: editingSlide.title,
        subtitle: editingSlide.subtitle || '',
        image_url: editingSlide.image_url || '',
        sort_order: editingSlide.sort_order,
        is_active: editingSlide.is_active,
      }
    : { ...EMPTY_SLIDE_FORM }

  return (
    <div>
      {/* Error Bar */}
      {error && (
        <div style={styles.errorBar}>
          <span>Fehler: {error}</span>
        </div>
      )}

      {/* Top Bar with Add Button */}
      <div style={styles.topBar}>
        <div>
          <span className="lgold" style={{ letterSpacing: '0.1em' }}>
            ONBOARDING FOLIEN
          </span>
          <span
            style={{
              marginLeft: 8,
              fontSize: 'var(--font-xs)',
              color: 'var(--stone)',
            }}
          >
            ({slides.length})
          </span>
        </div>
        <Button
          variant="gold"
          fullWidth={false}
          onClick={handleAdd}
          style={{ padding: '8px 16px', fontSize: 'var(--font-sm)', minHeight: 36 }}
        >
          + Neue Folie
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <OnboardingSlideForm
          key={editingSlide?.id || 'new'}
          initial={formInitial}
          onSave={handleSave}
          onCancel={handleCancel}
          saving={saving}
        />
      )}

      {/* Loading State */}
      {loading && slides.length === 0 && (
        <div style={styles.placeholder}>
          <div style={{ ...styles.placeholderIcon, animation: 'pulse 1.5s infinite' }}>...</div>
          <p style={styles.placeholderText}>Folien werden geladen...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && slides.length === 0 && (
        <div style={styles.placeholder}>
          <div style={styles.placeholderIcon}>🎬</div>
          <p style={styles.placeholderText}>Noch keine Onboarding-Folien vorhanden.</p>
          <p style={{ ...styles.placeholderText, fontSize: 'var(--font-xs)', marginTop: 6 }}>
            Erstelle deine erste Folie mit dem Button oben.
          </p>
        </div>
      )}

      {/* Slide List */}
      {sorted.length > 0 && (
        <div className="card" style={{ margin: 'var(--pad)', overflow: 'hidden' }}>
          {sorted.map((slide, i) => (
            <OnboardingSlideItem
              key={slide.id}
              slide={slide}
              onEdit={handleEdit}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              confirmDeleteId={confirmDeleteId}
              setConfirmDeleteId={setConfirmDeleteId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══ PLACEHOLDER TABS ═══ */

function PlaceholderTab({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ padding: 'var(--pad)' }}>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>{icon}</div>
        <div style={{ fontWeight: 700, fontSize: 'var(--font-lg)', marginBottom: 8 }}>{title}</div>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)' }}>{desc}</p>
      </div>
    </div>
  )
}

/* ═══ PROVIDER DASHBOARD (for anbieter role) ═══ */

function ProviderView() {
  return (
    <div style={{ padding: 'var(--pad)' }}>
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>💈</div>
        <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700, marginBottom: 8 }}>
          Salon-Verwaltung
        </div>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-md)', lineHeight: 1.5 }}>
          Hier kannst du bald deinen Salon verwalten, Angebote erstellen und Buchungen einsehen.
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div className="lgold" style={{ marginBottom: 12 }}>DEINE SERVICES</div>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>
          Service-Verwaltung kommt bald...
        </p>
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 12 }}>
        <div className="lgold" style={{ marginBottom: 12 }}>BUCHUNGEN</div>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>
          Buchungsübersicht kommt bald...
        </p>
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div className="lgold" style={{ marginBottom: 12 }}>STATISTIKEN</div>
        <p style={{ color: 'var(--stone)', fontSize: 'var(--font-sm)' }}>
          Umsatz & Statistiken kommen bald...
        </p>
      </div>
    </div>
  )
}

/* ═══ MAIN PAGE COMPONENT ═══ */

export function ProviderDashboardPage() {
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const [activeTab, setActiveTab] = useState<AdminTab>('kategorien')

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'admin' || isSuperAdmin
  const isProvider = profile?.role === 'anbieter'

  /* ─── Access denied ─── */
  if (!isAdmin && !isProvider) {
    return (
      <div style={{ padding: 'var(--pad)', textAlign: 'center', paddingTop: 60 }}>
        <Helmet>
          <title>Dashboard | ChairMatch</title>
          <meta name="description" content="Verwalte deinen Salon und deine Buchungen." />
          <link rel="canonical" href="https://chairmatch.de/provider" />
        </Helmet>
        <p style={{ color: 'var(--stone)' }}>{t('provider_only')}</p>
        <Button
          variant="outline"
          onClick={() => navigate('/account')}
          style={{ marginTop: 16 }}
        >
          {t('back')}
        </Button>
      </div>
    )
  }

  /* ─── Provider view (non-admin) ─── */
  if (isProvider && !isAdmin) {
    return (
      <div>
        <Helmet>
          <title>Anbieter Dashboard | ChairMatch</title>
          <meta name="description" content="Verwalte deinen Salon und deine Buchungen." />
          <link rel="canonical" href="https://chairmatch.de/provider" />
        </Helmet>
        <Header>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ fontSize: 20, color: 'var(--cream)' }}
              aria-label={t('back')}
            >
              ←
            </button>
            <div
              className="cinzel"
              style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}
            >
              {t('provider_dashboard')}
            </div>
          </div>
        </Header>
        <ProviderView />
      </div>
    )
  }

  /* ─── Admin view ─── */
  const visibleTabs = ADMIN_TABS.filter(tab => !tab.superOnly || isSuperAdmin)

  const renderTabContent = () => {
    switch (activeTab) {
      case 'kategorien':
        return <KategorienTab />
      case 'onboarding':
        return <OnboardingTab />
      case 'anbieter':
        return <AnbieterTab isSuperAdmin={isSuperAdmin} />
      case 'buchungen':
        return <BuchungenTab />
      case 'extras':
        return <ExtrasTab />
      case 'vorlagen':
        return <VorlagenTab />
      case 'promocodes':
        return <PromoCodesTab />
      case 'whatsapp':
        return <WhatsAppTab />
      case 'statistik':
        return <StatistikTab />
      case 'benutzer':
        return <BenutzerTab isSuperAdmin={isSuperAdmin} />
      default:
        return null
    }
  }

  return (
    <div>
      <Helmet>
        <title>Admin Panel | ChairMatch</title>
        <meta name="description" content="ChairMatch Admin-Bereich: Kategorien, Anbieter und Buchungen verwalten." />
        <link rel="canonical" href="https://chairmatch.de/provider" />
      </Helmet>

      {/* Header */}
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => navigate(-1)}
              style={{ fontSize: 20, color: 'var(--cream)' }}
              aria-label={t('back')}
            >
              ←
            </button>
            <div className="cinzel" style={{ fontSize: 'var(--font-lg)', fontWeight: 700 }}>
              Admin Panel
            </div>
          </div>
          <Badge variant="gold">{isSuperAdmin ? 'Super Admin' : 'Admin'}</Badge>
        </div>
      </Header>

      {/* Tab Navigation */}
      <div style={styles.tabBar}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            style={styles.tab(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
            aria-current={activeTab === tab.key ? 'page' : undefined}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  )
}
