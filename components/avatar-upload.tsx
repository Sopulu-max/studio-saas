'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateStaffAvatar } from '@/app/actions/staff'
import { updateClientAvatar } from '@/app/actions/clients'
import { compressImage } from '@/lib/compress-image'

interface AvatarUploadProps {
  entityId:   string
  entityType: 'staff' | 'client'
  currentUrl?: string | null
  name:        string          // used for initials fallback
  size?:       number          // diameter in px, default 64
  editable?:   boolean         // default true — set false for list display
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// Deterministic warm hue from name for the initials background
function avatarColor(name: string): { bg: string; color: string } {
  const palettes = [
    { bg: '#eeedfe', color: '#534ab7' },
    { bg: '#e6f1fb', color: '#185fa5' },
    { bg: '#eaf3de', color: '#3b6d11' },
    { bg: '#faeeda', color: '#854f0b' },
    { bg: '#fbeaf0', color: '#993556' },
    { bg: '#e8f4fc', color: '#1a6a8a' },
    { bg: '#fce8f3', color: '#8b2d6e' },
  ]
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % palettes.length
  return palettes[idx]
}

export default function AvatarUpload({
  entityId,
  entityType,
  currentUrl,
  name,
  size = 64,
  editable = true,
}: AvatarUploadProps) {
  const [url, setUrl]         = useState(currentUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const supabase              = createClient()
  const { bg, color }         = avatarColor(name)
  const fontSize              = Math.round(size * 0.33)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.files?.[0]
    if (!raw) return

    setLoading(true)
    setError(null)

    const file = await compressImage(raw, 'avatar').catch(() => raw)

    // Upload to Supabase Storage — path is deterministic so it overwrites
    const path = `${entityType}/${entityId}.jpg`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: 'image/jpeg' })

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    // Get public URL (append cache-buster so browser doesn't serve old image)
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    // Persist URL to database
    const result = entityType === 'staff'
      ? await updateStaffAvatar(entityId, data.publicUrl)
      : await updateClientAvatar(entityId, data.publicUrl)

    if (result.error) {
      setError(result.error)
    } else {
      setUrl(publicUrl)
    }

    setLoading(false)
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = ''
  }

  const showOverlay = editable && (hovered || loading)

  return (
    <div
      style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
      onMouseEnter={() => editable && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar circle */}
      <div
        onClick={() => editable && !loading && inputRef.current?.click()}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: editable ? 'pointer' : 'default',
          background: url ? 'var(--active)' : bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize,
          fontWeight: '500',
          color,
          userSelect: 'none',
          position: 'relative',
          border: '1px solid var(--line)',
        }}
      >
        {url ? (
          <img
            src={url}
            alt={name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          initials(name)
        )}

        {/* Hover / loading overlay */}
        {showOverlay && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
            transition: 'opacity 0.15s',
          }}>
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
      )}

      {/* Error tooltip */}
      {error && (
        <p style={{
          position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
          marginTop: '6px', fontSize: '11px', color: '#e24b4a',
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: '6px', padding: '4px 8px', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          {error}
        </p>
      )}

      {/* Spin keyframe injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
