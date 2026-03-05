'use client'

import { useState } from 'react'
import { updateCategoryIcon } from '@/modules/super-admin/super-admin.actions'
import ImageUploader from './ImageUploader'

type CategoryItem = {
  id: string
  slug: string
  label: string
  iconUrl: string | null
}

interface CategoryIconEditorProps {
  categories: CategoryItem[]
}

export default function CategoryIconEditor({ categories: initialCategories }: CategoryIconEditorProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [toast, setToast] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  async function handleUpload(categoryId: string, url: string) {
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, iconUrl: url } : c))
    await updateCategoryIcon(categoryId, url)
    showToast('Icon aktualisiert!')
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--green)', color: '#fff', padding: '10px 20px',
          borderRadius: 12, fontSize: 'var(--font-sm)', fontWeight: 700, zIndex: 999,
        }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {categories.map(cat => (
          <div key={cat.id} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12, background: 'var(--c2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, overflow: 'hidden',
            }}>
              {cat.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cat.iconUrl} alt={cat.label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 24, color: 'var(--stone)' }}>?</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: 'var(--font-md)' }}>{cat.label}</div>
              <div style={{ fontSize: 'var(--font-xs)', color: 'var(--stone)' }}>{cat.slug}</div>
            </div>
            <div style={{ flexShrink: 0, width: 110 }}>
              <ImageUploader
                bucket="app-assets"
                folder="category-icons"
                onUpload={url => handleUpload(cat.id, url)}
                label="Icon ändern"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
