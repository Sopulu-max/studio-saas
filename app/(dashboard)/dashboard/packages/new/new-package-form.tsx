'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addPackage } from '@/app/actions/packages'
import { useStudioConfig } from '@/components/studio-config-provider'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORY_SUGGESTIONS = [
  'Portrait', 'Wedding', 'Maternity', 'Corporate', 'Fashion',
  'Birthday', 'Graduation', 'Engagement', 'Newborn', 'Event',
  'Boudoir', 'Product', 'Lifestyle', 'Family', 'Other',
]

const INCLUSION_SUGGESTIONS = [
  '30 edited photos', '60 edited photos', '100 edited photos',
  '1 hour shoot', '2 hour shoot', '4 hour coverage', '8 hour coverage',
  '2 outfit changes', '3 outfit changes', 'Online gallery delivery',
  'Printed album', 'Same-day previews', 'Video highlights',
  'RAW files', 'Second photographer',
]

type Addon = { name: string; description: string; price: string }
type Section = { title: string; body: string; image_url: string; video_url: string }
type TypedInclusion = { label: string; type: 'service' | 'product' | 'digital' }
type TemplateOption = { template_id: string; name: string; session_type: string | null }
type AvailableService = {
  service_id: string
  name: string
  type: string
  price?: number | null
}
type LinkedService = {
  service_id: string
  is_addon: boolean
  addon_price?: string
}

const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

const INCLUSION_TYPES: { value: 'service' | 'product' | 'digital'; label: string; icon: string }[] = [
  { value: 'service',  label: 'Service',  icon: '🎯' },
  { value: 'product',  label: 'Product',  icon: '📦' },
  { value: 'digital',  label: 'Digital',  icon: '💻' },
]
const SVC_TYPE_ICONS: Record<string, string> = {
  service: '🎯',
  product: '📦',
  digital: '💻',
}
const SVC_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  service: { bg: '#eeedfe', color: '#534ab7' },
  product: { bg: '#faeeda', color: '#854f0b' },
  digital: { bg: '#e6f1fb', color: '#185fa5' },
}

export default function NewPackageForm({
  templates = [],
  availableServices = [],
  defaultOutfits,
  defaultPhotos,
  defaultPrice,
  defaultSessionType,
}: {
  templates?: TemplateOption[]
  availableServices?: AvailableService[]
  defaultOutfits?: string
  defaultPhotos?: string
  defaultPrice?: string
  defaultSessionType?: string
}) {
  const router = useRouter()
  const config = useStudioConfig()

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [dupPackageId, setDupPackageId] = useState('')

  const [contractTemplateId, setContractTemplateId] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', base_price: defaultPrice ?? '', shoot_type: 'Portrait',
    coverage_hours: '', tagline: '', display_order: '0',
  })

  const [pricingType,     setPricingType]     = useState<'fixed' | 'per_project'>('fixed')
  const [isPublic,        setIsPublic]        = useState(true)
  const [inclusions,      setInclusions]      = useState<string[]>([])
  const [inclusionInput,  setInclusionInput]  = useState('')
  const [addons,          setAddons]          = useState<Addon[]>([])
  const [sections,        setSections]        = useState<Section[]>([])
  const [typedInclusions, setTypedInclusions] = useState<TypedInclusion[]>([])
  const [linkedServices,  setLinkedServices]  = useState<LinkedService[]>([])
  const inclusionInputRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })) }

  // ─── Inclusions ──────────────────────────────────────────────────
  function addInclusion() {
    const val = inclusionInput.trim()
    if (!val || inclusions.includes(val)) return
    setInclusions(prev => [...prev, val])
    setInclusionInput('')
    inclusionInputRef.current?.focus()
  }
  function removeInclusion(item: string) { setInclusions(prev => prev.filter(i => i !== item)) }

  // ─── Addons ──────────────────────────────────────────────────────
  function addAddon() { setAddons(prev => [...prev, { name: '', description: '', price: '' }]) }
  function updateAddon(i: number, field: keyof Addon, value: string) {
    setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }
  function removeAddon(i: number) { setAddons(prev => prev.filter((_, idx) => idx !== i)) }

  // ─── Sections ────────────────────────────────────────────────────
  function addSection() { setSections(prev => [...prev, { title: '', body: '', image_url: '', video_url: '' }]) }
  function updateSection(i: number, field: keyof Section, value: string) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  function removeSection(i: number) { setSections(prev => prev.filter((_, idx) => idx !== i)) }
  function moveSection(i: number, dir: -1 | 1) {
    setSections(prev => {
      const next = [...prev]
      const j = i + dir
      if (j < 0 || j >= next.length) return prev
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  // ─── Typed inclusions ────────────────────────────────────────────
  function addTypedInclusion() { setTypedInclusions(prev => [...prev, { label: '', type: 'service' }]) }
  function updateTypedInclusion(i: number, field: keyof TypedInclusion, value: string) {
    setTypedInclusions(prev => prev.map((inc, idx) => idx === i ? { ...inc, [field]: value } : inc))
  }
  function removeTypedInclusion(i: number) { setTypedInclusions(prev => prev.filter((_, idx) => idx !== i)) }

  // ─── Linked catalog services ──────────────────────────────────────
  function getServiceLink(serviceId: string): LinkedService | undefined {
    return linkedServices.find(ls => ls.service_id === serviceId)
  }
  function setServiceMode(serviceId: string, mode: 'none' | 'included' | 'addon') {
    if (mode === 'none') {
      setLinkedServices(prev => prev.filter(ls => ls.service_id !== serviceId))
    } else {
      setLinkedServices(prev => {
        const existing = prev.find(ls => ls.service_id === serviceId)
        if (existing) {
          return prev.map(ls => ls.service_id === serviceId ? { ...ls, is_addon: mode === 'addon' } : ls)
        }
        return [...prev, { service_id: serviceId, is_addon: mode === 'addon', addon_price: '' }]
      })
    }
  }
  function setServiceAddonPrice(serviceId: string, price: string) {
    setLinkedServices(prev => prev.map(ls => ls.service_id === serviceId ? { ...ls, addon_price: price } : ls))
  }

  // ─── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(forceDuplicate = false) {
    if (!form.name)       { setError('Package name is required'); return }
    if (!form.base_price) { setError('Price is required'); return }
    if (!form.shoot_type) { setError('Category is required'); return }
    setLoading(true)
    setError('')
    setDupPackageId('')

    const { error, existingPackageId, packageId } = await addPackage({
      ...form,
      inclusions,
      addons,
      pricing_type:         pricingType,
      is_public:            isPublic,
      display_order:        parseInt(form.display_order) || 0,
      sections,
      typed_inclusions:     typedInclusions,
      linked_services:      linkedServices,
      contract_template_id: contractTemplateId || null,
      force_duplicate:      forceDuplicate,
    })

    if (error === '__DUPLICATE__') {
      setDupPackageId(existingPackageId ?? '')
      setLoading(false)
    } else if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(packageId ? `/dashboard/packages/${packageId}/edit` : '/dashboard/packages')
    }
  }

  const isEvent        = form.shoot_type === 'Event' || form.shoot_type === 'Wedding'
  const isOutdoor      = form.shoot_type === 'Outdoor' || form.shoot_type === 'Maternity'

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New package</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Define a shoot package for your studio</p>
      </div>

      {/* Catalog settings */}
      <div style={sectionStyle}>
        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 14px' }}>Catalog settings</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Visibility</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {([{ val: true, label: 'Public' }, { val: false, label: 'Hidden' }] as const).map(opt => (
                <button key={String(opt.val)} type="button" onClick={() => setIsPublic(opt.val)}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                    border: '0.5px solid', cursor: 'pointer',
                    borderColor: isPublic === opt.val ? 'var(--text)' : 'var(--line)',
                    background: isPublic === opt.val ? 'var(--btn)' : 'var(--surface)',
                    color: isPublic === opt.val ? 'var(--btn-fg)' : 'var(--text-2)',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Display order</label>
            <input type="number" min="0" value={form.display_order}
              onChange={e => update('display_order', e.target.value)}
              placeholder="0" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '14px' }}>
          <label style={labelStyle}>Tagline</label>
          <input type="text" value={form.tagline}
            onChange={e => update('tagline', e.target.value)}
            placeholder="e.g. Perfect for families who want timeless portraits"
            style={inputStyle} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '10px 0 0' }}>
          You can add a cover image after saving.
        </p>
      </div>

      {/* Main details */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Package name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="e.g. 3-outfit portrait session" style={inputStyle} />
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="Brief description of what's included..." rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--hover)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            Pricing type
          </p>
          <div style={{ display: 'flex', gap: '6px' }}>
            {(['fixed', 'per_project'] as const).map(pt => (
              <button key={pt} type="button" onClick={() => setPricingType(pt)}
                style={{
                  padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                  border: '0.5px solid', cursor: 'pointer',
                  borderColor: pricingType === pt ? 'var(--text)' : 'var(--line)',
                  background: pricingType === pt ? 'var(--btn)' : 'var(--surface)',
                  color: pricingType === pt ? 'var(--btn-fg)' : 'var(--text-2)',
                }}>
                {pt === 'fixed' ? 'Fixed rate' : 'Per project (quoted)'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Base price (₦) <span style={{ color: '#e24b4a' }}>*</span></label>
            <input type="number" value={form.base_price} onChange={e => update('base_price', e.target.value)}
              placeholder="85000" style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: (isEvent || isOutdoor) ? '1fr 1fr' : '1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Category <span style={{ color: '#e24b4a' }}>*</span></label>
            <input
              type="text"
              list="category-suggestions"
              value={form.shoot_type}
              onChange={e => update('shoot_type', e.target.value)}
              placeholder="e.g. Portrait, Wedding, Fashion..."
              style={inputStyle}
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          {(isEvent || isOutdoor) && (
            <div>
              <label style={labelStyle}>Coverage hours</label>
              <input type="number" step="0.5" value={form.coverage_hours}
                onChange={e => update('coverage_hours', e.target.value)}
                placeholder="e.g. 8" style={inputStyle} />
            </div>
          )}
        </div>
      </div>

      {/* What's included (text bullets) */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>What&apos;s included</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Quick bullet list of what clients get</p>
        </div>
        {inclusions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {inclusions.map(item => (
              <span key={item} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'var(--active)', borderRadius: '6px', padding: '4px 8px',
                fontSize: '13px', color: 'var(--text)',
              }}>
                ✓ {item}
                <button type="button" onClick={() => removeInclusion(item)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: 'var(--text-3)', fontSize: '14px', lineHeight: 1 }}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <input
              ref={inclusionInputRef}
              type="text"
              list="inclusion-suggestions"
              value={inclusionInput}
              onChange={e => setInclusionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInclusion() } }}
              placeholder="e.g. 30 edited photos, online gallery..."
              style={inputStyle}
            />
            <datalist id="inclusion-suggestions">
              {INCLUSION_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <button type="button" onClick={addInclusion}
            style={{ padding: '8px 14px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
            Add
          </button>
        </div>
      </div>

      {/* Package deliverables (typed) */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Package deliverables</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Typed line items — service, product, or digital</p>
          </div>
          <button onClick={addTypedInclusion} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Add</button>
        </div>
        {typedInclusions.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '1rem 0' }}>No deliverables yet</p>
        )}
        {typedInclusions.map((inc, i) => (
          <div key={i} style={{ border: '1px solid var(--line-inner)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' as const }}>
              {INCLUSION_TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => updateTypedInclusion(i, 'type', t.value)}
                  title={t.label}
                  style={{
                    padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                    border: '0.5px solid',
                    borderColor: inc.type === t.value ? 'var(--text)' : 'var(--line)',
                    background: inc.type === t.value ? 'var(--btn)' : 'var(--surface)',
                    color: inc.type === t.value ? 'var(--btn-fg)' : 'var(--text-2)',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={inc.label}
                onChange={e => updateTypedInclusion(i, 'label', e.target.value)}
                placeholder="e.g. 40 edited high-res images..."
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeTypedInclusion(i)} type="button"
                style={{ fontSize: '12px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Catalog services */}
      {availableServices.length > 0 && (
        <div style={sectionStyle}>
          <div style={{ marginBottom: '14px' }}>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Catalog services</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
              Link reusable services from your catalog as included items or optional add-ons
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <AnimatePresence>
              {availableServices.map((svc, idx) => {
                const link = getServiceLink(svc.service_id)
                const mode = link ? (link.is_addon ? 'addon' : 'included') : 'none'
                const tc   = SVC_TYPE_COLORS[svc.type] ?? SVC_TYPE_COLORS.service

                return (
                  <motion.div 
                    key={svc.service_id} 
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    style={{
                      border: '1px solid',
                      borderColor: mode !== 'none' ? 'var(--text)' : 'var(--line-inner)',
                      borderRadius: '10px',
                      padding: '10px 12px',
                      background: mode !== 'none' ? 'var(--active)' : 'transparent',
                      transition: 'border-color 0.2s, background 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
                      <span style={{
                        fontSize: '11px', padding: '2px 7px', borderRadius: '20px',
                        background: tc.bg, color: tc.color, fontWeight: '500', flexShrink: 0,
                      }}>
                        {SVC_TYPE_ICONS[svc.type]} {svc.type}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{svc.name}</span>
                        {svc.price != null && (
                          <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '6px' }}>
                            ₦{Number(svc.price).toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, background: 'var(--bg)', padding: '4px', borderRadius: '8px', border: '1px solid var(--line-inner)' }}>
                        {(['none', 'included', 'addon'] as const).map(m => (
                          <motion.button 
                            key={m} type="button"
                            onClick={() => setServiceMode(svc.service_id, m)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                              border: 'none', cursor: 'pointer',
                              background:  mode === m ? 'var(--text)' : 'transparent',
                              color:       mode === m ? 'var(--surface)' : 'var(--text-3)',
                              transition: 'color 0.2s, background 0.2s',
                            }}>
                            {m === 'none' ? 'None' : m === 'included' ? 'Included' : 'Add-on'}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence>
                      {mode === 'addon' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--line-inner)' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-3)', flexShrink: 0, fontWeight: '500' }}>
                              Price override (₦)
                            </label>
                            <input
                              type="number" min="0"
                              value={link?.addon_price ?? ''}
                              onChange={e => setServiceAddonPrice(svc.service_id, e.target.value)}
                              placeholder={svc.price != null ? `Default: ${Number(svc.price).toLocaleString()}` : 'e.g. 15000'}
                              style={{ width: '160px', boxSizing: 'border-box' as const, padding: '4px 8px', fontSize: '13px', borderRadius: '6px', border: '1px solid var(--line)' }}
                            />
                            <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>Leave blank to use catalog price</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {linkedServices.length > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '10px 0 0' }}>
              {linkedServices.filter(ls => !ls.is_addon).length} included ·{' '}
              {linkedServices.filter(ls => ls.is_addon).length} add-on
            </p>
          )}
        </div>
      )}

      {/* Add-ons */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Add-ons</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Optional extras clients can add</p>
          </div>
          <button onClick={addAddon} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Add</button>
        </div>
        {addons.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '1rem 0' }}>No add-ons yet</p>
        )}
        {addons.map((addon, i) => (
          <div key={i} style={{ border: '1px solid var(--line-inner)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <input type="text" value={addon.name} onChange={e => updateAddon(i, 'name', e.target.value)}
                  placeholder="e.g. Printed album" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Price (₦)</label>
                <input type="number" value={addon.price} onChange={e => updateAddon(i, 'price', e.target.value)}
                  placeholder="25000" style={inputStyle} />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Description</label>
              <input type="text" value={addon.description} onChange={e => updateAddon(i, 'description', e.target.value)}
                placeholder="Brief description" style={inputStyle} />
            </div>
            <button onClick={() => removeAddon(i)} type="button"
              style={{ fontSize: '12px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* Content sections */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Content sections</p>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Rich blocks for the public package detail page</p>
          </div>
          <button onClick={addSection} type="button" style={{ padding: '6px 12px', fontSize: '13px' }}>+ Add section</button>
        </div>
        {sections.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '1rem 0' }}>No sections yet</p>
        )}
        {sections.map((sec, i) => (
          <div key={i} style={{ border: '1px solid var(--line-inner)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: 0 }}>SECTION {i + 1}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button onClick={() => moveSection(i, -1)} type="button" disabled={i === 0}
                  style={{ fontSize: '13px', background: 'none', border: 'none', cursor: i > 0 ? 'pointer' : 'default', color: i > 0 ? 'var(--text-3)' : 'var(--text-4)', padding: '2px 4px' }}>
                  ↑
                </button>
                <button onClick={() => moveSection(i, 1)} type="button" disabled={i === sections.length - 1}
                  style={{ fontSize: '13px', background: 'none', border: 'none', cursor: i < sections.length - 1 ? 'pointer' : 'default', color: i < sections.length - 1 ? 'var(--text-3)' : 'var(--text-4)', padding: '2px 4px' }}>
                  ↓
                </button>
                <button onClick={() => removeSection(i)} type="button"
                  style={{ fontSize: '12px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Remove
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Title</label>
              <input type="text" value={sec.title}
                onChange={e => updateSection(i, 'title', e.target.value)}
                placeholder="e.g. What to expect, Turnaround time..." style={inputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Body text</label>
              <textarea value={sec.body}
                onChange={e => updateSection(i, 'body', e.target.value)}
                placeholder="Detailed description for this section..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Image URL <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
                <input type="url" value={sec.image_url}
                  onChange={e => updateSection(i, 'image_url', e.target.value)}
                  placeholder="https://..." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Video URL <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(YouTube, Vimeo, or .mp4)</span></label>
                <input type="url" value={sec.video_url}
                  onChange={e => updateSection(i, 'video_url', e.target.value)}
                  placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Contract template */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Contract template</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Optional — auto-selects this template when creating a contract for a booking that uses this package.
          </p>
        </div>
        {templates.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
            No templates yet —{' '}
            <Link href="/dashboard/settings" style={{ color: 'var(--link)' }}>
              build templates in Settings
            </Link>
          </p>
        ) : (
          <select
            value={contractTemplateId}
            onChange={e => setContractTemplateId(e.target.value)}
            style={inputStyle}
          >
            <option value="">— None —</option>
            {templates.map(t => (
              <option key={t.template_id} value={t.template_id}>
                {t.name}{t.session_type ? ` (${t.session_type})` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      {dupPackageId && (
        <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fffbea', border: '1px solid #f5e07a', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#7a5800', margin: '0 0 8px', fontWeight: '500' }}>
            A package with this name already exists.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <Link href={`/dashboard/packages/${dupPackageId}`}
              style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View existing package →
            </Link>
            <span style={{ color: '#ccc' }}>|</span>
            <button type="button" onClick={() => handleSubmit(true)}
              style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: '#7a5800', padding: 0, textDecoration: 'underline' }}>
              Save anyway
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving...' : 'Save package'}
        </button>
        <button onClick={() => router.back()} type="button"
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
