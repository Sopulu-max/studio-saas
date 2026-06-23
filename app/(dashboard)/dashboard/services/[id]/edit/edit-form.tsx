'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateService } from '@/app/actions/services'
import { useStudioConfig } from '@/components/studio-config-provider'

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

type ServiceRecord = {
  service_id:    string
  name:          string
  type:          string
  description?:  string | null
  price?:        number | null
  duration_mins?: number | null
  is_active:     boolean
  display_order: number
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
}

export default function EditServiceForm({ svc }: { svc: ServiceRecord }) {
  const router  = useRouter()
  const config  = useStudioConfig()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [form, setForm] = useState({
    name:          svc.name,
    type:          svc.type as 'service' | 'product' | 'digital',
    description:   svc.description  ?? '',
    price:         svc.price        != null ? String(svc.price) : '',
    duration_mins: svc.duration_mins != null ? String(svc.duration_mins) : '',
    display_order: String(svc.display_order),
    is_active:     svc.is_active,
    category_value: svc.category_value || '',
    session_type:  svc.session_type || 'any',
    outfits_count: svc.outfits_count != null ? String(svc.outfits_count) : '',
  })

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Service name is required'); return }

    setLoading(true)
    setError('')

    const { error: err } = await updateService(svc.service_id, form)
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      router.push(`/dashboard/services/${svc.service_id}`)
    }
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit service</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{svc.name}</p>
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
              placeholder="e.g. 40 edited images, Printed 10×8 album..."
              style={inputStyle}
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

          {form.type === 'service' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
              <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-2)' }}>Structural requirements</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select
                    value={form.category_value}
                    onChange={e => update('category_value', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  >
                    <option value="">— None —</option>
                    {config.serviceTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '4px 0 0' }}>Determines booking form fields</p>
                </div>
                <div>
                  <label style={labelStyle}>Session Type</label>
                  <select
                    value={form.session_type}
                    onChange={e => update('session_type', e.target.value)}
                    style={{ ...inputStyle, padding: '8px' }}
                  >
                    <option value="any">Any (Client chooses)</option>
                    {config.sessionTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Outfits count <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
                <input
                  type="number"
                  min="0"
                  value={form.outfits_count}
                  onChange={e => update('outfits_count', e.target.value)}
                  placeholder="e.g. 2"
                  style={inputStyle}
                />
              </div>
            </div>
          )}
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
            {loading ? 'Saving...' : 'Save changes'}
          </button>
          <Link
            href={`/dashboard/services/${svc.service_id}`}
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
