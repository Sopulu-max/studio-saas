'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addPackage } from '@/app/actions/packages'
import { useStudioConfig } from '@/components/studio-config-provider'
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion'
import { GripVertical } from 'lucide-react'

const CATEGORY_SUGGESTIONS = [
  'Portrait', 'Wedding', 'Maternity', 'Corporate', 'Fashion',
  'Birthday', 'Graduation', 'Engagement', 'Newborn', 'Event',
  'Boudoir', 'Product', 'Lifestyle', 'Family', 'Other',
]



type Addon = { name: string; description: string; price: string }
type Section = { id: string; title: string; body: string; image_url: string; video_url: string; layout: string }
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
const sectionStyle = { padding: '1.5rem', marginBottom: '12px' }

const INCLUSION_TYPES: { value: 'service' | 'product' | 'digital'; label: string; icon: string }[] = [
  { value: 'service',  label: 'Service',  icon: '🎯' },
  { value: 'product',  label: 'Product',  icon: '📦' },
  { value: 'digital',  label: 'Digital',  icon: '💻' },
]

function SectionItem({ sec, i, updateSection, removeSection }: { sec: Section; i: number; updateSection: (i: number, field: keyof Section, val: string) => void; removeSection: (i: number) => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={sec} dragListener={false} dragControls={controls} className="glass-panel" style={{ padding: '12px', marginBottom: '8px', listStyle: 'none' }}>
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
  defaultPrice,
}: {
  templates?: TemplateOption[]
  availableServices?: AvailableService[]
  defaultPrice?: string
}) {
  const router = useRouter()
  const config = useStudioConfig()

  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [dupPackageId, setDupPackageId] = useState('')

  const [contractTemplateId, setContractTemplateId] = useState('')

  const [form, setForm] = useState({
    name: '', description: '', base_price: defaultPrice ?? '', shoot_type: 'Portrait',
    coverage_hours: '', display_order: '0',
  })

  const [pricingType,     setPricingType]     = useState<'fixed' | 'per_project'>('fixed')
  const [isPublic,        setIsPublic]        = useState(true)
  const [addons,          setAddons]          = useState<Addon[]>([])
  const [sections,        setSections]        = useState<Section[]>([])
  const [typedInclusions, setTypedInclusions] = useState<TypedInclusion[]>([])
  const [linkedServices,  setLinkedServices]  = useState<LinkedService[]>([])
  const previewRef        = useRef<HTMLIFrameElement>(null)

  // Sync to live preview
  useEffect(() => {
    if (previewRef.current?.contentWindow) {
      previewRef.current.contentWindow.postMessage({
        type: 'UPDATE_PREVIEW',
        data: {
          pkg: {
            ...form,
            sections,
            addons,
            typed_inclusions: typedInclusions,
            linked_services: linkedServices.map(ls => ({
              ...ls,
              service_id: availableServices.find(as => as.service_id === ls.service_id) || { name: 'Linked Service', type: 'service', price: 0 }
            })),
          },
          studio: { name: 'Studio Name', logo_url: '' },
          theme: { preset: 'modern', primary: '#2563eb', bg: '#ffffff', serif: false, radius: 12 },
        }
      }, '*')
    }
  }, [form, sections, addons, typedInclusions, linkedServices, config])

  function update(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })) }



  // ─── Addons ──────────────────────────────────────────────────────
  function addAddon() { setAddons(prev => [...prev, { name: '', description: '', price: '' }]) }
  function updateAddon(i: number, field: keyof Addon, value: string) {
    setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }
  function removeAddon(i: number) { setAddons(prev => prev.filter((_, idx) => idx !== i)) }

  // ─── Sections ────────────────────────────────────────────────────
  function addSection() { setSections(prev => [...prev, { id: Math.random().toString(), title: '', body: '', image_url: '', video_url: '', layout: 'standard' }]) }
  function updateSection(i: number, field: keyof Section, value: string) {
    setSections(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }
  function removeSection(i: number) { setSections(prev => prev.filter((_, idx) => idx !== i)) }

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
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 450px) 1fr', gap: '24px', alignItems: 'start', height: 'calc(100vh - 100px)' }}>
      {/* Left Panel: Form */}
      <div style={{ overflowY: 'auto', height: '100%', paddingRight: '12px', paddingBottom: '120px' }}>
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
        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '10px 0 0' }}>
          You can add a thumbnail image after saving.
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
          <label style={labelStyle}>Brief Summary <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(For bots & invoices - not shown on public page)</span></label>
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
        <div className="glass-panel" style={sectionStyle}>
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
        {sections.length > 0 && (
          <Reorder.Group axis="y" values={sections} onReorder={setSections} style={{ padding: 0, margin: 0 }}>
            {sections.map((sec, i) => (
              <SectionItem key={sec.id} sec={sec} i={i} updateSection={updateSection} removeSection={removeSection} />
            ))}
          </Reorder.Group>
        )}
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

      {/* Right Panel: Live Preview */}
      <div style={{ height: '100%', background: 'var(--bg)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line)' }}>
        <div style={{ padding: '8px 16px', background: 'var(--surface)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Live Preview</span>
          <span style={{ fontSize: '11px', color: 'var(--text-4)' }}>Updates as you type</span>
        </div>
        <iframe
          ref={previewRef}
          src="/preview/package"
          style={{ width: '100%', height: 'calc(100% - 37px)', border: 'none' }}
        />
      </div>
    </div>
  )
}
