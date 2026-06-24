'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addService } from '@/app/actions/services'
import { useStudioConfig } from '@/components/studio-config-provider'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { GripVertical } from 'lucide-react'

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

type Section = { id: string; title: string; body: string; image_url: string; video_url: string; layout: string }

function SectionItem({ sec, i, updateSection, removeSection }: { sec: Section; i: number; updateSection: (i: number, field: keyof Section, val: string) => void; removeSection: (i: number) => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={sec} dragListener={false} dragControls={controls} style={{ border: '1px solid var(--line-inner)', borderRadius: '8px', padding: '12px', marginBottom: '8px', background: 'var(--surface)', listStyle: 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button type="button" onPointerDown={(e) => controls.start(e)} style={{ cursor: 'grab', background: 'none', border: 'none', color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center', touchAction: 'none' }}>
            <GripVertical size={16} />
          </button>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: 0 }}>SECTION {i + 1}</p>
        </div>
        <button onClick={() => removeSection(i)} type="button" style={{ fontSize: '12px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          Remove
        </button>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Layout</label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(['standard', 'split_left', 'split_right', 'hero'] as const).map(l => (
            <button key={l} type="button" onClick={() => updateSection(i, 'layout', l)}
              style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: '0.5px solid', borderColor: sec.layout === l ? 'var(--text)' : 'var(--line)', background: sec.layout === l ? 'var(--btn)' : 'var(--surface)', color: sec.layout === l ? 'var(--btn-fg)' : 'var(--text-2)' }}>
              {l === 'standard' ? 'Standard' : l === 'split_left' ? 'Image Left' : l === 'split_right' ? 'Image Right' : 'Hero'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Title</label>
        <input type="text" value={sec.title} onChange={e => updateSection(i, 'title', e.target.value)} placeholder="e.g. What to expect..." style={inputStyle} />
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Body text</label>
        <textarea value={sec.body} onChange={e => updateSection(i, 'body', e.target.value)} placeholder="Detailed description..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Image URL <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
          <input type="url" value={sec.image_url} onChange={e => updateSection(i, 'image_url', e.target.value)} placeholder="https://..." style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Video URL <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(YouTube, Vimeo, or .mp4)</span></label>
          <input type="url" value={sec.video_url} onChange={e => updateSection(i, 'video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
        </div>
      </div>
    </Reorder.Item>
  )
}

export default function NewServicePage() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const config = useStudioConfig()

  const [form, setForm] = useState({
    name:          '',
    type:          'service' as 'service' | 'product' | 'digital',
    description:   '',
    price:         '',
    duration_mins: '',
    display_order: '0',
    is_active:     true,
    category_value: '',
    session_type:  'any',
    outfits_count: '',
    booking_fields: [] as any[],
    sections: [] as Section[],
  })

  function addSection() {
    setForm(prev => ({ ...prev, sections: [...prev.sections, { id: Math.random().toString(), title: '', body: '', image_url: '', video_url: '', layout: 'standard' }] }))
  }
  function updateSection(i: number, field: keyof Section, value: string) {
    setForm(prev => {
      const next = [...prev.sections]
      next[i] = { ...next[i], [field]: value }
      return { ...prev, sections: next }
    })
  }
  function removeSection(i: number) {
    setForm(prev => ({ ...prev, sections: prev.sections.filter((_, idx) => idx !== i) }))
  }

  function update(field: string, value: string | boolean | any[]) {
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

          {form.type === 'service' && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
              <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-2)' }}>Structural requirements</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input
                    type="text"
                    value={form.category_value}
                    onChange={e => update('category_value', e.target.value)}
                    placeholder="e.g. Photography, Drone..."
                    style={{ ...inputStyle, padding: '8px' }}
                  />
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '4px 0 0' }}>Used for filtering in the booking wizard</p>
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

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--line-inner)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: 0, color: 'var(--text-2)' }}>Custom Booking Questions</p>
                  <button type="button" onClick={() => update('booking_fields', [...form.booking_fields, { id: Date.now().toString(), label: '', type: 'text', required: false }])}
                    style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '4px', background: 'var(--hover)', border: '1px solid var(--line-inner)', cursor: 'pointer' }}>
                    + Add Question
                  </button>
                </div>
                {form.booking_fields.map((field, i) => (
                  <div key={field.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input type="text" value={field.label} onChange={e => {
                        const next = [...form.booking_fields]
                        next[i].label = e.target.value
                        update('booking_fields', next)
                      }} placeholder="e.g. Do you need a makeup artist?" style={{ ...inputStyle, padding: '6px' }} />
                    </div>
                    <select value={field.type} onChange={e => {
                      const next = [...form.booking_fields]
                      next[i].type = e.target.value
                      update('booking_fields', next)
                    }} style={{ padding: '6px', width: '100px', flexShrink: 0, borderRadius: '6px', border: '1px solid var(--line-inner)' }}>
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Yes/No</option>
                    </select>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginTop: '6px' }}>
                      <input type="checkbox" checked={field.required} onChange={e => {
                        const next = [...form.booking_fields]
                        next[i].required = e.target.checked
                        update('booking_fields', next)
                      }} /> Req.
                    </label>
                    <button type="button" onClick={() => {
                      const next = form.booking_fields.filter((_, idx) => idx !== i)
                      update('booking_fields', next)
                    }} style={{ color: '#e24b4a', background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}>×</button>
                  </div>
                ))}
                {form.booking_fields.length === 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>No custom questions. Add one to ask clients specific details when booking.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content sections */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Content sections</p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Rich blocks for the public service detail page</p>
            </div>
            <button onClick={addSection} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Add section</button>
          </div>
          {form.sections.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '1rem 0' }}>No sections yet</p>
          )}
          {form.sections.length > 0 && (
            <Reorder.Group axis="y" values={form.sections} onReorder={(vals) => setForm(prev => ({ ...prev, sections: vals }))} style={{ padding: 0, margin: 0 }}>
              {form.sections.map((sec, i) => (
                <SectionItem key={sec.id} sec={sec} i={i} updateSection={updateSection} removeSection={removeSection} />
              ))}
            </Reorder.Group>
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
