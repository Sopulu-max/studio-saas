'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStudioConfig } from '@/components/studio-config-provider'
import { addAdditionalSession } from '@/app/actions/sessions'

export default function AddSessionModal({ bookingId, onClose }: { bookingId: string, onClose: () => void }) {
  const router = useRouter()
  const { sessionTypes } = useStudioConfig()
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    session_type: sessionTypes?.[0]?.value || 'photo',
    session_date: '',
    location_address: '',
    event_name: '',
    event_date: '',
    shoot_type: '',
    notes: ''
  })

  const isEvent = form.session_type === 'event'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await addAdditionalSession({
        booking_id: bookingId,
        ...form
      })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Session added successfully')
        onClose()
        router.refresh()
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-panel animate-enter" style={{ background: 'var(--bg)', width: '100%', maxWidth: '500px', padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Add Session</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--text-3)' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label className="label-mini">Session Type</label>
            <select
              required
              className="input-field"
              value={form.session_type}
              onChange={e => setForm({ ...form, session_type: e.target.value })}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
            >
              {(sessionTypes || []).map(st => (
                <option key={st.value} value={st.value}>{st.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label-mini">Session Title / Shoot Type</label>
            <input
              type="text"
              placeholder="e.g. Pre-wedding, Setup, Day 2..."
              value={form.shoot_type}
              onChange={e => setForm({ ...form, shoot_type: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
            />
          </div>

          <div>
            <label className="label-mini">Session Date & Time</label>
            <input
              type="datetime-local"
              required
              value={form.session_date}
              onChange={e => setForm({ ...form, session_date: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
            />
          </div>

          <div>
            <label className="label-mini">{isEvent ? 'Venue' : 'Location'}</label>
            <input
              type="text"
              placeholder="Optional"
              value={form.location_address}
              onChange={e => setForm({ ...form, location_address: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
            />
          </div>

          {isEvent && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label className="label-mini">Event Name</label>
                <input
                  type="text"
                  placeholder="e.g. The Adeboyes Wedding"
                  value={form.event_name}
                  onChange={e => setForm({ ...form, event_name: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label-mini">Event Date</label>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={e => setForm({ ...form, event_date: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)' }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label-mini">Logistics Notes</label>
            <textarea
              placeholder="Internal notes for this session..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="input-field"
              style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--line-inner)', background: 'var(--surface)', minHeight: '80px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '10px 16px', background: 'transparent', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--text-2)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.session_date}
              style={{ padding: '10px 16px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Adding...' : 'Add Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
