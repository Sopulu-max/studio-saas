'use client'

import { useState } from 'react'
import { verifyGalleryPhone, submitSelections } from '@/app/actions/public'

interface Photo {
  photo_id: string
  file_url: string
  thumbnail_url: string
  is_favourite: boolean
  is_edited: boolean
}

interface Props {
  photos: Photo[]
  galleryId: string
  selectionMode: boolean
  baseCount: number | null        // outfits × 2, null = unlimited
  alreadySubmitted: boolean
  previousCount: number | null
  studioPhone?: string | null
  studioName?: string | null
}

// ─── Phone gate ───────────────────────────────────────────────────────────────

function PhoneGate({
  galleryId,
  alreadySubmitted,
  previousCount,
  onVerified,
}: {
  galleryId: string
  alreadySubmitted: boolean
  previousCount: number | null
  onVerified: (phone: string) => void
}) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) { setError('Enter your phone number'); return }
    setLoading(true)
    setError('')
    const { verified } = await verifyGalleryPhone(galleryId, phone.trim())
    if (verified) {
      onVerified(phone.trim())
    } else {
      setError('Phone number not recognised. Use the number you registered with the studio.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '420px', margin: '80px auto', padding: '0 24px' }}>
      <div style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: '16px', padding: '32px' }}>
        <p style={{ fontSize: '24px', textAlign: 'center', marginBottom: '16px' }}>📷</p>
        <h2 style={{ fontSize: '20px', fontWeight: '600', textAlign: 'center', marginBottom: '8px' }}>
          {alreadySubmitted ? 'Update your selections' : 'Your images are ready'}
        </h2>
        <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '28px', lineHeight: '1.6' }}>
          {alreadySubmitted
            ? `You previously selected ${previousCount} image${previousCount !== 1 ? 's' : ''}. Enter your phone to revise.`
            : 'Enter the phone number you gave the studio to view and select your images.'}
        </p>

        <form onSubmit={handleVerify}>
          <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px' }}>
            Phone number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="08012345678"
            autoComplete="tel"
            style={{ width: '100%', boxSizing: 'border-box' as const, padding: '10px 12px', border: '0.5px solid #d5d5d5', borderRadius: '8px', fontSize: '15px', marginBottom: '12px', fontFamily: 'inherit' }}
          />
          {error && (
            <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '11px', background: '#111', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {loading ? 'Checking…' : 'View my gallery'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function GalleryViewer({
  photos,
  galleryId,
  selectionMode,
  baseCount,
  alreadySubmitted,
  previousCount,
  studioPhone,
  studioName,
}: Props) {
  const [lightbox,   setLightbox]   = useState<number | null>(null)
  const [filter,     setFilter]     = useState<'all' | 'favourites'>('all')
  const [verified,   setVerified]   = useState(false)
  const [phone,      setPhone]      = useState('')
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [submitted,  setSubmitted]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const displayed = filter === 'favourites' ? photos.filter(p => p.is_favourite) : photos
  const hasFavourites = photos.some(p => p.is_favourite)
  const selCount  = selected.size
  const extra     = baseCount != null ? Math.max(0, selCount - baseCount) : 0
  const overBase  = baseCount != null && selCount > baseCount

  function toggleSelect(photoId: string, e: React.MouseEvent) {
    if (!selectionMode || !verified) return
    e.stopPropagation()
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(photoId)) next.delete(photoId)
      else next.add(photoId)
      return next
    })
  }

  function prev() {
    if (lightbox === null) return
    setLightbox(lightbox > 0 ? lightbox - 1 : displayed.length - 1)
  }
  function next() {
    if (lightbox === null) return
    setLightbox(lightbox < displayed.length - 1 ? lightbox + 1 : 0)
  }
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowLeft') prev()
    if (e.key === 'ArrowRight') next()
    if (e.key === 'Escape') setLightbox(null)
  }

  async function handleSubmit() {
    if (selCount === 0) { setSubmitError('Please select at least one image first'); return }
    setSubmitting(true)
    setSubmitError('')
    const { error } = await submitSelections(galleryId, phone, selCount)
    if (error) {
      setSubmitError(error)
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  // ── Selection mode: phone gate ───────────────────────────────────────────
  if (selectionMode && !verified) {
    return (
      <PhoneGate
        galleryId={galleryId}
        alreadySubmitted={alreadySubmitted}
        previousCount={previousCount}
        onVerified={(p) => { setVerified(true); setPhone(p) }}
      />
    )
  }

  // ── Selection mode: success screen ──────────────────────────────────────
  if (selectionMode && submitted) {
    return (
      <div style={{ maxWidth: '480px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '40px', marginBottom: '20px' }}>✅</p>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px' }}>Selections submitted!</h2>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', marginBottom: '6px' }}>
          You selected <strong>{selCount} image{selCount !== 1 ? 's' : ''}</strong>.
        </p>
        {overBase && baseCount != null && (
          <p style={{ fontSize: '14px', color: '#854f0b', marginBottom: '6px' }}>
            That includes {extra} image{extra !== 1 ? 's' : ''} above your base of {baseCount} — the studio will be in touch about any additional charges.
          </p>
        )}
        <p style={{ fontSize: '13px', color: '#aaa', marginTop: '16px' }}>
          The studio will reach out to confirm next steps. You can close this page.
        </p>
      </div>
    )
  }

  // ── Normal / selection view ──────────────────────────────────────────────
  return (
    <>
      {/* Selection bar */}
      {selectionMode && verified && (
        <div style={{
          background: 'white', borderBottom: '0.5px solid #e5e5e5',
          padding: '12px 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: '73px', zIndex: 40,
        }}>
          <div>
            <span style={{ fontSize: '15px', fontWeight: '500' }}>
              {selCount === 0 ? 'Tap images to select them' : `${selCount} selected`}
            </span>
            {baseCount != null && (
              <span style={{ fontSize: '13px', color: overBase ? '#854f0b' : '#888', marginLeft: '10px' }}>
                {overBase
                  ? `+${extra} above your base of ${baseCount}`
                  : `(base: ${baseCount} images)`}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {selCount > 0 && (
              <button
                onClick={() => setSelected(new Set())}
                style={{ fontSize: '13px', color: '#888', background: 'transparent', border: '0.5px solid #e5e5e5', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Clear
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={submitting || selCount === 0}
              style={{
                fontSize: '13px', fontWeight: '500', background: selCount > 0 ? '#111' : '#ccc',
                color: 'white', border: 'none', borderRadius: '8px', padding: '8px 20px',
                cursor: selCount > 0 ? 'pointer' : 'default', fontFamily: 'inherit',
              }}
            >
              {submitting ? 'Submitting…' : `Submit ${selCount > 0 ? selCount : ''} selection${selCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#e24b4a', padding: '12px 2rem 0' }}>{submitError}</p>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem' }}>

        {/* Filter tabs */}
        {(hasFavourites || selectionMode) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {hasFavourites && (['all', 'favourites'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer',
                  background: filter === f ? '#111' : 'white',
                  color: filter === f ? 'white' : '#666',
                  border: `0.5px solid ${filter === f ? '#111' : '#e5e5e5'}`,
                  fontFamily: 'inherit',
                }}>
                  {f === 'all' ? `All (${photos.length})` : `★ Favourites (${photos.filter(p => p.is_favourite).length})`}
                </button>
              ))}
            </div>
            {!selectionMode && (
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Click a photo to view full size</p>
            )}
            {selectionMode && (
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Tap to select · Tap again to deselect</p>
            )}
          </div>
        )}

        {!displayed.length ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#aaa' }}>
            <p style={{ fontSize: '15px', margin: 0 }}>No photos in this view</p>
          </div>
        ) : (
          <div style={{ columns: '3 180px', gap: '8px' }}>
            {displayed.map((photo, i) => {
              const isSelected = selected.has(photo.photo_id)
              return (
                <div
                  key={photo.photo_id}
                  style={{ breakInside: 'avoid', marginBottom: '8px', position: 'relative', cursor: selectionMode ? 'pointer' : 'zoom-in' }}
                  onClick={selectionMode ? (e) => toggleSelect(photo.photo_id, e) : () => setLightbox(i)}
                >
                  <img
                    src={photo.thumbnail_url}
                    alt=""
                    style={{
                      width: '100%', display: 'block', borderRadius: '8px',
                      transition: 'opacity .15s',
                      opacity: selectionMode && !isSelected ? 0.65 : 1,
                      outline: isSelected ? '3px solid #111' : 'none',
                      outlineOffset: '-3px',
                    }}
                  />

                  {/* Selection indicator */}
                  {selectionMode && (
                    <div style={{
                      position: 'absolute', top: '8px', left: '8px',
                      width: '26px', height: '26px', borderRadius: '50%',
                      background: isSelected ? '#111' : 'rgba(255,255,255,0.85)',
                      border: isSelected ? '2px solid #111' : '2px solid rgba(0,0,0,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', color: 'white', fontWeight: '700',
                      transition: 'all .1s',
                    }}>
                      {isSelected ? '✓' : ''}
                    </div>
                  )}

                  {/* Favourite star (non-selection mode) */}
                  {!selectionMode && photo.is_favourite && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '14px', background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ★
                    </span>
                  )}

                  {photo.is_edited && (
                    <span style={{ position: 'absolute', bottom: '8px', left: '8px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                      edited
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox (normal mode only) */}
      {!selectionMode && lightbox !== null && (
        <div
          onKeyDown={handleKey}
          tabIndex={0}
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <button onClick={(e) => { e.stopPropagation(); prev() }}
            style={{ position: 'absolute', left: '1.5rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>

          <img
            src={displayed[lightbox]?.file_url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '4px' }}
          />

          <button onClick={(e) => { e.stopPropagation(); next() }}
            style={{ position: 'absolute', right: '1.5rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '44px', height: '44px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>

          <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
              {lightbox + 1} / {displayed.length}
            </span>
            <a href={displayed[lightbox]?.file_url} download onClick={(e) => e.stopPropagation()}
              style={{ fontSize: '13px', color: 'white', background: 'rgba(255,255,255,0.15)', padding: '6px 14px', borderRadius: '20px', textDecoration: 'none' }}>
              Download
            </a>
            {studioPhone && (
              <a href={`https://wa.me/${studioPhone.replace(/[^\d+]/g, '')}?text=${encodeURIComponent(`Hi ${studioName}, I would like to order a physical print/frame for image: ${displayed[lightbox]?.file_url}`)}`} 
                target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                style={{ fontSize: '13px', color: 'white', background: '#25D366', padding: '6px 14px', borderRadius: '20px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.385 0 12.031C0 14.673 1.05 17.202 2.87 19.166L1.134 23.366L5.438 21.63C7.355 23.303 9.773 24 12.031 24C18.677 24 24 18.615 24 11.969C24 5.323 18.677 0 12.031 0ZM18.57 16.711C18.293 17.487 16.892 18.172 16.208 18.256C15.655 18.339 14.898 18.423 11.83 17.151C8.077 15.589 5.666 11.758 5.485 11.517C5.304 11.276 4 9.539 4 7.747C4 5.955 4.908 5.086 5.274 4.721C5.551 4.444 5.986 4.316 6.388 4.316C6.516 4.316 6.634 4.321 6.743 4.326C7.02 4.341 7.159 4.356 7.34 4.789C7.568 5.339 8.125 6.702 8.192 6.841C8.258 6.98 8.35 7.16 8.258 7.34C8.167 7.52 8.106 7.595 7.97 7.747C7.835 7.899 7.7 8.084 7.564 8.192C7.429 8.3 7.279 8.423 7.444 8.708C7.61 8.993 8.183 9.932 9.034 10.688C10.13 11.587 11.018 11.874 11.334 12.008C11.56 12.102 11.846 12.078 12.012 11.898C12.223 11.673 12.479 11.282 12.736 10.891C12.932 10.59 13.174 10.545 13.43 10.635C13.702 10.726 15.134 11.433 15.42 11.568C15.706 11.704 15.897 11.779 15.957 11.884C16.017 11.99 16.017 12.516 15.741 13.292" /></svg>
                Order Prints
              </a>
            )}
          </div>

          <button onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer' }}>
            ×
          </button>
        </div>
      )}
    </>
  )
}
