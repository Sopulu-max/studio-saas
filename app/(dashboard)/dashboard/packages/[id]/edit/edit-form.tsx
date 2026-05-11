'use client'

import Link from 'next/link'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { updatePackage } from '@/app/actions/packages'
import { useStudioConfig } from '@/components/studio-config-provider'
import CoverUpload from '@/components/cover-upload'

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
type Section = { title: string; body: string; image_url: string }
type TypedInclusion = { label: string; type: 'service' | 'product' | 'digital' }

type PackageAddonRecord = { name?: string | null; description?: string | null; price?: number | string | null }
type PackageSectionRecord = { section_id: string; title: string; body?: string | null; image_url?: string | null; display_order: number }
type PackageInclusionRecord = { inclusion_id: string; label: string; type: string; display_order: number }

type EditPackageRecord = {
  package_id:        string
  name?:             string | null
  description?:      string | null
  base_price?:       number | string | null
  duration_mins?:    number | null
  shoot_type?:       string | null
  outfits_count?:    number | null
  edited_photos?:    number | null
  coverage_hours?:   number | null
  contract_template?: string | null
  session_type?:     string | null
  service_type?:     string | null
  pricing_type?:     'fixed' | 'per_project' | null
  inclusions?:       string[] | null
  tagline?:          string | null
  cover_url?:        string | null
  is_public?:        boolean | null
  display_order?:    number | null
  package_addons?:   PackageAddonRecord[] | null
  package_sections?: PackageSectionRecord[] | null
  package_inclusions?: PackageInclusionRecord[] | null
}

const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

const INCLUSION_TYPES: { value: 'service' | 'product' | 'digital'; label: string; icon: string }[] = [
  { value: 'service',  label: 'Service',  icon: '🎯' },
  { value: 'product',  label: 'Product',  icon: '📦' },
  { value: 'digital',  label: 'Digital',  icon: '💻' },
]

export default function EditPackageForm({ pkg }: { pkg: EditPackageRecord }) {
  const router = useRouter()
  const config = useStudioConfig()
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [dupPackageId, setDupPackageId] = useState('')

  const [form, setForm] = useState({
    name:              pkg.name           ?? '',
    description:       pkg.description    ?? '',
    base_price:        String(pkg.base_price    ?? ''),
    duration_mins:     String(pkg.duration_mins ?? ''),
    shoot_type:        pkg.shoot_type     ?? '',
    outfits_count:     pkg.outfits_count   != null ? String(pkg.outfits_count)  : '',
    edited_photos:     pkg.edited_photos   != null ? String(pkg.edited_photos)  : '',
    coverage_hours:    pkg.coverage_hours  != null ? String(pkg.coverage_hours) : '',
    contract_template: pkg.contract_template ?? '',
    tagline:           pkg.tagline         ?? '',
    display_order:     String(pkg.display_order ?? '0'),
  })

  const [sessionType,    setSessionType]    = useState<string>(pkg.session_type   ?? config.sessionTypes[0]?.value ?? 'studio')
  const [serviceType,    setServiceType]    = useState<string>(pkg.service_type   ?? config.serviceTypes[0]?.value ?? 'photo')
  const [pricingType,    setPricingType]    = useState<'fixed' | 'per_project'>(pkg.pricing_type ?? 'fixed')
  const [isPublic,       setIsPublic]       = useState<boolean>(pkg.is_public     ?? true)
  const [inclusions,     setInclusions]     = useState<string[]>(pkg.inclusions   ?? [])
  const [inclusionInput, setInclusionInput] = useState('')
  const [addons,         setAddons]         = useState<Addon[]>(
    (pkg.package_addons ?? []).map(a => ({ name: a.name ?? '', description: a.description ?? '', price: String(a.price) }))
  )
  const [sections,       setSections]       = useState<Section[]>(
    (pkg.package_sections ?? []).map(s => ({ title: s.title, body: s.body ?? '', image_url: s.image_url ?? '' }))
  )
  const [typedInclusions, setTypedInclusions] = useState<TypedInclusion[]>(
    (pkg.package_inclusions ?? []).map(i => ({ label: i.label, type: i.type as 'service' | 'product' | 'digital' }))
  )
  const inclusionInputRef = useRef<HTMLInputElement>(null)

  function update(field: string, value: string) { setForm(prev => ({ ...prev, [field]: value })) }

  // ─── Inclusions (text array) ─────────────────────────────────────
  function addInclusion() {
    const val = inclusionInput.trim()
    if (!val || inclusions.includes(val)) return
    setInclusions(prev => [...prev, val])
    setInclusionInput('')
    inclusionInputRef.current?.focus()
  }
  function removeInclusion(item: string) { setInclusions(prev => prev.filter(i => i !== item)) }

  // ─── Add-ons ─────────────────────────────────────────────────────
  function addAddon() { setAddons(prev => [...prev, { name: '', description: '', price: '' }]) }
  function updateAddon(i: number, field: keyof Addon, value: string) {
    setAddons(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }
  function removeAddon(i: number) { setAddons(prev => prev.filter((_, idx) => idx !== i)) }

  // ─── Sections ────────────────────────────────────────────────────
  function addSection() { setSections(prev => [...prev, { title: '', body: '', image_url: '' }]) }
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

  // ─── Submit ──────────────────────────────────────────────────────
  async function handleSubmit(forceDuplicate = false) {
    if (!form.name)       { setError('Package name is required'); return }
    if (!form.base_price) { setError('Price is required'); return }
    if (!form.shoot_type) { setError('Category is required'); return }
    setLoading(true)
    setError('')
    setDupPackageId('')

    const { error, existingPackageId } = await updatePackage(pkg.package_id, {
      ...form,
      session_type:     sessionType,
      service_type:     serviceType,
      inclusions,
      addons,
      pricing_type:     pricingType,
      is_public:        isPublic,
      display_order:    parseInt(form.display_order) || 0,
      sections,
      typed_inclusions: typedInclusions,
      force_duplicate:  forceDuplicate,
    })

    if (error === '__DUPLICATE__') {
      setDupPackageId(existingPackageId ?? '')
      setLoading(false)
    } else if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/packages/${pkg.package_id}`)
    }
  }

  const isEvent        = sessionType === 'event'
  const isOutdoor      = sessionType === 'outdoor'
  const isVideoSession = serviceType === 'video' || serviceType === 'photo_video'

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit package</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{pkg.name}</p>
      </div>

      {/* Cover image */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Cover image</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>Shown in the public catalog and on the package detail page</p>
        </div>
        <CoverUpload packageId={pkg.package_id} currentUrl={pkg.cover_url} />
      </div>

      {/* Visibility + catalog settings */}
      <div style={sectionStyle}>
        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 14px' }}>Catalog settings</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Public toggle */}
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
          {/* Display order */}
          <div>
            <label style={labelStyle}>Display order</label>
            <input type="number" min="0" value={form.display_order}
              onChange={e => update('display_order', e.target.value)}
              placeholder="0" style={inputStyle} />
          </div>
        </div>
        {/* Tagline */}
        <div style={{ marginTop: '14px' }}>
          <label style={labelStyle}>Tagline</label>
          <input type="text" value={form.tagline}
            onChange={e => update('tagline', e.target.value)}
            placeholder="e.g. Perfect for families who want timeless portraits"
            style={inputStyle} />
        </div>
      </div>

      {/* Session type + service type */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Session type</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {config.sessionTypes.map(t => {
              const selected = sessionType === t.value
              return (
                <button key={t.value} type="button" onClick={() => setSessionType(t.value)}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                    border: '0.5px solid', cursor: 'pointer',
                    borderColor: selected ? t.color_fg : 'var(--line)',
                    background: selected ? t.color_bg : 'var(--surface)',
                    color: selected ? t.color_fg : 'var(--text-2)',
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Service type</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {config.serviceTypes.map(t => {
              const selected = serviceType === t.value
              return (
                <button key={t.value} type="button" onClick={() => setServiceType(t.value)}
                  style={{
                    padding: '7px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                    border: '0.5px solid', cursor: 'pointer',
                    borderColor: selected ? t.color_fg : 'var(--line)',
                    background: selected ? t.color_bg : 'var(--surface)',
                    color: selected ? t.color_fg : 'var(--text-2)',
                  }}>
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main details */}
      <div style={sectionStyle}>
        {/* Name */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Package name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="e.g. 3-outfit portrait session" style={inputStyle} />
        </div>

        {/* Description */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)}
            placeholder="Brief description..." rows={2}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Pricing basis */}
        <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--hover)', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
            {isVideoSession ? 'Pricing type' : 'Pricing basis'}
          </p>
          {isVideoSession ? (
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
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Outfits</label>
                <input type="number" min="1" value={form.outfits_count}
                  onChange={e => update('outfits_count', e.target.value)}
                  placeholder="e.g. 3" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Edited photos</label>
                <input type="number" min="1" value={form.edited_photos}
                  onChange={e => update('edited_photos', e.target.value)}
                  placeholder="e.g. 40" style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        {/* Price + Duration */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Base price (₦) <span style={{ color: '#e24b4a' }}>*</span></label>
            <input type="number" value={form.base_price} onChange={e => update('base_price', e.target.value)}
              placeholder="85000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Duration (mins) <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
            <input type="number" value={form.duration_mins} onChange={e => update('duration_mins', e.target.value)}
              placeholder="e.g. 120" style={inputStyle} />
          </div>
        </div>

        {/* Category + Coverage hours */}
        <div style={{ display: 'grid', gridTemplateColumns: (isEvent || isOutdoor) ? '1fr 1fr' : '1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Category <span style={{ color: '#e24b4a' }}>*</span></label>
            <input
              type="text"
              list="category-suggestions-edit"
              value={form.shoot_type}
              onChange={e => update('shoot_type', e.target.value)}
              placeholder="e.g. Portrait, Wedding, Fashion..."
              style={inputStyle}
            />
            <datalist id="category-suggestions-edit">
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

      {/* What&apos;s included (text bullets) */}
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
              list="inclusion-suggestions-edit"
              value={inclusionInput}
              onChange={e => setInclusionInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInclusion() } }}
              placeholder="e.g. 30 edited photos, online gallery..."
              style={inputStyle}
            />
            <datalist id="inclusion-suggestions-edit">
              {INCLUSION_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
          <button type="button" onClick={addInclusion}
            style={{ padding: '8px 14px', fontSize: '13px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', flexShrink: 0 }}>
            Add
          </button>
        </div>
      </div>

      {/* Package deliverables (typed inclusions) */}
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
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              {/* Type selector */}
              <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
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
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="text" value={inc.label}
                onChange={e => updateTypedInclusion(i, 'label', e.target.value)}
                placeholder="e.g. 40 edited high-res images, printed 8x10 album..."
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={() => removeTypedInclusion(i)} type="button"
                style={{ fontSize: '12px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 4px', flexShrink: 0 }}>
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

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
          <p style={{ fontSize: '13px', color: 'var(--text-4)', textAlign: 'center', padding: '1rem 0' }}>No sections yet — add one to build the public detail page</p>
        )}

        {sections.map((sec, i) => (
          <div key={i} style={{ border: '1px solid var(--line-inner)', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
            {/* Header row with move + remove */}
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
                placeholder="Detailed description for this section..."
                rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
            <div>
              <label style={labelStyle}>Image URL <span style={{ color: 'var(--text-4)', fontWeight: '400' }}>(optional)</span></label>
              <input type="url" value={sec.image_url}
                onChange={e => updateSection(i, 'image_url', e.target.value)}
                placeholder="https://..." style={inputStyle} />
            </div>
          </div>
        ))}
      </div>

      {/* Contract template */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>Contract template</p>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
            Optional — overrides the session-type default when creating a contract for sessions using this package.
          </p>
        </div>
        <textarea
          value={form.contract_template}
          onChange={e => update('contract_template', e.target.value)}
          rows={12}
          placeholder="Leave blank to use the session-type default from Settings…"
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-mono)', fontSize: '12.5px', lineHeight: '1.7' }}
        />
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      {dupPackageId && dupPackageId !== pkg.package_id && (
        <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fffbea', border: '1px solid #f5e07a', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#7a5800', margin: '0 0 8px', fontWeight: '500' }}>
            Another package already has this name.
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
          {loading ? 'Saving...' : 'Save changes'}
        </button>
        <button onClick={() => router.push(`/dashboard/packages/${pkg.package_id}`)} type="button"
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
