'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addContract } from '@/app/actions/contracts'
import SearchableSelect from '@/components/searchable-select'
import { sessionName } from '@/lib/session-title'
import type { ContractTemplate } from '@/app/actions/contract-templates'

import type { BookingOptionDTO } from '@/lib/domains/contracts/types'

type StudioInfo = {
  name:    string
  email:   string
  phone:   string
  address: string
}

type EditClause = { _key: string; title: string; body: string }

let _key = 0
function nextKey() { return String(++_key) }
function blankClause(): EditClause { return { _key: nextKey(), title: '', body: '' } }

// ── Variable resolution ──────────────────────────────────────────────────────

function resolveVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] !== undefined ? vars[key] : match)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildVars(booking: BookingOptionDTO | undefined, studio: StudioInfo): Record<string, string> {
  return {
    client_name:    booking?.client_name ?? '',
    studio_name:    studio.name,
    studio_email:   studio.email,
    studio_phone:   studio.phone,
    studio_address: studio.address,
    session_date:   fmtDate(booking?.session_date),
    session_type:   booking?.session_type ?? '',
    booking_ref:    booking?.booking_ref ? `#${booking.booking_ref}` : '',
    package_name:   booking?.package_name ?? '',
    total_amount:   '',
    deposit_amount: '',
  }
}

function assembleContent(clauses: EditClause[]): string {
  return clauses
    .filter(c => c.title.trim() || c.body.trim())
    .map(c => `${c.title.toUpperCase()}\n\n${c.body}`)
    .join('\n\n\n')
}

// ── Component ────────────────────────────────────────────────────────────────

export default function NewContractForm({
  bookings,
  preselectedSessionId = '',
  templates,
  studio,
}: {
  bookings:              BookingOptionDTO[]
  preselectedSessionId?: string
  templates:             ContractTemplate[]
  studio:                StudioInfo
}) {
  const router = useRouter()
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')
  const [dupContractId, setDupContractId] = useState('')

  const [selectedId, setSelectedId]       = useState(preselectedSessionId)
  const [selectedTplId, setSelectedTplId] = useState('')
  const [clauses, setClauses]             = useState<EditClause[]>([blankClause()])
  const [autoSource, setAutoSource]       = useState('')

  const hasTemplates = templates.length > 0

  // ── Clause helpers ───────────────────────────────────────────────────────

  function updateClause(key: string, field: 'title' | 'body', value: string) {
    setClauses(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c))
  }
  function addClause() { setClauses(prev => [...prev, blankClause()]) }
  function removeClause(key: string) {
    setClauses(prev => prev.length > 1 ? prev.filter(c => c._key !== key) : prev)
  }
  function moveClause(key: string, dir: -1 | 1) {
    setClauses(prev => {
      const idx = prev.findIndex(c => c._key === key)
      const next = idx + dir
      if (idx < 0 || next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  // ── Template application ─────────────────────────────────────────────────

  function applyTemplate(bookingId: string, templateId: string) {
    const booking  = bookings.find(b => b.booking_id === bookingId)
    const template = templates.find(t => t.template_id === templateId)
    if (!template) { setClauses([blankClause()]); setAutoSource(''); return }
    const vars = buildVars(booking, studio)
    setClauses(template.clauses.map(c => ({
      _key: nextKey(),
      title: c.title,
      body:  resolveVariables(c.body, vars),
    })))
    setAutoSource(template.name)
  }

  function handleSessionChange(id: string) {
    setSelectedId(id)
    const booking  = bookings.find(b => b.booking_id === id)
    const pkgTplId = booking?.contract_template_id
    if (pkgTplId && templates.some(t => t.template_id === pkgTplId)) {
      setSelectedTplId(pkgTplId)
      applyTemplate(id, pkgTplId)
    } else if (selectedTplId) {
      applyTemplate(id, selectedTplId)
    }
  }

  function handleTemplateChange(templateId: string) {
    setSelectedTplId(templateId)
    if (templateId) applyTemplate(selectedId, templateId)
    else { setClauses([blankClause()]); setAutoSource('') }
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(forceDuplicate = false) {
    if (!selectedId) { setError('Please select a booking'); return }
    const content = assembleContent(clauses)
    if (!content) { setError('Add at least one clause with content'); return }
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

  const inputStyle  = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle  = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const cardStyle   = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New contract</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Create a contract for a booking</p>
      </div>

      {/* Booking + template selectors */}
      <div style={cardStyle}>
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
                label:    sessionName(b.client_name, b.booking_ref, b.booking_id, b.session_date),
                sublabel: [b.client_phone, b.status].filter(Boolean).join(' · '),
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
              No templates yet. You can type the contract directly below, or{' '}
              <Link href="/dashboard/settings" style={{ color: 'var(--link)' }}>create reusable templates</Link> in Settings.
            </p>
          )}
        </div>
      </div>

      {/* Clause editor */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)', margin: 0 }}>
            Clauses <span style={{ fontWeight: '400', color: 'var(--text-4)' }}>— each becomes a headed section in the contract</span>
          </p>
          {autoSource && (
            <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>
              Auto-filled from &ldquo;{autoSource}&rdquo;
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {clauses.map((clause, idx) => (
            <div key={clause._key} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '1rem' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={clause.title}
                  onChange={e => updateClause(clause._key, 'title', e.target.value)}
                  placeholder="Clause title (e.g. Payment Terms)"
                  style={{ flex: 1, boxSizing: 'border-box', fontSize: '13px', fontWeight: '500' }}
                />
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <button onClick={() => moveClause(clause._key, -1)} type="button" disabled={idx === 0}
                    style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: idx === 0 ? 'var(--text-4)' : 'var(--text-2)', cursor: idx === 0 ? 'default' : 'pointer' }}
                    title="Move up">↑</button>
                  <button onClick={() => moveClause(clause._key, 1)} type="button" disabled={idx === clauses.length - 1}
                    style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: idx === clauses.length - 1 ? 'var(--text-4)' : 'var(--text-2)', cursor: idx === clauses.length - 1 ? 'default' : 'pointer' }}
                    title="Move down">↓</button>
                  <button onClick={() => removeClause(clause._key)} type="button" disabled={clauses.length === 1}
                    style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: clauses.length === 1 ? 'var(--text-4)' : '#e24b4a', cursor: clauses.length === 1 ? 'default' : 'pointer' }}
                    title="Remove clause">×</button>
                </div>
              </div>
              <textarea
                value={clause.body}
                onChange={e => updateClause(clause._key, 'body', e.target.value)}
                placeholder="Clause body. Variables like {{client_name}} auto-fill from the booking."
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.7' }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={addClause}
          type="button"
          style={{ marginTop: '8px', padding: '8px 14px', fontSize: '13px', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--text-3)', width: '100%', cursor: 'pointer', borderRadius: '8px' }}
        >
          + Add clause
        </button>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', margin: '12px 0 0' }}>{error}</p>}

      {dupContractId && (
        <div style={{ marginTop: '12px', padding: '12px 14px', background: '#fffbea', border: '1px solid #f5e07a', borderRadius: '10px' }}>
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

      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : 'Create contract'}
        </button>
        <button onClick={() => router.back()} type="button"
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
