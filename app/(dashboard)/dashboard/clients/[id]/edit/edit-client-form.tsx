'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateClient } from '@/app/actions/clients'

export default function EditClientForm({
  clientId,
  client,
}: {
  clientId: string
  client: { full_name: string; email: string; phone: string | null; address: string | null }
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: client.full_name ?? '',
    email:     client.email     ?? '',
    phone:     client.phone     ?? '',
    address:   client.address   ?? '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.full_name) {
      setError('Name is required')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await updateClient(clientId, form)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/clients/${clientId}`)
      router.refresh()
    }
  }

  const fields = [
    { key: 'full_name', label: 'Full name',     type: 'text',  placeholder: 'Ada Okafor',               required: true },
    { key: 'email',     label: 'Email address', type: 'email', placeholder: 'ada@example.com',           required: false },
    { key: 'phone',     label: 'Phone number',  type: 'tel',   placeholder: '+234 800 000 0000',         required: false },
    { key: 'address',   label: 'Address',       type: 'text',  placeholder: '123 Lekki Phase 1, Lagos',  required: false },
  ]

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit client</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Update contact details</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        {fields.map(field => (
          <div key={field.key} style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }}>
              {field.label} {field.required && <span style={{ color: '#e24b4a' }}>*</span>}
            </label>
            <input
              type={field.type}
              value={form[field.key as keyof typeof form]}
              onChange={e => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={{ width: '100%', boxSizing: 'border-box' as const }}
            />
          </div>
        ))}

        {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '16px' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/clients/${clientId}`)}
            style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
