'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addContract } from '@/app/actions/contracts'
import SearchableSelect from '@/components/searchable-select'
import { sessionName } from '@/lib/session-title'
import type { ContractTemplate } from '@/app/actions/contract-templates'

type Booking = {
  booking_id:   string
  booking_ref?: number | null
  session_date?: string | null
  status:       string | null
  session_type?: string | null
  clients?:     { full_name?: string | null; phone?: string | null } | null
  packages?:    { package_id: string; name?: string | null } | null
}

type StudioInfo = {
  name:    string
  email:   string
  phone:   string
  address: string
}

// ── Variable resolution ──────────────────────────────────────────────────────

function resolveVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] !== undefined ? vars[key] : match)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function assembleTemplate(
  template: ContractTemplate,
  booking:  Booking | undefined,
  studio:   StudioInfo,
): string {
  const vars: Record<string, string> = {
    client_name:    booking?.clients?.full_name ?? '',
    studio_name:    studio.name,
    studio_email:   studio.email,
    studio_phone:   studio.phone,
    studio_address: studio.address,
    session_date:   fmtDate(booking?.session_date),
    session_type:   booking?.session_type ?? '',
    booking_ref:    booking?.booking_ref ? `#${booking.booking_ref}` : '',
    package_name:   booking?.packages?.name ?? '',
    // These remain as placeholders for staff to fill in
    total_amount:   '',
    deposit_amount: '',
  }

  const body = template.clauses
    .map(c => `${c.title.toUpperCase()}\n\n${c.body}`)
    .join('\n\n\n')

  return resolveVariables(body, vars)
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NewContractForm({
  bookings,
  preselectedSessionId = '',
  templates,
  studio,
}: {
  bookings:              Booking[]
  preselectedSessionId?: string
  templates:             ContractTemplate[]
  studio:                StudioInfo
}) {
  const router = useRouter()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [dupContractId, setDupContractId] = useState('')

  const preselectedBooking = bookings.find(b => b.booking_id === preselectedSessionId)
  const [selectedId, setSelectedId]     = useState(preselectedSessionId)
  const [selectedTplId, setSelectedTplId] = useState('')
  const [content, setContent]           = useState('')
  const [autoSource, setAutoSource]     = useState('')

  function applyTemplate(bookingId: string, templateId: string) {
    const booking  = bookings.find(b => b.booking_id === bookingId)
    const template = templates.find(t => t.template_id === templateId)
    if (!template) { setAutoSource(''); return }
    const assembled = assembleTemplate(template, booking, studio)
    setContent(assembled)
    setAutoSource(template.name)
  }

  function handleSessionChange(id: string) {
    setSelectedId(id)
    if (selectedTplId) applyTemplate(id, selectedTplId)
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTplId(templateId)
    if (templateId) applyTemplate(selectedId, templateId)
    else { setContent(''); setAutoSource('') }
  }

  async function handleSubmit(forceDuplicate = false) {
    if (!selectedId) { setError('Please select a booking'); return }
    if (!content)    { setError('Contract content cannot be empty'); return }
    setLoading(true)
    setError('')
    setDupContractId('')
    const { error, contractId, existingContractId } = await addContract({
      booking_id:      selectedId,
      content,
      force_duplicate: forceDuplicate,
    })
    if (error === '__DUPLICATE__') {
      setDupContractId(existingContractId ?? '')
      setLoading(false)
    } else if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/contracts/${contractId}`)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  const hasTemplates = templates.length > 0

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New contract</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Create a contract for a booking</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        {/* Session picker */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Booking <span style={{ color: '#e24b4a' }}>*</span></label>
          {bookings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No bookings yet — <Link href="/dashboard/sessions/new" style={{ color: 'var(--link)' }}>create one first</Link>
            </p>
          ) : (
            <SearchableSelect
              options={bookings.map(b => ({
                value:    b.booking_id,
                label:    sessionName(b.clients?.full_name, b.booking_ref, b.booking_id, b.session_date),
                sublabel: [b.clients?.phone, b.status].filter(Boolean).join(' · '),
              }))}
              value={selectedId}
              onChange={handleSessionChange}
              placeholder="Search by name or phone…"
              emptyMessage="No bookings match"
            />
          )}
        </div>

        {/* Template picker */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Template</label>
            {!hasTemplates && (
              <Link href="/dashboard/settings" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                Build templates in Settings →
              </Link>
            )}
          </div>
          {hasTemplates ? (
            <select
              value={selectedTplId}
              onChange={e => handleTemplateChange(e.target.value)}
              style={inputStyle}
            >
              <option value="">— No template, write manually —</option>
              {templates.map(t => (
                <option key={t.template_id} value={t.template_id}>
                  {t.name}{t.session_type ? ` (${t.session_type})` : ''}
                  {t.clauses.length ? ` · ${t.clauses.length} clause${t.clauses.length !== 1 ? 's' : ''}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No templates yet. You can type the contract directly, or{' '}
              <Link href="/dashboard/settings" style={{ color: 'var(--link)' }}>create reusable templates</Link> in Settings.
            </p>
          )}
        </div>

        {/* Content textarea */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Contract content <span style={{ color: '#e24b4a' }}>*</span>
            </label>
            {autoSource && (
              <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
                Auto-filled from "{autoSource}"
              </span>
            )}
          </div>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={24}
            placeholder={
              hasTemplates
                ? 'Select a booking and template above to auto-fill, or type directly…'
                : 'Type your contract content…'
            }
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: '1.6' }}
          />
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      {dupContractId && (
        <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fffbea', border: '1px solid #f5e07a', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#7a5800', margin: '0 0 8px', fontWeight: '500' }}>
            This session already has a contract.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <Link href={`/dashboard/contracts/${dupContractId}`}
              style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View existing contract →
            </Link>
            <span style={{ color: '#ccc' }}>|</span>
            <button type="button" onClick={() => handleSubmit(true)}
              style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: '#7a5800', padding: 0, textDecoration: 'underline' }}>
              Create another anyway
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : 'Create contract'}
        </button>
        <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
