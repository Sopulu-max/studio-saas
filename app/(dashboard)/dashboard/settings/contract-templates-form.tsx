'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { saveContractTemplate, deleteContractTemplate } from '@/app/actions/contract-templates'
import type { ContractTemplate } from '@/app/actions/contract-templates'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

type EditClause = { _key: string; title: string; body: string }

const VARIABLES = [
  { v: '{{client_name}}',    label: 'Client name' },
  { v: '{{studio_name}}',    label: 'Studio name' },
  { v: '{{session_date}}',   label: 'Session date' },
  { v: '{{session_type}}',   label: 'Session type' },
  { v: '{{booking_ref}}',    label: 'Booking ref' },
  { v: '{{package_name}}',   label: 'Package name' },
  { v: '{{studio_email}}',   label: 'Studio email' },
  { v: '{{studio_phone}}',   label: 'Studio phone' },
  { v: '{{studio_address}}', label: 'Studio address' },
  { v: '{{total_amount}}',   label: 'Total amount' },
  { v: '{{deposit_amount}}', label: 'Deposit amount' },
]

let _key = 0
function nextKey() { return String(++_key) }

function blankClause(): EditClause {
  return { _key: nextKey(), title: '', body: '' }
}

function clausesFromTemplate(t: ContractTemplate): EditClause[] {
  return t.clauses.map(c => ({ _key: nextKey(), title: c.title, body: c.body }))
}

export default function ContractTemplatesForm({ initial }: { initial: ContractTemplate[] }) {
  const router = useRouter()
  const [templates, setTemplates]   = useState<ContractTemplate[]>(initial)
  const [view, setView]             = useState<'list' | 'edit'>('list')
  const [editId, setEditId]         = useState<string | undefined>(undefined)
  const [name, setName]             = useState('')
  const [description, setDescription] = useState('')
  const [sessionType, setSessionType] = useState('')
  const [clauses, setClauses]       = useState<EditClause[]>([blankClause()])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [varsOpen, setVarsOpen]     = useState(false)

  function openNew() {
    setEditId(undefined)
    setName('')
    setDescription('')
    setSessionType('')
    setClauses([blankClause()])
    setError('')
    setView('edit')
  }

  function openEdit(t: ContractTemplate) {
    setEditId(t.template_id)
    setName(t.name)
    setDescription(t.description)
    setSessionType(t.session_type)
    setClauses(clausesFromTemplate(t))
    setError('')
    setView('edit')
  }

  function updateClause(key: string, field: 'title' | 'body', value: string) {
    setClauses(prev => prev.map(c => c._key === key ? { ...c, [field]: value } : c))
  }

  function addClause() {
    setClauses(prev => [...prev, blankClause()])
  }

  function removeClause(key: string) {
    setClauses(prev => prev.filter(c => c._key !== key))
  }

  function moveClause(key: string, dir: -1 | 1) {
    setClauses(prev => {
      const idx = prev.findIndex(c => c._key === key)
      if (idx < 0) return prev
      const next = idx + dir
      if (next < 0 || next >= prev.length) return prev
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr
    })
  }

  async function copyVar(v: string) {
    try { await navigator.clipboard.writeText(v) } catch { /* ignore */ }
    toast.success(`Copied ${v}`)
  }

  async function handleSave() {
    setLoading(true)
    setError('')
    const { error: err, templateId } = await saveContractTemplate({
      template_id:  editId,
      name, description, session_type: sessionType,
      clauses: clauses.map(c => ({ title: c.title, body: c.body })),
    })
    if (err) {
      setError(err)
      setLoading(false)
      return
    }
    const saved: ContractTemplate = {
      template_id:   templateId ?? editId ?? '',
      name, description, session_type: sessionType,
      display_order: 0,
      clauses: clauses.map((c, i) => ({ title: c.title, body: c.body, display_order: i })),
    }
    if (editId) {
      setTemplates(prev => prev.map(t => t.template_id === editId ? saved : t))
    } else {
      setTemplates(prev => [...prev, saved])
    }
    toast.success(editId ? 'Template saved' : 'Template created')
    setView('list')
    setLoading(false)
    router.refresh()
  }

  async function handleDelete(templateId: string, templateName: string) {
    if (!confirm(`Delete "${templateName}"? This cannot be undone.`)) return
    const { error: err } = await deleteContractTemplate(templateId)
    if (err) { toast.error(err); return }
    setTemplates(prev => prev.filter(t => t.template_id !== templateId))
    toast.success('Template deleted')
  }

  const inputStyle  = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle  = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  // ── List view ──────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Contract templates</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
              Build reusable templates made of named clauses. Variables like {'{{client_name}}'} auto-fill from the booking when you create a contract.
            </p>
          </div>
          <button
            onClick={openNew}
            style={{ padding: '7px 14px', fontSize: '13px', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: '16px' }}
          >
            + New template
          </button>
        </div>

        {templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '14px', margin: '0 0 4px' }}>No templates yet</p>
            <p style={{ fontSize: '13px', margin: 0 }}>Create your first template to speed up contract creation</p>
          </div>
        ) : (
          <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {templates.map((t, i) => (
              <AnimatedItem key={t.template_id} delay={i * 0.05}>
                <div className="glass-panel" style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 1rem', gap: '12px',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                      {t.clauses.length} clause{t.clauses.length !== 1 ? 's' : ''}
                      {t.session_type ? ` · ${t.session_type}` : ''}
                      {t.description ? ` · ${t.description}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => openEdit(t)}
                      style={{ padding: '5px 12px', fontSize: '12px', background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.template_id, t.name)}
                      style={{ padding: '5px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: '#e24b4a' }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </AnimatedItem>
            ))}
          </AnimatedList>
        )}
      </div>
    )
  }

  // ── Edit view ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setView('list')}
          style={{ padding: '5px 12px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-2)' }}
        >
          ← Back
        </button>
        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>
          {editId ? 'Edit template' : 'New template'}
        </p>
      </div>

      {/* Template meta */}
      <div className="glass-panel" style={{ padding: '1.25rem', marginBottom: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Template name <span style={{ color: '#e24b4a' }}>*</span></label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Standard Portrait Agreement" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Applies to <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>(optional)</span></label>
            <input type="text" value={sessionType} onChange={e => setSessionType(e.target.value)}
              placeholder="e.g. Wedding, Portrait, All sessions" style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>(optional)</span></label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Short note shown on the template list" style={inputStyle} />
        </div>
      </div>

      {/* Variables reference */}
      <div className="glass-panel" style={{ marginBottom: '12px', overflow: 'hidden' }}>
        <button
          onClick={() => setVarsOpen(v => !v)}
          style={{
            width: '100%', padding: '10px 1.25rem', background: 'none', border: 'none',
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Variables — click to copy</span>
          <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>{varsOpen ? '▲' : '▼'}</span>
        </button>
        {varsOpen && (
          <div style={{ padding: '0 1.25rem 1rem', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {VARIABLES.map(({ v, label }) => (
              <button
                key={v}
                onClick={() => copyVar(v)}
                title={label}
                style={{
                  padding: '3px 9px', fontSize: '12px', fontFamily: 'var(--font-mono)',
                  background: 'var(--active)', border: '1px solid var(--line)',
                  borderRadius: '6px', cursor: 'pointer', color: 'var(--text-2)',
                }}
              >
                {v}
              </button>
            ))}
            <p style={{ width: '100%', fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>
              Paste into clause bodies. They auto-fill from the booking when you create a contract.
            </p>
          </div>
        )}
      </div>

      {/* Clauses */}
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)', margin: '0 0 10px' }}>
          Clauses <span style={{ fontWeight: '400', color: 'var(--text-4)' }}>— each becomes a headed section in the contract</span>
        </p>

        <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {clauses.map((clause, idx) => (
            <AnimatedItem key={clause._key} delay={idx * 0.05}>
              <div className="glass-panel" style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={clause.title}
                    onChange={e => updateClause(clause._key, 'title', e.target.value)}
                    placeholder="Clause title (e.g. Payment Terms)"
                    style={{ flex: 1, boxSizing: 'border-box', fontSize: '13px', fontWeight: '500' }}
                  />
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button
                      onClick={() => moveClause(clause._key, -1)}
                      disabled={idx === 0}
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: idx === 0 ? 'var(--text-4)' : 'var(--text-2)' }}
                      title="Move up"
                    >↑</button>
                    <button
                      onClick={() => moveClause(clause._key, 1)}
                      disabled={idx === clauses.length - 1}
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: idx === clauses.length - 1 ? 'var(--text-4)' : 'var(--text-2)' }}
                      title="Move down"
                    >↓</button>
                    <button
                      onClick={() => removeClause(clause._key)}
                      disabled={clauses.length === 1}
                      style={{ padding: '4px 8px', fontSize: '12px', background: 'transparent', border: '1px solid var(--line)', color: clauses.length === 1 ? 'var(--text-4)' : '#e24b4a' }}
                      title="Remove clause"
                    >×</button>
                  </div>
                </div>
                <textarea
                  value={clause.body}
                  onChange={e => updateClause(clause._key, 'body', e.target.value)}
                  placeholder="Clause body text. Use {{variables}} to auto-fill booking data."
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', fontSize: '13px', lineHeight: '1.6' }}
                />
              </div>
            </AnimatedItem>
          ))}
        </AnimatedList>

        <button
          onClick={addClause}
          style={{ marginTop: '8px', padding: '8px 14px', fontSize: '13px', background: 'transparent', border: '1px dashed var(--line)', color: 'var(--text-3)', width: '100%' }}
        >
          + Add clause
        </button>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', margin: '0 0 12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : editId ? 'Save template' : 'Create template'}
        </button>
        <button
          onClick={() => setView('list')}
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
