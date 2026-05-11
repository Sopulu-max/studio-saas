'use client'

import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updatePackageCover } from '@/app/actions/packages'

interface CoverUploadProps {
  packageId:  string
  currentUrl?: string | null
  /** Width of the visible area in px (height is always 56% = 16:9 approx) */
  width?: number
  /** Called after a successful upload so parent can update UI if needed */
  onUploaded?: (url: string) => void
}

export default function CoverUpload({
  packageId,
  currentUrl,
  width = 560,
  onUploaded,
}: CoverUploadProps) {
  const [url, setUrl]         = useState(currentUrl ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [hovered, setHovered] = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const supabase              = createClient()
  const height                = Math.round(width * 0.5625) // 16:9

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) { setError('Max file size is 8 MB'); return }

    setLoading(true)
    setError(null)

    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `package/${packageId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      setError(uploadError.message)
      setLoading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    const result = await updatePackageCover(packageId, data.publicUrl)
    if (result.error) {
      setError(result.error)
    } else {
      setUrl(publicUrl)
      onUploaded?.(publicUrl)
    }

    setLoading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function removeCover() {
    setLoading(true)
    const result = await updatePackageCover(packageId, '')
    if (!result.error) setUrl(null)
    setLoading(false)
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => !loading && inputRef.current?.click()}
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: '10px',
          overflow: 'hidden',
          cursor: 'pointer',
          border: '1px solid var(--line)',
          background: url ? 'var(--active)' : 'var(--hover)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {url ? (
          <img
            src={url}
            alt="Package cover"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-4)', pointerEvents: 'none' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p style={{ fontSize: '13px', margin: 0, fontWeight: '500' }}>Click to upload cover image</p>
            <p style={{ fontSize: '12px', margin: '4px 0 0', color: 'var(--text-4)' }}>JPG, PNG or WebP · max 8 MB</p>
          </div>
        )}

        {/* Hover / loading overlay */}
        {(hovered || loading) && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}>
            {loading ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            ) : (
              <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
                {url ? 'Change cover' : 'Upload cover'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions row */}
      {url && !loading && (
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            style={{ fontSize: '12px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Change image
          </button>
          <button
            type="button"
            onClick={removeCover}
            style={{ fontSize: '12px', color: '#e24b4a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Remove cover
          </button>
        </div>
      )}

      {error && (
        <p style={{ fontSize: '12px', color: '#e24b4a', marginTop: '6px' }}>{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
