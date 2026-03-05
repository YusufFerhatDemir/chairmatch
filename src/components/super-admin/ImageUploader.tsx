'use client'

import { useState, useRef } from 'react'
import { uploadImage } from '@/modules/super-admin/super-admin.actions'

interface ImageUploaderProps {
  currentUrl?: string | null
  bucket?: string
  folder?: string
  onUpload: (url: string) => void
  label?: string
}

export default function ImageUploader({ currentUrl, bucket = 'app-assets', folder = 'uploads', onUpload, label = 'Bild hochladen' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(currentUrl || '')
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', bucket)
      fd.append('folder', folder)
      const result = await uploadImage(fd)
      if (result.url) {
        setPreview(result.url)
        onUpload(result.url)
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {preview && (
        <div style={{
          marginBottom: 8, borderRadius: 12, overflow: 'hidden',
          background: 'var(--c2)', padding: 8, textAlign: 'center',
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" style={{ maxHeight: 120, objectFit: 'contain' }} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
        style={{ display: 'none' }}
      />
      <button
        className="boutline"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ fontSize: 'var(--font-sm)', padding: '8px 14px', width: '100%' }}
      >
        {uploading ? 'Hochladen...' : label}
      </button>
    </div>
  )
}
