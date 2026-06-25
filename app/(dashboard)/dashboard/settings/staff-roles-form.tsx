'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { saveStaffRoles } from '@/app/actions/studio-config'
import type { StaffRoleConfig } from '@/lib/studio-config'
import { COLOR_PRESETS } from '@/lib/color-presets'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

function slug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function StaffRolesForm({ initial }: { initial: StaffRoleConfig[] }) {
  const [roles, setRoles]           = useState<StaffRoleConfig[]>(initial)
  const [loading, setLoading]       = useState(false)
  const [adding, setAdding]         = useState(false)
  const [newLabel, setNewLabel]     = useState('')
  const [newColor, setNewColor]     = useState(COLOR_PRESETS[0])
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  function move(i: number, dir: -1 | 1) {
    const next = [...roles]
    const j = i + dir
    if (j < 0 || j >= next.length) return
    ;[next[i], next[j]] = [next[j], next[i]]
    setRoles(next)
  }

  function update(i: number, patch: Partial<StaffRoleConfig>) {
    setRoles(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function remove(i: number) {
    setRoles(prev => prev.filter((_, idx) => idx !== i))
    if (expandedIdx === i) setExpandedIdx(null)
  }

  function addRole() {
    const label = newLabel.trim()
    if (!label) return
    const value = slug(label)
    if (roles.find(r => r.value === value)) { toast.error('A role with that name already exists'); return }
    setRoles(prev => [...prev, { value, label, color_bg: newColor.bg, color_fg: newColor.fg }])
    setNewLabel('')
    setAdding(false)
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await saveStaffRoles(roles)
    if (error) toast.error(error)
    else toast.success('Staff roles saved')
    setLoading(false)
  }

  return (
    <div style={{ marginBottom: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Staff roles</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Define the roles in your team. These appear on staff profiles and can be linked to workflow stages.
          </p>
        </div>
        <button onClick={() => setAdding(v => !v)} type="button"
          style={{ padding: '5px 12px', fontSize: '13px', flexShrink: 0, marginLeft: '12px' }}>
          {adding ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {adding && (
        <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Label</label>
              <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addRole() }}
                placeholder="e.g. Drone pilot, BTS photographer…" autoFocus
                style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>
            <button onClick={addRole} type="button"
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

      <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '14px' }}>
        {roles.map((r, i) => {
          const isColorOpen = expandedIdx === i
          return (
            <AnimatedItem key={r.value} delay={i * 0.05}>
              <div className="glass-panel" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 10px',
                borderRadius: isColorOpen ? '8px 8px 0 0' : '8px',
                minWidth: 0,
              }}>
                <button type="button" onClick={() => setExpandedIdx(isColorOpen ? null : i)}
                  title="Color settings"
                  style={{ width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0, cursor: 'pointer', background: r.color_bg, border: `3px solid ${r.color_fg}`, padding: 0 }} />

                <input type="text" value={r.label} onChange={e => update(i, { label: e.target.value })}
                  style={{ flex: 1, fontSize: '13px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', minWidth: 0, padding: '1px 0' }} />

                <code style={{ fontSize: '11px', color: 'var(--text-4)', background: 'var(--hover)', padding: '1px 6px', borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  {r.value}
                </code>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === 0 ? 0.25 : 1 }}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === roles.length - 1}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 5px', fontSize: '13px', opacity: i === roles.length - 1 ? 0.25 : 1 }}>↓</button>
                  <button type="button" onClick={() => remove(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: '16px', lineHeight: 1, padding: '2px 4px' }}>×</button>
                </div>
              </div>

              {isColorOpen && (
                <div style={{ padding: '12px 14px', background: 'var(--hover)', border: '1px solid var(--line-inner)', borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>Color</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {COLOR_PRESETS.map((p, pi) => (
                      <button key={pi} type="button" onClick={() => update(i, { color_bg: p.bg, color_fg: p.fg })}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: p.bg, border: r.color_bg === p.bg ? `3px solid ${p.fg}` : '2.5px solid transparent' }} />
                    ))}
                  </div>
                </div>
              )}
            </AnimatedItem>
          )
        })}
      </AnimatedList>

      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 14px' }}>
        ⚠ Renaming a role only changes the display label — the internal value stays the same.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={loading} style={{ padding: '7px 18px', fontSize: '13px' }}>
          {loading ? 'Saving…' : 'Save roles'}
        </button>
      </div>
    </div>
  )
}
