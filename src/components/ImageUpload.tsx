'use client'

import { useState, useRef, useCallback } from 'react'

interface ImageUploadProps {
  salonId: string
  imageType: 'logo' | 'cover' | 'gallery' | 'before_after' | 'team'
  onUpload: (image: { id: string; url: string }) => void
  maxFiles?: number
}

interface UploadedImage {
  id: string
  url: string
}

export default function ImageUpload({ salonId, imageType, onUpload, maxFiles = 1 }: ImageUploadProps) {
  const [uploads, setUploads] = useState<UploadedImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canUploadMore = uploads.length < maxFiles

  const uploadFile = useCallback(async (file: File) => {
    setError(null)

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Nur JPG, PNG oder WebP erlaubt')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Maximal 5 MB erlaubt')
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('salonId', salonId)
      formData.append('imageType', imageType)

      // Simulate progress steps while uploading
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 15, 85))
      }, 200)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Upload fehlgeschlagen' }))
        throw new Error(body.error || 'Upload fehlgeschlagen')
      }

      setProgress(100)
      const data: { id: string; url: string } = await res.json()

      setUploads(prev => [...prev, data])
      onUpload(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
      setTimeout(() => setProgress(0), 600)
    }
  }, [salonId, imageType, onUpload])

  const handleDelete = useCallback(async (imageId: string) => {
    try {
      const res = await fetch(`/api/upload/${imageId}`, { method: 'DELETE' })
      if (res.ok) {
        setUploads(prev => prev.filter(img => img.id !== imageId))
      }
    } catch {
      setError('Löschen fehlgeschlagen')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!canUploadMore) return
    const file = e.dataTransfer.files[0]
    if (file) uploadFile(file)
  }, [canUploadMore, uploadFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    if (inputRef.current) inputRef.current.value = ''
  }, [uploadFile])

  return (
    <div style={{ width: '100%' }}>
      {/* Thumbnails */}
      {uploads.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          marginBottom: 12,
        }}>
          {uploads.map(img => (
            <div key={img.id} style={{
              position: 'relative',
              width: 80,
              height: 80,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid rgba(200,168,75,0.3)',
              background: '#1a1a1a',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt="Upload"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => handleDelete(img.id)}
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#ff6b6b',
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
                aria-label="Bild löschen"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canUploadMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && !uploading && inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'rgba(200,168,75,0.8)' : 'rgba(200,168,75,0.3)'}`,
            borderRadius: 14,
            padding: '28px 16px',
            textAlign: 'center',
            cursor: uploading ? 'wait' : 'pointer',
            background: dragOver ? 'rgba(200,168,75,0.05)' : '#111',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {uploading ? (
            <div>
              <p style={{ color: 'rgba(200,168,75,0.9)', fontSize: 13, marginBottom: 10 }}>
                Hochladen...
              </p>
              {/* Progress bar */}
              <div style={{
                width: '100%',
                height: 4,
                background: 'rgba(200,168,75,0.15)',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #c8a84b, #e8d06a)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          ) : (
            <div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block' }}>
                <path
                  d="M12 16V4m0 0L8 8m4-4l4 4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="rgba(200,168,75,0.6)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p style={{ color: 'rgba(200,168,75,0.7)', fontSize: 13, margin: 0 }}>
                Bild hierher ziehen oder klicken
              </p>
              <p style={{ color: 'rgba(200,168,75,0.4)', fontSize: 11, marginTop: 4 }}>
                JPG, PNG, WebP &middot; max. 5 MB
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{
          color: '#ff6b6b',
          fontSize: 12,
          marginTop: 8,
          padding: '6px 10px',
          background: 'rgba(255,107,107,0.1)',
          borderRadius: 8,
        }}>
          {error}
        </p>
      )}
    </div>
  )
}
