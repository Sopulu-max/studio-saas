'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addStaff } from '@/app/actions/staff'
import type { StaffRoleConfig } from '@/lib/studio-config'

const WEEKDAYS = [
  { value: 'monday',    label: 'Mon' },
  { value: 'tuesday',   label: 'Tue' },
  { value: 'wednesday', label: 'Wed' },
  { value: 'thursday',  label: 'Thu' },
  { value: 'friday',    label: 'Fri' },
  { value: 'saturday',  label: 'Sat' },
  { value: 'sunday',    label: 'Sun' },
]

export default function NewStaffForm({ staffRoles }: { staffRoles: StaffRoleConfig[] }) {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [existingId, setExistingId] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', hire_date: '',
    roles: [] as string[], working_days: [] as string[],
    is_public: false, bio: '', avatar_url: '', display_order: '0',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleRole(role: string) {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }))
  }

  function toggleDay(day: string) {
    setForm(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }))
  }

  function addCustomRole() {
    const val = customInput.trim()
    if (!val) return
    if (!form.roles.includes(val)) {
      setForm(prev => ({ ...prev, roles: [...prev.roles, val] }))
    }
    setCustomInput('')
  }

  async function handleSubmit() {
    if (!form.full_name) { setError('Name is required'); return }
    if (!form.roles.length) { setError('Select at least one role'); return }
    setLoading(true)
    setError('')
    setExistingId('')
    const { error, existingStaffId } = await addStaff({
      ...form,
      display_order: parseInt(form.display_order) || 0,
    })
    if (error) {
      setError(error)
      if (existingStaffId) setExistingId(existingStaffId as string)
      setLoading(false)
    } else {
      router.push('/dashboard/staff')
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const configRoleValues = new Set(staffRoles.map(r => r.value))
  const customRoles = form.roles.filter(r => !configRoleValues.has(r))

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Add staff</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Add a photographer or team member</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Full name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
            placeholder="Chidi Nwosu" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="chidi@glamourstudio.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Phone</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="08012345678" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Roles <span style={{ color: '#e24b4a' }}>*</span></label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {staffRoles.map(r => {
              const checked = form.roles.includes(r.value)
              return (
                <label key={r.value} style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${checked ? 'var(--btn)' : 'var(--line)'}`,
                  background: checked ? 'color-mix(in srgb, var(--btn) 10%, transparent)' : 'transparent',
                  fontSize: '13px', color: checked ? 'var(--btn)' : 'var(--text-2)',
                  userSelect: 'none' as const,
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleRole(r.value)}
                    style={{ accentColor: 'var(--btn)', width: '14px', height: '14px', flexShrink: 0 }} />
                  {r.label}
                </label>
              )
            })}
          </div>

          {customRoles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px', marginBottom: '10px' }}>
              {customRoles.map(role => (
                <span key={role} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12px', padding: '4px 10px', borderRadius: '20px',
                  background: 'color-mix(in srgb, var(--btn) 10%, transparent)',
                  border: '1px solid var(--btn)', color: 'var(--btn)',
                }}>
                  {role}
                  <button type="button" onClick={() => toggleRole(role)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, fontSize: '14px', lineHeight: 1 }}>
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomRole() } }}
              placeholder="Add custom role…"
              style={{ flex: 1, boxSizing: 'border-box' as const }}
            />
            <button type="button" onClick={addCustomRole}
              className="glass-panel hover-lift" style={{ padding: '8px 14px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-2)', whiteSpace: 'nowrap' as const }}>
              Add
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Working days</label>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 8px' }}>Leave all unchecked if schedule varies</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {WEEKDAYS.map(d => {
              const checked = form.working_days.includes(d.value)
              return (
                <label key={d.value} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '46px', height: '36px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${checked ? 'var(--btn)' : 'var(--line)'}`,
                  background: checked ? 'color-mix(in srgb, var(--btn) 12%, transparent)' : 'transparent',
                  fontSize: '12px', fontWeight: '500',
                  color: checked ? 'var(--btn)' : 'var(--text-3)',
                  userSelect: 'none' as const,
                }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleDay(d.value)}
                    style={{ display: 'none' }} />
                  {d.label}
                </label>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Hire date</label>
          <input type="date" value={form.hire_date} onChange={e => update('hire_date', e.target.value)} style={inputStyle} />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '24px 0' }} />

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px' }}>Storefront Profile</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '16px' }}>
            Choose whether to show this team member on the public storefront.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_public} onChange={e => update('is_public', e.target.checked as any)} />
              <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-1)' }}>Visible on Storefront</span>
            </label>
          </div>

          {form.is_public && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Bio</label>
                <textarea 
                  value={form.bio} 
                  onChange={e => update('bio', e.target.value)} 
                  placeholder="A short biography..." 
                  rows={3} 
                  style={{ ...inputStyle, resize: 'vertical' }} 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Avatar URL</label>
                <input 
                  type="url" 
                  value={form.avatar_url} 
                  onChange={e => update('avatar_url', e.target.value)} 
                  placeholder="https://..." 
                  style={inputStyle} 
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>Display Order</label>
                <input 
                  type="number" 
                  value={form.display_order} 
                  onChange={e => update('display_order', e.target.value)} 
                  style={inputStyle} 
                />
              </div>
            </>
          )}
        </div>

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#e24b4a', margin: '0 0 6px' }}>{error}</p>
            {existingId && (
              <Link href={`/dashboard/staff/${existingId}`}
                style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View their profile →
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving…' : 'Save staff member'}
          </button>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
