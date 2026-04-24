'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaff } from '@/app/actions/staff'

const ROLES = [
  { value: 'photographer',   label: 'Photographer' },
  { value: 'second_shooter', label: 'Second shooter' },
  { value: 'videographer',   label: 'Videographer' },
  { value: 'editor',         label: 'Editor / retoucher' },
  { value: 'colour_grader',  label: 'Colour grader' },
  { value: 'assistant',      label: 'Assistant' },
  { value: 'manager',        label: 'Studio manager' },
  { value: 'other',          label: 'Other' },
]

export default function EditStaffForm({
  staffId,
  member,
}: {
  staffId: string
  member: {
    full_name: string
    email:     string
    roles:     string[] | null
    role:      string | null       // legacy fallback
    phone:     string | null
    hire_date: string | null
  }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  // Prefer `roles` array; fall back to single `role` value for old records
  const initialRoles =
    member.roles && member.roles.length > 0
      ? member.roles
      : member.role
        ? [member.role]
        : []

  const [form, setForm] = useState({
    full_name: member.full_name ?? '',
    email:     member.email     ?? '',
    phone:     member.phone     ?? '',
    hire_date: member.hire_date ?? '',
    roles:     initialRoles,
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

  async function handleSubmit() {
    if (!form.full_name) { setError('Name is required'); return }
    if (!form.roles.length) { setError('Select at least one role'); return }
    setLoading(true)
    setError('')
    const { error } = await updateStaff(staffId, form)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/staff/${staffId}`)
      router.refresh()
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit staff member</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Update details for {member.full_name}</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Full name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
            placeholder="Chidi Okonkwo" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email address</label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="chidi@example.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Phone</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="08012345678" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Roles <span style={{ color: '#e24b4a' }}>*</span></label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {ROLES.map(r => {
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
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleRole(r.value)}
                    style={{ accentColor: 'var(--btn)', width: '14px', height: '14px', flexShrink: 0 }}
                  />
                  {r.label}
                </label>
              )
            })}
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Hire date</label>
          <input type="date" value={form.hire_date} onChange={e => update('hire_date', e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/staff/${staffId}`)}
            style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
