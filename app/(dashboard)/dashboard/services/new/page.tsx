'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addService } from '@/app/actions/services'

const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
const sectionStyle = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: '12px', padding: '1.5rem', marginBottom: '12px',
}

const SERVICE_TYPES: { value: 'service' | 'product' | 'digital'; label: string; icon: string; desc: string }[] = [
  { value: 'service', label: 'Service',  icon: '🎯', desc: 'Photography sessions, retouching, consultation' },
  { value: 'product', label: 'Product',  icon: '📦', desc: 'Prints, albums, frames, merchandise' },
  { value: 'digital', label: 'Digital',  icon: '💻', desc: 'Digital files, gallery access, video reels' },
]

export default function NewServicePage() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    name:          '',
    type:          'service' as 'service' | 'product' | 'digital',
    description:   '',
    price:         '',
    duration_mins: '',
    display_order: '0',
    is_active:     true,
  })

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Service name is required'); return }

    setLoading(true)
    setError('')

    const { error: err, serviceId } = await addService(form)
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      router.push(`/dashboard/services/${serviceId}`)
    }
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New service</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Add a service, product, or digital offering to your catalog
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Type */}
        <div style={sectionStyle}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 12px' }}>Type</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {SERVICE_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => update('type', t.value)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px', textAlign: 'left',
                  cursor: 'pointer', border: '1px solid',
                  borderColor: form.type === t.value ? 'var(--text)' : 'var(--line)',
                  background:  form.type === t.value ? 'var(--active)' : 'var(--surface)',
                }}
              >
                <span style={{ fontSize: '20px' }}>{t.icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px', color: 'var(--text)' }}>{t.label}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div style={sectionStyle}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 16px' }}>Details</p>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Name <span style={{ color: '#e24b4a' }}>*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. 40 edited images, Printed 10×8 album, Video reel..."
              style={inputStyle}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Description <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
            <textarea
              value={form.description}
              onChange={e => update('description', e.target.value)}
              placeholder="Brief description clients will see when booking..."
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Price (₦) <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={e => update('price', e.target.value)}
                placeholder="e.g. 25000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (mins) <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
              <input
                type="number"
                min="0"
                value={form.duration_mins}
                onChange={e => update('duration_mins', e.target.value)}
                placeholder="e.g. 60"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {/* Settings */}
        <div style={sectionStyle}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 16px' }}>Settings</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Status</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {([{ val: true, label: 'Active' }, { val: false, label: 'Inactive' }] as const).map(opt => (
                  <button
                    key={String(opt.val)}
                    type="button"
                    onClick={() => update('is_active', opt.val)}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                      border: '0.5px solid', cursor: 'pointer',
                      borderColor: form.is_active === opt.val ? 'var(--text)' : 'var(--line)',
                      background:  form.is_active === opt.val ? 'var(--btn)' : 'var(--surface)',
                      color:       form.is_active === opt.val ? 'var(--btn-fg)' : 'var(--text-2)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Display order</label>
              <input
                type="number"
                min="0"
                value={form.display_order}
                onChange={e => update('display_order', e.target.value)}
                placeholder="0"
                style={inputStyle}
              />
              <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '4px 0 0' }}>Lower = shown first</p>
            </div>
          </div>
        </div>

        {error && (
          <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="submit" disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving...' : 'Add service'}
          </button>
          <Link
            href="/dashboard/services"
            style={{
              padding: '10px 16px', background: 'transparent',
              color: 'var(--text-2)', border: '1px solid var(--line)',
              borderRadius: '8px', textDecoration: 'none', fontSize: '14px',
            }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
