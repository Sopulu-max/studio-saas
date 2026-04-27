'use client'

import { useState } from 'react'
import { submitBookingRequest } from '@/app/actions/public'

export default function BookingForm({
  studioId,
  studioName,
  sessionTypes,
  serviceTypes,
}: {
  studioId: string
  studioName: string
  sessionTypes: { value: string; label: string }[]
  serviceTypes: { value: string; label: string }[]
}) {
  const [submitted, setSubmitted]   = useState(false)
  const [duplicate, setDuplicate]   = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const [form, setForm] = useState({
    full_name:        '',
    phone:            '',
    email:            '',
    session_type:     sessionTypes[0]?.value ?? '',
    service_type:     serviceTypes[0]?.value ?? 'photo',
    preferred_date:   '',
    outfits_count:    '',
    location_address: '',
    event_name:       '',
    event_date:       '',
    notes:            '',
  })

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const isEvent   = form.session_type === 'event'
  const isOutdoor = form.session_type === 'outdoor'
  const isStudio  = form.session_type === 'studio'

  // Minimum date = tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim())                   { setError('Please enter your full name'); return }
    if (!form.phone.trim())                       { setError('Please enter your phone number'); return }
    if (!form.preferred_date)                     { setError('Please select a preferred date'); return }
    if (isEvent && !form.event_name.trim())        { setError('Please enter the event name'); return }

    setLoading(true)
    setError('')

    const { error: err } = await submitBookingRequest({ ...form, studio_id: studioId })
    if (err === '__DUPLICATE__') {
      setDuplicate(true)
    } else if (err) {
      setError(err)
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  const label: React.CSSProperties = { fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }
  const req:   React.CSSProperties = { color: '#e24b4a' }
  const row:   React.CSSProperties = { marginBottom: '16px' }

  // ── Already submitted screen ──────────────────────────────────────────────
  if (duplicate) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '36px', marginBottom: '20px' }}>✅</div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px', color: '#111' }}>
          Already received!
        </h2>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 28px' }}>
          <strong>{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.
          {studioName} will be in touch to confirm your session — no need to submit again.
        </p>
        <p style={{ fontSize: '13px', color: '#aaa' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Success screen ────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px', color: '#111' }}>
          Request received!
        </h2>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 28px' }}>
          Thanks, <strong>{form.full_name.split(' ')[0]}</strong>. {studioName} will be in touch to
          confirm your session.
        </p>
        <p style={{ fontSize: '13px', color: '#aaa' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Session type */}
      <div style={row}>
        <label style={label}>Session type <span style={req}>*</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sessionTypes.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => { set('session_type', t.value); set('outfits_count', '') }}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: form.session_type === t.value ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                background: form.session_type === t.value ? '#111' : 'white',
                color: form.session_type === t.value ? 'white' : '#555',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service type */}
      {serviceTypes.length > 1 && (
        <div style={row}>
          <label style={label}>Service <span style={req}>*</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {serviceTypes.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => set('service_type', t.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: form.service_type === t.value ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                  background: form.service_type === t.value ? '#111' : 'white',
                  color: form.service_type === t.value ? 'white' : '#555',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={label}>Full name <span style={req}>*</span></label>
          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
            placeholder="Your full name" style={input} autoComplete="name" />
        </div>
        <div>
          <label style={label}>Phone <span style={req}>*</span></label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="08012345678" style={input} autoComplete="tel" />
        </div>
      </div>

      {/* Email */}
      <div style={row}>
        <label style={label}>Email <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span></label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="you@example.com" style={input} autoComplete="email" />
      </div>

      {/* Preferred date */}
      <div style={row}>
        <label style={label}>Preferred date <span style={req}>*</span></label>
        <input type="date" value={form.preferred_date} min={minDate}
          onChange={e => set('preferred_date', e.target.value)} style={input} />
        <p style={{ fontSize: '12px', color: '#aaa', margin: '5px 0 0' }}>
          This is a request — the studio will confirm the final date with you.
        </p>
      </div>

      {/* ── Outfits — studio & outdoor, not events ───────────────────────── */}
      {!isEvent && (
        <div style={row}>
          <label style={label}>
            Number of outfits{' '}
            <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
          </label>
          <input
            type="number" min="1" max="20"
            value={form.outfits_count}
            onChange={e => set('outfits_count', e.target.value)}
            placeholder="e.g. 2"
            style={{ ...input, maxWidth: '160px' }}
          />
        </div>
      )}

      {/* ── Outdoor-specific ──────────────────────────────────────────────── */}
      {isOutdoor && (
        <div style={row}>
          <label style={label}>
            Preferred location{' '}
            <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
          </label>
          <input type="text" value={form.location_address}
            onChange={e => set('location_address', e.target.value)}
            placeholder="e.g. Lekki Conservation Centre, Lagos" style={input} />
        </div>
      )}

      {/* ── Event-specific ────────────────────────────────────────────────── */}
      {isEvent && (
        <>
          <div style={row}>
            <label style={label}>Event name <span style={req}>*</span></label>
            <input type="text" value={form.event_name}
              onChange={e => set('event_name', e.target.value)}
              placeholder="e.g. Sandra & Emeka's Wedding" style={input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={label}>
                Event date{' '}
                <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
              </label>
              <input type="date" value={form.event_date}
                onChange={e => set('event_date', e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>
                Venue{' '}
                <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
              </label>
              <input type="text" value={form.location_address}
                onChange={e => set('location_address', e.target.value)}
                placeholder="Venue name or address" style={input} />
            </div>
          </div>
        </>
      )}

      {/* Notes */}
      <div style={row}>
        <label style={label}>
          Anything else?{' '}
          <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
        </label>
        <textarea
          value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Special requests, questions, or details about your shoot..."
          rows={3}
          style={{ ...input, resize: 'vertical' }}
        />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '14px' }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%', padding: '12px', background: '#111', color: 'white',
          border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500',
          cursor: 'pointer',
        }}
      >
        {loading ? 'Sending request…' : 'Request this session'}
      </button>

      <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', marginTop: '14px' }}>
        No payment required now. {studioName} will confirm availability and get back to you.
      </p>
    </form>
  )
}
