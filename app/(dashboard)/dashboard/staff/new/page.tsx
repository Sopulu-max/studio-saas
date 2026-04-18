'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addStaff } from '@/app/actions/staff'

const ROLE_SUGGESTIONS = [
  'Lead photographer',
  'Second shooter',
  'Photo editor',
  'Colour grader',
  'Studio manager',
  'Receptionist',
  'Assistant',
  'Videographer',
  'Makeup artist',
  'Lighting technician',
]

export default function NewStaffPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', email: '', role: '', hire_date: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.full_name || !form.email) {
      setError('Name and email are required')
      return
    }
    if (!form.role) {
      setError('Role is required')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await addStaff(form)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push('/dashboard/staff')
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Add staff</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Add a photographer or team member</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Full name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.full_name} onChange={e => update('full_name', e.target.value)}
            placeholder="Chidi Nwosu" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Email <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="email" value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="chidi@glamourstudio.com" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Role <span style={{ color: '#e24b4a' }}>*</span></label>
          <input
            type="text"
            list="role-suggestions"
            value={form.role}
            onChange={e => update('role', e.target.value)}
            placeholder="e.g. Lead photographer"
            style={inputStyle}
          />
          <datalist id="role-suggestions">
            {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
          </datalist>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '5px 0 0' }}>
            Type your own or pick a suggestion
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Hire date</label>
          <input type="date" value={form.hire_date} onChange={e => update('hire_date', e.target.value)} style={inputStyle} />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving...' : 'Save staff member'}
          </button>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}