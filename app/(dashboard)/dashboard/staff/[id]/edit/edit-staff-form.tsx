'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateStaff } from '@/app/actions/staff'

const ROLES = [
  'photographer', 'editor', 'colour_grader', 'second_shooter', 'assistant', 'manager', 'other',
]

export default function EditStaffForm({
  staffId,
  member,
}: {
  staffId: string
  member: { full_name: string; email: string; role: string; phone: string | null; hire_date: string | null }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: member.full_name ?? '',
    email:     member.email     ?? '',
    role:      member.role      ?? '',
    phone:     member.phone     ?? '',
    hire_date: member.hire_date ?? '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.full_name || !form.email || !form.role) {
      setError('Name, email and role are required')
      return
    }
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
          <label style={labelStyle}>Email address <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="chidi@example.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Phone</label>
          <input type="tel" value={form.phone} onChange={e => update('phone', e.target.value)}
            placeholder="08012345678" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Role <span style={{ color: '#e24b4a' }}>*</span></label>
          <select value={form.role} onChange={e => update('role', e.target.value)} style={inputStyle}>
            <option value="">Select role…</option>
            {ROLES.map(r => (
              <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
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
