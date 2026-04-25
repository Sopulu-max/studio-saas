'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addGallery } from '@/app/actions/galleries'
import SearchableSelect from '@/components/searchable-select'

type GalleryBooking = {
  booking_id: string
  session_date: string
  clients?: { full_name?: string | null; phone?: string | null } | null
}

export default function NewGalleryForm({ bookings, preselectedSessionId = '' }: { bookings: GalleryBooking[]; preselectedSessionId?: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ booking_id: preselectedSessionId, title: '', description: '' })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.booking_id || !form.title) {
      setError('Booking and title are required')
      return
    }
    setLoading(true)
    setError('')
    const { error, galleryId } = await addGallery(form)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/galleries/${galleryId}`)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New gallery</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Create a photo gallery for a completed shoot</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Booking <span style={{ color: '#e24b4a' }}>*</span></label>
          {bookings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No bookings yet.</p>
          ) : (
            <SearchableSelect
              options={bookings.map((b) => ({
                value: b.booking_id,
                label: b.clients?.full_name ?? 'Unknown',
                sublabel: [
                  b.clients?.phone,
                  new Date(b.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
                ].filter(Boolean).join(' · '),
              }))}
              value={form.booking_id}
              onChange={v => update('booking_id', v)}
              placeholder="Search by name or phone…"
              emptyMessage="No bookings match"
            />
          )}
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Gallery title <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.title} onChange={e => update('title', e.target.value)}
            placeholder="e.g. Ada & Chidi Wedding — Full Gallery" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="A note to the client about this gallery..."
            rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Creating...' : 'Create gallery'}
          </button>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
