'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { saveBookingStatuses } from '@/app/actions/studio-config'
import type { BookingStatusConfig } from '@/lib/studio-config'
import { COLOR_PRESETS } from '@/lib/color-presets'

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

const STAFF_ROLE_OPTIONS = [
  { value: '',        label: 'None' },
  { value: 'shooter', label: 'Shooter (photographer / videographer)' },
  { value: 'grader',  label: 'Colour grader' },
  { value: 'editor',  label: 'Editor / retoucher' },
]

export default function BookingStatusesForm({ initial }: { initial: BookingStatusConfig[] }) {
  const [statuses, setStatuses] = useState<BookingStatusConfig[]>(
    [...initial].sort((a, b) => a.order - b.order)
  )
  const [loading, setLoading]   = useState(false)
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function move(i: number, dir: -1 | 1) {
    const next = [...statuses]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setStatuses(next.map((s, idx) => ({ ...s, order: idx })))
  }

  function update(i: number, patch: Partial<BookingStatusConfig>) {
    setStatuses(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  }

  function remove(i: number) {
    setStatuses(prev => prev.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx })))
    if (expandedIdx === i) setExpandedIdx(null)
  }

  function addStatus() {
    const label = newLabel.trim()
    if (!label) return
    const value = slug(label)
    if (statuses.find(s => s.value === value)) { toast.error('A status with that name already exists'); return }
    setStatuses(prev => [...prev, {
      value, label,
      color_bg: newColor.bg, color_fg: newColor.fg,
      order: prev.length,
    }])
    setNewLabel('')
    setAdding(false)
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await saveBookingStatuses(statuses)
    if (error) toast.error(error)
    else toast.success('Booking statuses saved')
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Booking statuses</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Define your session workflow pipeline. Order reflects your process.
          </p>
        </div>
        <button onClick={() => setAdding(v => !v)} type="button"
          style={{ padding: '5px 12px', fontSize: '13px', flexShrink: 0, marginLeft: '12px' }}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {/* Add new */}
      {adding && (
        <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Label</label>
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addStatus() }}
                placeholder="e.g. Client Review, Final Export…" autoFocus
                style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <button onClick={addStatus} type="button"
              style={{ padding: '7px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              Add
            </button>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Color</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
              {COLOR_PRESETS.map((p, i) => (
                <button key={i} type="button" onClick={() => setNewColor(p)}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: p.bg, border: newColor === p ? `3px solid ${p.fg}` : '2.5px solid transparent' }} />
              ))}
            </div>
          </div>
          {newLabel && (
            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '8px 0 0' }}>
              ID: <code style={{ background: 'var(--surface)', padding: '1px 5px', borderRadius: '4px' }}>{slug(newLabel)}</code>
            </p>
          )}
        </div>
      )}

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '14px' }}>
        {statuses.map((s, i) => {
          const isExpanded = expandedIdx === i
          return (
            <div key={s.value}>
              {/* Row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', background: 'var(--surface)',
                border: '1px solid var(--line-inner)',
                borderRadius: isExpanded ? '8px 8px 0 0' : '8px',
                minWidth: 0,
              }}>
                {/* Swatch — click to expand settings panel */}
                <button type="button" onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  title="Color & settings"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: s.color_bg, border: `3px solid ${s.color_fg}`, padding: 0 }} />

                {/* Label */}
                <input type="text" value={s.label} onChange={e => update(i, { label: e.target.value })}
                  style={{ flex: 1, fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', minWidth: 0, padding: '1px 0' }} />

                {/* Value code */}
                <code style={{ fontSize: '11px', color: 'var(--text-4)', background: 'var(--hover)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {s.value}
                </code>

                {/* Reorder + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === statuses.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === statuses.length - 1 ? 0.25 : 1 }}>↓</button>
                  <button type="button" onClick={() => remove(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
                </div>
              </div>

              {/* Expanded panel: color + flags */}
              {isExpanded && (
                <div style={{
                  padding: '12px 14px', background: 'var(--hover)',
                  border: '1px solid var(--line-inner)', borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  {/* Color picker */}
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>Color</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                      {COLOR_PRESETS.map((p, pi) => (
                        <button key={pi} type="button" onClick={() => update(i, { color_bg: p.bg, color_fg: p.fg })}
                          style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: p.bg, border: s.color_bg === p.bg ? `3px solid ${p.fg}` : '2.5px solid transparent' }} />
                      ))}
                    </div>
                  </div>

                  {/* Flags */}
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const, alignItems: 'flex-start' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!s.is_terminal} onChange={e => update(i, { is_terminal: e.target.checked })} />
                      Terminal (no further transitions)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!s.is_cancellation} onChange={e => update(i, { is_cancellation: e.target.checked })} />
                      Cancellation state
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!s.requires_selection_count} onChange={e => update(i, { requires_selection_count: e.target.checked })} />
                      Requires photo selection count
                    </label>
                  </div>

                  {/* Staff role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-3)', flexShrink: 0 }}>Staff assignment:</label>
                    <select
                      value={s.staff_role ?? ''}
                      onChange={e => update(i, { staff_role: (e.target.value || null) as any })}
                      style={{ fontSize: '13px', padding: '3px 8px', borderRadius: '6px' }}
                    >
                      {STAFF_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 14px' }}>
        ⚠ Renaming a status only changes the display label — the internal value stays the same. Deleting a status won&apos;t affect existing sessions that already use it.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={loading} style={{ padding: '7px 18px', fontSize: '13px' }}>
          {loading ? 'Saving…' : 'Save statuses'}
        </button>
      </div>
    </div>
  )
}
