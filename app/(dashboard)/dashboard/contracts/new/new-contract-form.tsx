'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addContract } from '@/app/actions/contracts'
import SearchableSelect from '@/components/searchable-select'

type Booking = {
  booking_id: string
  session_date?: string | null
  status: string
  session_type?: string | null
  clients?: { full_name?: string | null; phone?: string | null } | null
  packages?: { package_id: string; contract_template?: string | null } | null
}

type Templates = { studio: string; outdoor: string; event: string }

function resolveTemplate(booking: Booking | undefined, templates: Templates): string {
  if (!booking) return ''
  // Package-level template takes priority
  if (booking.packages?.contract_template) return booking.packages.contract_template
  // Fall back to session-type default
  const type = (booking.session_type ?? 'studio') as keyof Templates
  return templates[type] ?? templates.studio ?? ''
}

export default function NewContractForm({
  bookings,
  preselectedSessionId = '',
  templates,
}: {
  bookings: Booking[]
  preselectedSessionId?: string
  templates: Templates
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const preselectedBooking = bookings.find(b => b.booking_id === preselectedSessionId)
  const [selectedId, setSelectedId] = useState(preselectedSessionId)
  const [content, setContent] = useState(() => resolveTemplate(preselectedBooking, templates))

  function handleSessionChange(id: string) {
    setSelectedId(id)
    const booking = bookings.find(b => b.booking_id === id)
    const tpl = resolveTemplate(booking, templates)
    if (tpl) setContent(tpl)
  }

  async function handleSubmit() {
    if (!selectedId) { setError('Please select a booking'); return }
    if (!content)    { setError('Contract content cannot be empty'); return }
    setLoading(true)
    setError('')
    const { error, contractId } = await addContract({ booking_id: selectedId, content })
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/contracts/${contractId}`)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  const selectedBooking = bookings.find(b => b.booking_id === selectedId)
  const templateSource = selectedBooking
    ? selectedBooking.packages?.contract_template
      ? 'package template'
      : `${selectedBooking.session_type ?? 'studio'} session default`
    : null

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New contract</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Create a contract for a booking</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Booking <span style={{ color: '#e24b4a' }}>*</span></label>
          {bookings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No bookings yet — <a href="/dashboard/sessions/new" style={{ color: 'var(--link)' }}>create one first</a>
            </p>
          ) : (
            <SearchableSelect
              options={bookings.map((b) => ({
                value: b.booking_id,
                label: b.clients?.full_name ?? 'Unknown',
                sublabel: [
                  b.clients?.phone,
                  b.session_date ? new Date(b.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
                  b.status,
                ].filter(Boolean).join(' · '),
              }))}
              value={selectedId}
              onChange={handleSessionChange}
              placeholder="Search by name or phone…"
              emptyMessage="No bookings match"
            />
          )}
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Contract content <span style={{ color: '#e24b4a' }}>*</span>
            </label>
            {templateSource && (
              <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                Auto-filled from {templateSource}
              </span>
            )}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={22}
            placeholder="Select a booking above to auto-fill from its template, or type your contract…"
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6' }}
          />
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving...' : 'Create contract'}
        </button>
        <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
