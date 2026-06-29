'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateBookingExtras } from '@/app/actions/bookings'

export default function SessionExtras({
  sessionId,
  extraOutfits,
  extraPictures,
}: {
  sessionId: string
  extraOutfits: number | null
  extraPictures: number | null
}) {
  const router   = useRouter()
  const [editing, setEditing]  = useState(false)
  const [loading, setLoading]  = useState(false)
  const [outfits,  setOutfits]  = useState(extraOutfits  != null ? String(extraOutfits)  : '')
  const [pictures, setPictures] = useState(extraPictures != null ? String(extraPictures) : '')

  const hasExtras = extraOutfits != null || extraPictures != null

  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block' as const, marginBottom: '5px' }
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }

  async function handleSave() {
    setLoading(true)
    const { error } = await updateBookingExtras(sessionId, {
      extra_outfits:  outfits,
      extra_pictures: pictures,
    })
    setLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('Extras saved')
      setEditing(false)
      router.refresh()
    }
  }

  function handleCancel() {
    setOutfits(extraOutfits   != null ? String(extraOutfits)   : '')
    setPictures(extraPictures != null ? String(extraPictures) : '')
    setEditing(false)
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editing ? '16px' : hasExtras ? '12px' : 0 }}>
        <div>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>EXTRAS</p>
          {!editing && !hasExtras && (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '4px 0 0' }}>
              No extras added yet — add any outfits or pictures agreed after the original booking
            </p>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            style={{ fontSize: '12px', color: 'var(--link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {hasExtras ? 'Edit' : '+ Add extras'}
          </button>
        )}
      </div>

      {!editing && hasExtras && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {extraOutfits != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Extra outfits</p>
              <p style={{ fontSize: '14px', margin: 0 }}>+{extraOutfits}</p>
            </div>
          )}
          {extraPictures != null && (
            <div>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Extra pictures</p>
              <p style={{ fontSize: '14px', margin: 0 }}>+{extraPictures}</p>
            </div>
          )}
        </div>
      )}

      {editing && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Extra outfits</label>
              <input
                type="number" min="0"
                value={outfits}
                onChange={e => setOutfits(e.target.value)}
                placeholder="e.g. 1"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Extra pictures</label>
              <input
                type="number" min="0"
                value={pictures}
                onChange={e => setPictures(e.target.value)}
                placeholder="e.g. 5"
                style={inputStyle}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{ padding: '7px 16px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{ padding: '7px 14px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}
