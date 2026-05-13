'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { saveServiceTypes } from '@/app/actions/studio-config'
import type { ServiceTypeConfig, BookingField } from '@/lib/studio-config'
import { BOOKING_FIELD_DEFINITIONS, DEFAULT_SERVICE_TYPES } from '@/lib/studio-config'
import { COLOR_PRESETS } from '@/lib/color-presets'

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

/** Merge saved booking_fields with defaults so all keys are present */
function normaliseFields(svcValue: string, saved?: BookingField[]): BookingField[] {
  if (saved && saved.length > 0) return saved
  const def = DEFAULT_SERVICE_TYPES.find(t => t.value === svcValue)
  return def?.booking_fields ?? []
}

export default function ServiceTypesForm({ initial }: { initial: ServiceTypeConfig[] }) {
  const [types, setTypes]       = useState<ServiceTypeConfig[]>(
    initial.map(t => ({ ...t, booking_fields: normaliseFields(t.value, t.booking_fields) }))
  )
  const [loading, setLoading]   = useState(false)
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(COLOR_PRESETS[0])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const [fieldsIdx, setFieldsIdx]     = useState<number | null>(null)

  function move(i: number, dir: -1 | 1) {
    const next = [...types]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setTypes(next)
  }

  function update(i: number, patch: Partial<ServiceTypeConfig>) {
    setTypes(prev => prev.map((t, idx) => idx === i ? { ...t, ...patch } : t))
  }

  function remove(i: number) {
    setTypes(prev => prev.filter((_, idx) => idx !== i))
    if (expandedIdx === i) setExpandedIdx(null)
    if (fieldsIdx === i) setFieldsIdx(null)
  }

  function toggleField(typeIdx: number, key: string) {
    setTypes(prev => prev.map((t, i) => {
      if (i !== typeIdx) return t
      const fields = t.booking_fields ?? []
      const exists = fields.find(f => f.key === key)
      return {
        ...t,
        booking_fields: exists
          ? fields.filter(f => f.key !== key)
          : [...fields, { key, required: false }],
      }
    }))
  }

  function toggleRequired(typeIdx: number, key: string) {
    setTypes(prev => prev.map((t, i) => {
      if (i !== typeIdx) return t
      return {
        ...t,
        booking_fields: (t.booking_fields ?? []).map(f =>
          f.key === key ? { ...f, required: !f.required } : f
        ),
      }
    }))
  }

  function addType() {
    const label = newLabel.trim()
    if (!label) return
    const value = slug(label)
    if (types.find(t => t.value === value)) { toast.error('A service type with that name already exists'); return }
    setTypes(prev => [...prev, {
      value, label,
      color_bg: newColor.bg, color_fg: newColor.fg,
      booking_fields: [],
    }])
    setNewLabel('')
    setAdding(false)
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await saveServiceTypes(types)
    if (error) toast.error(error)
    else toast.success('Service types saved')
    setLoading(false)
  }

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Service types</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            What media services your studio offers — and which booking form fields each one needs.
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
                onKeyDown={e => { if (e.key === 'Enter') addType() }}
                placeholder="e.g. Drone, Livestream…" autoFocus
                style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <button onClick={addType} type="button"
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
        {types.map((t, i) => {
          const isColorOpen  = expandedIdx === i
          const isFieldsOpen = fieldsIdx === i
          const activeFields = new Set((t.booking_fields ?? []).map(f => f.key))
          const requiredSet  = new Set((t.booking_fields ?? []).filter(f => f.required).map(f => f.key))

          return (
            <div key={t.value}>
              {/* Row */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px', background: 'var(--surface)',
                border: '1px solid var(--line-inner)',
                borderRadius: isColorOpen || isFieldsOpen ? '8px 8px 0 0' : '8px',
                minWidth: 0,
              }}>
                {/* Color swatch */}
                <button type="button" onClick={() => { setExpandedIdx(isColorOpen ? null : i); setFieldsIdx(null) }}
                  title="Color settings"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: t.color_bg, border: `3px solid ${t.color_fg}`, padding: 0 }} />

                {/* Label */}
                <input type="text" value={t.label} onChange={e => update(i, { label: e.target.value })}
                  style={{ flex: 1, fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', minWidth: 0, padding: '1px 0' }} />

                {/* Value code */}
                <code style={{ fontSize: '11px', color: 'var(--text-4)', background: 'var(--hover)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {t.value}
                </code>

                {/* Fields toggle */}
                <button type="button"
                  onClick={() => { setFieldsIdx(isFieldsOpen ? null : i); setExpandedIdx(null) }}
                  title="Configure booking form fields"
                  style={{
                    fontSize: '11px', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', flexShrink: 0,
                    border: '1px solid var(--line)',
                    background: isFieldsOpen ? 'var(--btn)' : 'transparent',
                    color:      isFieldsOpen ? 'var(--btn-fg)' : 'var(--text-3)',
                  }}>
                  Fields {activeFields.size > 0 ? `(${activeFields.size})` : ''}
                </button>

                {/* Reorder + delete */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === types.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === types.length - 1 ? 0.25 : 1 }}>↓</button>
                  <button type="button" onClick={() => remove(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
                </div>
              </div>

              {/* Color picker panel */}
              {isColorOpen && (
                <div style={{
                  padding: '12px 14px', background: 'var(--hover)',
                  border: '1px solid var(--line-inner)', borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>Color</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {COLOR_PRESETS.map((p, pi) => (
                      <button key={pi} type="button" onClick={() => update(i, { color_bg: p.bg, color_fg: p.fg })}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: p.bg, border: t.color_bg === p.bg ? `3px solid ${p.fg}` : '2.5px solid transparent' }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Booking fields panel */}
              {isFieldsOpen && (
                <div style={{
                  padding: '14px 16px', background: 'var(--hover)',
                  border: '1px solid var(--line-inner)', borderTop: 'none',
                  borderRadius: '0 0 8px 8px',
                }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 10px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Booking form fields for {t.label}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 12px' }}>
                    Choose which fields clients see when booking this service. Toggle <strong>Required</strong> to make a field mandatory.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {BOOKING_FIELD_DEFINITIONS.map(def => {
                      const enabled  = activeFields.has(def.key)
                      const required = requiredSet.has(def.key)
                      return (
                        <div key={def.key} style={{
                          display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 12px', borderRadius: '8px',
                          background: enabled ? 'var(--surface)' : 'transparent',
                          border: `1px solid ${enabled ? 'var(--line)' : 'transparent'}`,
                        }}>
                          {/* Enable toggle */}
                          <button type="button" onClick={() => toggleField(i, def.key)}
                            style={{
                              width: '36px', height: '20px', borderRadius: '10px', flexShrink: 0,
                              border: 'none', cursor: 'pointer', position: 'relative',
                              background: enabled ? 'var(--btn)' : 'var(--line)',
                              transition: 'background .15s',
                            }}>
                            <span style={{
                              position: 'absolute', top: '3px',
                              left: enabled ? '19px' : '3px',
                              width: '14px', height: '14px', borderRadius: '50%',
                              background: 'white', transition: 'left .15s',
                            }} />
                          </button>

                          {/* Field info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 1px', color: enabled ? 'var(--text)' : 'var(--text-3)' }}>
                              {def.label}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{def.description}</p>
                          </div>

                          {/* Required toggle — only shown when enabled */}
                          {enabled && (
                            <button type="button" onClick={() => toggleRequired(i, def.key)}
                              style={{
                                fontSize: '11px', padding: '2px 10px', borderRadius: '20px',
                                border: '1px solid var(--line)', cursor: 'pointer', flexShrink: 0,
                                background: required ? '#fcebeb' : 'transparent',
                                color:      required ? '#a32d2d'  : 'var(--text-4)',
                                fontWeight: required ? '600' : '400',
                              }}>
                              {required ? 'Required' : 'Optional'}
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '12px 0 0' }}>
                    ℹ Event sessions always show Event name + venue regardless of this config.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 14px' }}>
        ⚠ Renaming a service type only changes the display label — the internal value stays the same.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={loading} style={{ padding: '7px 18px', fontSize: '13px' }}>
          {loading ? 'Saving…' : 'Save service types'}
        </button>
      </div>
    </div>
  )
}
