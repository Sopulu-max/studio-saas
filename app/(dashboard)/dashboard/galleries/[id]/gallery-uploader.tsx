'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateGalleryStatus, deletePhoto, toggleFavourite, deliverGallery } from '@/app/actions/galleries'

type GalleryPhoto = {
  photo_id: string
  file_url: string
  thumbnail_url: string
  is_favourite: boolean
  is_edited?: boolean | null
}

export default function GalleryUploader({
  galleryId, currentStatus, photos, clientLink, selectionOpen
}: {
  galleryId: string
  currentStatus: string
  photos: GalleryPhoto[]
  clientLink: string
  selectionOpen: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading]         = useState(false)
  const [progress, setProgress]           = useState(0)
  const [statusLoading, setStatusLoading] = useState(false)
  const [showDeliverForm, setShowDeliverForm] = useState(false)
  const [deliverDriveLink, setDeliverDriveLink] = useState('')
  const [delivering, setDelivering]       = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setProgress(0)
    let failed = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${galleryId}/${Date.now()}-${i}.${ext}`

      const { data: uploaded, error } = await supabase.storage
        .from('gallery-photos')
        .upload(path, file, { upsert: false })

      if (error || !uploaded) { failed++; continue }

      const { data: { publicUrl } } = supabase.storage
        .from('gallery-photos')
        .getPublicUrl(path)

      await supabase.from('gallery_photos').insert({
        gallery_id: galleryId,
        file_url: publicUrl,
        thumbnail_url: publicUrl,
        is_edited: false,
        is_favourite: false,
      })

      setProgress(Math.round(((i + 1) / files.length) * 100))
    }

    setUploading(false)
    setProgress(0)

    const succeeded = files.length - failed
    if (succeeded > 0) toast.success(`${succeeded} photo${succeeded > 1 ? 's' : ''} uploaded`)
    if (failed > 0) toast.error(`${failed} photo${failed > 1 ? 's' : ''} failed to upload`)

    if (currentStatus === 'processing') {
      await updateGalleryStatus(galleryId, 'ready')
    }
    router.refresh()
  }

  async function handleDeliver() {
    setDelivering(true)
    const { error } = await deliverGallery(galleryId, deliverDriveLink.trim() || undefined)
    if (error) toast.error(error)
    else {
      toast.success('Gallery delivered — client notified by email')
      setShowDeliverForm(false)
      setDeliverDriveLink('')
      router.refresh()
    }
    setDelivering(false)
  }

  async function handleStatusChange(status: string) {
    setStatusLoading(true)
    const { error } = await updateGalleryStatus(galleryId, status)
    if (error) toast.error(error)
    else toast.success('Gallery updated')
    router.refresh()
    setStatusLoading(false)
  }

  async function handleDelete(photoId: string, fileUrl: string) {
    const { error } = await deletePhoto(photoId, fileUrl)
    if (error) toast.error(error)
    else toast.success('Photo deleted')
    router.refresh()
  }

  async function handleFavourite(photoId: string, current: boolean) {
    await toggleFavourite(photoId, current)
    router.refresh()
  }

  return (
    <div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>PHOTOS</p>
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            style={{ padding: '7px 14px', fontSize: '13px' }}>
            {uploading ? `Uploading ${progress}%...` : 'Upload photos'}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*"
            onChange={handleUpload} style={{ display: 'none' }} />
        </div>

        {!photos.length ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '1px dashed var(--line)', borderRadius: '8px', padding: '3rem', textAlign: 'center', cursor: 'pointer', color: 'var(--text-4)' }}>
            <p style={{ fontSize: '14px', margin: '0 0 4px' }}>No photos yet</p>
            <p style={{ fontSize: '13px', margin: 0 }}>Click to upload photos</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px' }}>
            {photos.map(photo => (
              <div key={photo.photo_id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', aspectRatio: '1', background: 'var(--active)' }}>
                <img src={photo.thumbnail_url} alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <div style={{ position: 'absolute', top: '6px', right: '6px', display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => handleFavourite(photo.photo_id, photo.is_favourite)}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: photo.is_favourite ? '#faeeda' : 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    {photo.is_favourite ? '★' : '☆'}
                  </button>
                  <button
                    onClick={() => handleDelete(photo.photo_id, photo.file_url)}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontSize: '14px', color: '#e24b4a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    ×
                  </button>
                </div>
                {photo.is_edited && (
                  <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                    edited
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CLIENT LINK</p>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
          <code style={{ flex: 1, fontSize: '13px', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {clientLink}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(clientLink); toast.success('Link copied') }}
            style={{ padding: '8px 14px', fontSize: '13px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}
          >
            Copy
          </button>
          <a href={clientLink} target="_blank" rel="noreferrer"
            style={{ padding: '8px 14px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' as const }}>
            Preview ↗
          </a>
        </div>

        {selectionOpen && (
          <p style={{ fontSize: '13px', color: '#1a6a8a', margin: '0 0 16px', background: '#e8f4fc', padding: '8px 12px', borderRadius: '8px' }}>
            Selection mode is active. The client will be prompted to verify their phone before selecting images.
          </p>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
          {currentStatus === 'ready' && (
            <button
              onClick={() => setShowDeliverForm(v => !v)}
              disabled={delivering}
              style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {showDeliverForm ? 'Cancel' : 'Deliver to client'}
            </button>
          )}
          {currentStatus === 'delivered' && (
            <button onClick={() => handleStatusChange('expired')} disabled={statusLoading}
              style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer' }}>
              Expire gallery
            </button>
          )}
        </div>

        {/* Delivery form */}
        {showDeliverForm && currentStatus === 'ready' && (
          <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '16px', paddingTop: '16px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
              An email with the gallery link will be sent to the client.
            </p>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
                Google Drive link <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span>
              </label>
              <input
                type="url"
                value={deliverDriveLink}
                onChange={e => setDeliverDriveLink(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                style={{ width: '100%', boxSizing: 'border-box' as const, fontSize: '13px' }}
              />
            </div>
            <button
              onClick={handleDeliver}
              disabled={delivering}
              style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', cursor: 'pointer', fontWeight: '500' }}>
              {delivering ? 'Sending…' : 'Send gallery to client'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
