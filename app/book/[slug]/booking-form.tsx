'use client'

import { useState } from 'react'
import { submitBookingRequest } from '@/app/actions/public'

const CATEGORY_SUGGESTIONS = [
  'Birthday','Anniversary','Maternity','Newborn','Graduation',
  'Engagement','Pre-wedding','Wedding','Baby Shower','Naming Ceremony',
  'Prom','Corporate','Family','Portrait','Boudoir','Pet',
]

const TYPE_ICONS: Record<string, string> = {
  service: '🎯',
  product: '📦',
  digital: '💻',
}

type BookingFieldConfig = { key: string; required: boolean }

type CatalogService = {
  service_id:   string
  name:         string
  type:         string
  description?: string | null
  price?:       number | null
}

type PackageLinkedService = {
  service_id:   string
  name:         string
  type:         string
  description?: string | null
  price?:       number | null
  is_addon:     boolean
  addon_price?: number | null
}

type PreselectedPackage = {
  package_id:     string
  name:           string
  tagline?:       string | null
  base_price?:    number | null
  session_type?:  string | null
  service_type?:  string | null
  outfits_count?: number | null
  duration_mins?: number | null
}

export default function BookingForm({
  studioId,
  studioName,
  sessionTypes,
  serviceTypes,
  catalogServices = [],
  preselectedPackage = null,
  packageLinkedServices = [],
}: {
  studioId:               string
  studioName:             string
  sessionTypes:           { value: string; label: string; is_event?: boolean }[]
  serviceTypes:           { value: string; label: string; booking_fields: BookingFieldConfig[] }[]
  catalogServices?:       CatalogService[]
  preselectedPackage?:    PreselectedPackage | null
  packageLinkedServices?: PackageLinkedService[]
}) {
  const includedIds = new Set(
    packageLinkedServices.filter(s => !s.is_addon).map(s => s.service_id)
  )
  const pkgAddonIds = new Set(
    packageLinkedServices.filter(s => s.is_addon).map(s => s.service_id)
  )

  const [submitted, setSubmitted] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const [form, setForm] = useState({
    full_name:        '',
    phone:            '',
    email:            '',
    session_type:     preselectedPackage?.session_type ?? sessionTypes[0]?.value ?? '',
    service_type:     preselectedPackage?.service_type ?? serviceTypes[0]?.value ?? '',
    preferred_date:   '',
    outfits_count:    preselectedPackage?.outfits_count != null ? String(preselectedPackage.outfits_count) : '',
    location_address: '',
    shoot_type:       '',
    event_name:       '',
    event_date:       '',
    video_duration:   '',
    coverage_hours:   '',
    crew_size:        '',
    notes:            '',
  })

  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    packageLinkedServices.filter(s => !s.is_addon).map(s => s.service_id)
  )

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleService(id: string) {
    if (includedIds.has(id)) return
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const isEvent = sessionTypes.find(t => t.value === form.session_type)?.is_event ?? false

  const activeServiceType  = serviceTypes.find(t => t.value === form.service_type) ?? serviceTypes[0]
  const serviceBookingFields: BookingFieldConfig[] = activeServiceType?.booking_fields ?? []
  const fieldEnabled  = (key: string) => serviceBookingFields.some(f => f.key === key)
  const fieldRequired = (key: string) => serviceBookingFields.find(f => f.key === key)?.required ?? false

  const showOutfits        = !isEvent && fieldEnabled('outfits_count')
  const showOccasion       = !isEvent && fieldEnabled('shoot_type')
  const showOccDate        = !isEvent && fieldEnabled('event_date')
  const showLocation       = isEvent  || fieldEnabled('location_address')
  const showEventName      = isEvent  || fieldEnabled('event_name')
  const showVideoDuration  = fieldEnabled('video_duration')
  const showCoverageHours  = fieldEnabled('coverage_hours')
  const showCrewSize       = fieldEnabled('crew_size')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const pkgLinkedServiceIds = new Set(packageLinkedServices.map(s => s.service_id))
  const otherCatalogSvcs    = catalogServices.filter(s => !pkgLinkedServiceIds.has(s.service_id))
  const pkgAddonSvcs        = packageLinkedServices.filter(s => s.is_addon)
  const pkgIncludedSvcs     = packageLinkedServices.filter(s => !s.is_addon)

  const pkgBase = preselectedPackage?.base_price != null ? Number(preselectedPackage.base_price) : null

  const selectedOptional = selectedServiceIds.filter(id => !includedIds.has(id))
  const optionalTotal = selectedOptional.reduce((sum, id) => {
    const pkgAddon = pkgAddonSvcs.find(s => s.service_id === id)
    if (pkgAddon) return sum + (pkgAddon.addon_price ?? pkgAddon.price ?? 0)
    const catalog  = catalogServices.find(s => s.service_id === id)
    return sum + (catalog?.price ?? 0)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim())              { setError('Please enter your full name');    return }
    if (!form.phone.trim())                  { setError('Please enter your phone number'); return }
    if (!form.preferred_date)                { setError('Please select a preferred date'); return }
    if (isEvent && !form.event_name.trim())  { setError('Please enter the event name');    return }

    if (showOutfits    && fieldRequired('outfits_count')    && !form.outfits_count.trim())    { setError('Please enter the number of outfits'); return }
    if (showOccasion   && fieldRequired('shoot_type')       && !form.shoot_type.trim())       { setError('Please enter the occasion type'); return }
    if (showEventName  && !isEvent && fieldRequired('event_name')  && !form.event_name.trim())  { setError('Please enter the event name'); return }
    if (showVideoDuration && fieldRequired('video_duration') && !form.video_duration.trim())  { setError('Please enter the desired video length'); return }
    if (showCoverageHours && fieldRequired('coverage_hours') && !form.coverage_hours.trim())  { setError('Please enter the hours of coverage'); return }
    if (showLocation   && !isEvent && fieldRequired('location_address') && !form.location_address.trim()) { setError('Please enter the preferred location'); return }

    setLoading(true)
    setError('')

    const { error: err } = await submitBookingRequest({
      ...form,
      studio_id:            studioId,
      selected_service_ids: selectedServiceIds,
      package_id:           preselectedPackage?.package_id ?? undefined,
    })
    if (err === '__DUPLICATE__') {
      setDuplicate(true)
    } else if (err) {
      setError(err)
      setLoading(false)
    } else {
      setSubmitted(true)
    }
  }

  // ── Style constants ──────────────────────────────────────────────────────────
  const label: React.CSSProperties = { fontSize: '12px', color: '#8a8580', display: 'block', marginBottom: '6px', fontWeight: '500', letterSpacing: '.04em', textTransform: 'uppercase' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }
  const req:   React.CSSProperties = { color: '#c9a96e' }
  const row:   React.CSSProperties = { marginBottom: '18px' }
  const opt:   React.CSSProperties = { color: '#c4bdb4', fontSize: '11px', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }

  // ── Duplicate ────────────────────────────────────────────────────────────────
  if (duplicate) {
    return (
      <div style={{ textAlign: 'center', padding: '52px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fdf6e8', border: '1px solid #e8d5a3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px' }}>
          ✦
        </div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: '400', marginBottom: '12px', color: '#1a1a1a' }}>
          Already received
        </h2>
        <div style={{ width: '32px', height: '1px', background: 'linear-gradient(90deg,#c9a96e,#e8d5a3,#c9a96e)', margin: '0 auto 20px' }} />
        <p style={{ fontSize: '14px', color: '#6b6660', lineHeight: '1.7', maxWidth: '320px', margin: '0 auto 28px' }}>
          <strong style={{ color: '#1a1a1a' }}>{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.{' '}
          {studioName} will be in touch to confirm — no need to submit again.
        </p>
        <p style={{ fontSize: '12px', color: '#c4bdb4', letterSpacing: '.04em' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  if (submitted) {
    const allSelected = selectedServiceIds
      .map(id => {
        const inc = pkgIncludedSvcs.find(s => s.service_id === id)
        if (inc) return { name: inc.name, type: inc.type, price: null as number | null, included: true }
        const addon = pkgAddonSvcs.find(s => s.service_id === id)
        if (addon) return { name: addon.name, type: addon.type, price: addon.addon_price ?? addon.price, included: false }
        const cat = catalogServices.find(s => s.service_id === id)
        if (cat) return { name: cat.name, type: cat.type, price: cat.price, included: false }
        return null
      })
      .filter(Boolean) as { name: string; type: string; price: number | null; included: boolean }[]

    return (
      <div style={{ textAlign: 'center', padding: '52px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#fdf6e8', border: '1px solid #e8d5a3', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px' }}>
          ✦
        </div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: '400', marginBottom: '12px', color: '#1a1a1a' }}>
          Request received
        </h2>
        <div style={{ width: '32px', height: '1px', background: 'linear-gradient(90deg,#c9a96e,#e8d5a3,#c9a96e)', margin: '0 auto 20px' }} />
        <p style={{ fontSize: '14px', color: '#6b6660', lineHeight: '1.7', maxWidth: '320px', margin: '0 auto 24px' }}>
          Thank you, <strong style={{ color: '#1a1a1a' }}>{form.full_name.split(' ')[0]}</strong>.{' '}
          {studioName} will be in touch to confirm your session.
        </p>
        {allSelected.length > 0 && (
          <div style={{ background: '#fdf8f0', borderRadius: '12px', border: '1px solid #e8d5a3', padding: '16px', maxWidth: '300px', margin: '0 auto 20px', textAlign: 'left' }}>
            <p style={{ fontSize: '10px', color: '#c9a96e', margin: '0 0 10px', fontWeight: '600', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Requested Services
            </p>
            {allSelected.map((s, i) => (
              <p key={i} style={{ fontSize: '13px', color: '#5a5650', margin: '0 0 6px', display: 'flex', justifyContent: 'space-between' as const }}>
                <span>{TYPE_ICONS[s.type] ?? '✦'} {s.name}</span>
                {s.included
                  ? <span style={{ color: '#c9a96e', fontSize: '11px' }}>✓ included</span>
                  : s.price != null && <span style={{ color: '#8a8580' }}>₦{Number(s.price).toLocaleString()}</span>
                }
              </p>
            ))}
          </div>
        )}
        <p style={{ fontSize: '12px', color: '#c4bdb4', letterSpacing: '.04em' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const hasServices = pkgIncludedSvcs.length > 0 || pkgAddonSvcs.length > 0 || otherCatalogSvcs.length > 0

  const pillBase: React.CSSProperties = {
    padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
    fontSize: '14px', fontWeight: '500', transition: 'all .15s',
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Package banner */}
      {preselectedPackage && (
        <div style={{
          background: 'linear-gradient(135deg, #1c1208 0%, #2e1e0a 100%)',
          borderRadius: '14px',
          padding: '18px 20px',
          marginBottom: '22px',
          border: '1px solid #3d2a10',
        }}>
          <p style={{ fontSize: '10px', color: '#c9a96e', margin: '0 0 6px', letterSpacing: '.1em', textTransform: 'uppercase', fontWeight: '600' }}>
            You&apos;re booking
          </p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: '400', margin: '0 0 4px', color: '#fff', letterSpacing: '-.01em' }}>
            {preselectedPackage.name}
          </p>
          {preselectedPackage.tagline && (
            <p style={{ fontSize: '13px', color: '#a09070', margin: '0 0 10px', lineHeight: '1.5' }}>{preselectedPackage.tagline}</p>
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'baseline', flexWrap: 'wrap' }}>
            {preselectedPackage.base_price != null && (
              <p style={{ fontSize: '22px', fontWeight: '700', margin: 0, color: '#e8d5a3', letterSpacing: '-.01em' }}>
                ₦{Number(preselectedPackage.base_price).toLocaleString()}
              </p>
            )}
            {preselectedPackage.duration_mins != null && (
              <p style={{ fontSize: '13px', color: '#7a6a50', margin: 0 }}>{preselectedPackage.duration_mins} mins</p>
            )}
            {preselectedPackage.outfits_count != null && (
              <p style={{ fontSize: '13px', color: '#7a6a50', margin: 0 }}>{preselectedPackage.outfits_count} outfits</p>
            )}
          </div>
        </div>
      )}

      {/* Session type */}
      <div style={row}>
        <label style={label}>Session type <span style={req}>*</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {sessionTypes.map(t => (
            <button key={t.value} type="button"
              onClick={() => { set('session_type', t.value); set('outfits_count', '') }}
              style={{
                ...pillBase,
                border: form.session_type === t.value ? '1.5px solid #c9a96e' : '1px solid #ddd8cf',
                background: form.session_type === t.value ? '#c9a96e' : '#fff',
                color: form.session_type === t.value ? '#fff' : '#5a5650',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service type */}
      {serviceTypes.length > 1 && (
        <div style={row}>
          <label style={label}>Service <span style={req}>*</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {serviceTypes.map(t => (
              <button key={t.value} type="button"
                onClick={() => set('service_type', t.value)}
                style={{
                  ...pillBase,
                  border: form.service_type === t.value ? '1.5px solid #c9a96e' : '1px solid #ddd8cf',
                  background: form.service_type === t.value ? '#c9a96e' : '#fff',
                  color: form.service_type === t.value ? '#fff' : '#5a5650',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        <div>
          <label style={label}>Full name <span style={req}>*</span></label>
          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)}
            placeholder="Your full name" style={input} autoComplete="name" />
        </div>
        <div>
          <label style={label}>Phone <span style={req}>*</span></label>
          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
            placeholder="08012345678" style={input} autoComplete="tel" />
        </div>
      </div>

      {/* Email */}
      <div style={row}>
        <label style={label}>Email <span style={opt}>(optional)</span></label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="you@example.com" style={input} autoComplete="email" />
      </div>

      {/* Preferred date */}
      <div style={row}>
        <label style={label}>Preferred date <span style={req}>*</span></label>
        <input type="date" value={form.preferred_date} min={minDate}
          onChange={e => set('preferred_date', e.target.value)} style={input} />
        <p style={{ fontSize: '12px', color: '#c4bdb4', margin: '6px 0 0', lineHeight: '1.5' }}>
          This is a request — the studio will confirm the final date with you.
        </p>
      </div>

      {/* Outfits */}
      {showOutfits && (
        <div style={row}>
          <label style={label}>
            Number of outfits{' '}
            {fieldRequired('outfits_count') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="number" min="1" max="20" value={form.outfits_count}
            onChange={e => set('outfits_count', e.target.value)}
            placeholder="e.g. 2" style={{ ...input, maxWidth: '160px' }} />
        </div>
      )}

      {/* Occasion */}
      {showOccasion && (
        <div style={row}>
          <label style={label}>
            What&apos;s the occasion?{' '}
            {fieldRequired('shoot_type') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="text" list="category-list" value={form.shoot_type}
            onChange={e => set('shoot_type', e.target.value)}
            placeholder="e.g. Birthday, Anniversary, Graduation…" style={input} autoComplete="off" />
          <datalist id="category-list">
            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      )}

      {/* Occasion date */}
      {showOccDate && form.shoot_type.trim() && (
        <div style={row}>
          <label style={label}>
            {form.shoot_type} date <span style={opt}>(optional)</span>
          </label>
          <input type="date" value={form.event_date}
            onChange={e => set('event_date', e.target.value)} style={{ ...input, maxWidth: '200px' }} />
        </div>
      )}

      {/* Event name (non-event session) */}
      {showEventName && !isEvent && (
        <div style={row}>
          <label style={label}>
            Event name{' '}
            {fieldRequired('event_name') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="text" value={form.event_name}
            onChange={e => set('event_name', e.target.value)}
            placeholder="e.g. Sandra & Emeka's Wedding" style={input} />
        </div>
      )}

      {/* Video duration */}
      {showVideoDuration && (
        <div style={row}>
          <label style={label}>
            Desired video length{' '}
            {fieldRequired('video_duration') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="text" value={form.video_duration ?? ''}
            onChange={e => set('video_duration', e.target.value)}
            placeholder="e.g. 3–5 min highlight, full ceremony" style={input} />
        </div>
      )}

      {/* Coverage hours */}
      {showCoverageHours && (
        <div style={row}>
          <label style={label}>
            Hours of coverage{' '}
            {fieldRequired('coverage_hours') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="number" min="1" max="24" value={form.coverage_hours ?? ''}
            onChange={e => set('coverage_hours', e.target.value)}
            placeholder="e.g. 4" style={{ ...input, maxWidth: '160px' }} />
        </div>
      )}

      {/* Crew size */}
      {showCrewSize && (
        <div style={row}>
          <label style={label}>
            Crew size needed{' '}
            {fieldRequired('crew_size') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="number" min="1" max="20" value={form.crew_size ?? ''}
            onChange={e => set('crew_size', e.target.value)}
            placeholder="e.g. 2" style={{ ...input, maxWidth: '160px' }} />
        </div>
      )}

      {/* Location (non-event) */}
      {showLocation && !isEvent && (
        <div style={row}>
          <label style={label}>
            Preferred location{' '}
            {fieldRequired('location_address') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
          </label>
          <input type="text" value={form.location_address}
            onChange={e => set('location_address', e.target.value)}
            placeholder="e.g. Lekki Conservation Centre, Lagos" style={input} />
        </div>
      )}

      {/* Event session block */}
      {isEvent && (
        <>
          <div style={row}>
            <label style={label}>Event name <span style={req}>*</span></label>
            <input type="text" value={form.event_name}
              onChange={e => set('event_name', e.target.value)}
              placeholder="e.g. Sandra & Emeka's Wedding" style={input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
            <div>
              <label style={label}>Event date <span style={opt}>(optional)</span></label>
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>Venue <span style={opt}>(optional)</span></label>
              <input type="text" value={form.location_address}
                onChange={e => set('location_address', e.target.value)}
                placeholder="Venue name or address" style={input} />
            </div>
          </div>
          {showVideoDuration && (
            <div style={row}>
              <label style={label}>
                Desired video length{' '}
                {fieldRequired('video_duration') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
              </label>
              <input type="text" value={form.video_duration ?? ''}
                onChange={e => set('video_duration', e.target.value)}
                placeholder="e.g. 3–5 min highlight, full ceremony" style={input} />
            </div>
          )}
          {showCoverageHours && (
            <div style={row}>
              <label style={label}>
                Hours of coverage{' '}
                {fieldRequired('coverage_hours') ? <span style={req}>*</span> : <span style={opt}>(optional)</span>}
              </label>
              <input type="number" min="1" max="24" value={form.coverage_hours ?? ''}
                onChange={e => set('coverage_hours', e.target.value)}
                placeholder="e.g. 4" style={{ ...input, maxWidth: '160px' }} />
            </div>
          )}
        </>
      )}

      {/* ── Services ─────────────────────────────────────────────────────────── */}
      {hasServices && (
        <div style={{ borderTop: '1px solid #ede8e0', paddingTop: '18px', marginTop: '4px', marginBottom: '18px' }}>

          {/* Included — locked gold */}
          {pkgIncludedSvcs.length > 0 && (
            <div style={{ marginBottom: pkgAddonSvcs.length > 0 || otherCatalogSvcs.length > 0 ? '14px' : '0' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#c9a96e', margin: '0 0 8px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                ✦ Included in your package
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pkgIncludedSvcs.map(svc => (
                  <div key={svc.service_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: '10px',
                    border: '1px solid #e8d5a3',
                    background: '#fdf8f0',
                    cursor: 'default',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px' }}>{TYPE_ICONS[svc.type] ?? '✦'}</span>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#5a3e10' }}>{svc.name}</p>
                        {svc.description && (
                          <p style={{ fontSize: '12px', margin: 0, color: '#a08040' }}>{svc.description}</p>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#c9a96e', fontWeight: '600', letterSpacing: '.04em' }}>Included</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Package add-ons */}
          {pkgAddonSvcs.length > 0 && (
            <div style={{ marginBottom: otherCatalogSvcs.length > 0 ? '14px' : '0' }}>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#8a8580', margin: '0 0 8px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Package add-ons <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: '0', fontSize: '11px' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pkgAddonSvcs.map(svc => {
                  const selected     = selectedServiceIds.includes(svc.service_id)
                  const displayPrice = svc.addon_price ?? svc.price
                  return (
                    <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 14px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                        border: selected ? '1.5px solid #c9a96e' : '1px solid #ddd8cf',
                        background: selected ? '#fdf8f0' : '#fff',
                        transition: 'all .15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{TYPE_ICONS[svc.type] ?? '✦'}</span>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: selected ? '#5a3e10' : '#1a1a1a' }}>{svc.name}</p>
                          {svc.description && (
                            <p style={{ fontSize: '12px', margin: 0, color: selected ? '#a08040' : '#8a8580' }}>{svc.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {displayPrice != null && (
                          <span style={{ fontSize: '13px', fontWeight: '500', color: selected ? '#c9a96e' : '#8a8580' }}>
                            +₦{Number(displayPrice).toLocaleString()}
                          </span>
                        )}
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                          border: selected ? 'none' : '1.5px solid #ddd8cf',
                          background: selected ? '#c9a96e' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Other catalog services */}
          {otherCatalogSvcs.length > 0 && (
            <div>
              <p style={{ fontSize: '10px', fontWeight: '600', color: '#8a8580', margin: '0 0 8px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {pkgIncludedSvcs.length > 0 || pkgAddonSvcs.length > 0 ? 'Additional services' : 'Services'}{' '}
                <span style={{ fontWeight: '400', textTransform: 'none', letterSpacing: '0', fontSize: '11px' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherCatalogSvcs.map(svc => {
                  const selected = selectedServiceIds.includes(svc.service_id)
                  return (
                    <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '11px 14px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                        border: selected ? '1.5px solid #c9a96e' : '1px solid #ddd8cf',
                        background: selected ? '#fdf8f0' : '#fff',
                        transition: 'all .15s',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{TYPE_ICONS[svc.type] ?? '✦'}</span>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: selected ? '#5a3e10' : '#1a1a1a' }}>{svc.name}</p>
                          {svc.description && (
                            <p style={{ fontSize: '12px', margin: 0, color: selected ? '#a08040' : '#8a8580' }}>{svc.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {svc.price != null && (
                          <span style={{ fontSize: '13px', fontWeight: '500', color: selected ? '#c9a96e' : '#8a8580' }}>
                            +₦{Number(svc.price).toLocaleString()}
                          </span>
                        )}
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                          border: selected ? 'none' : '1.5px solid #ddd8cf',
                          background: selected ? '#c9a96e' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#fff', fontSize: '11px', fontWeight: '700' }}>✓</span>}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Price summary */}
          {(pkgBase != null || optionalTotal > 0) && (
            <div style={{ marginTop: '14px', padding: '14px 16px', background: '#fdf8f0', borderRadius: '10px', border: '1px solid #e8d5a3' }}>
              {pkgBase != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: optionalTotal > 0 ? '8px' : '0' }}>
                  <span style={{ fontSize: '13px', color: '#8a8580' }}>Package</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#5a5650' }}>₦{pkgBase.toLocaleString()}</span>
                </div>
              )}
              {optionalTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: pkgBase != null ? '8px' : '0', paddingTop: pkgBase != null ? '8px' : '0', borderTop: pkgBase != null ? '1px solid #ede8da' : 'none' }}>
                  <span style={{ fontSize: '13px', color: '#8a8580' }}>Add-ons ({selectedOptional.length})</span>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: '#5a5650' }}>+₦{optionalTotal.toLocaleString()}</span>
                </div>
              )}
              {pkgBase != null && optionalTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ede8da', paddingTop: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#5a3e10' }}>Estimated total</span>
                  <span style={{ fontSize: '15px', fontWeight: '700', color: '#c9a96e' }}>₦{(pkgBase + optionalTotal).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div style={row}>
        <label style={label}>Anything else? <span style={opt}>(optional)</span></label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Special requests, questions, or details about your shoot..."
          rows={3} style={{ ...input, resize: 'vertical' }} />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#c0392b', marginBottom: '14px', padding: '10px 12px', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={loading}
        style={{
          width: '100%', padding: '13px',
          background: loading ? '#e0c990' : '#c9a96e',
          color: '#fff', border: 'none', borderRadius: '12px',
          fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
          letterSpacing: '.02em', transition: 'background .15s',
        }}>
        {loading ? 'Sending request…' : 'Request this session'}
      </button>

      <p style={{ fontSize: '12px', color: '#c4bdb4', textAlign: 'center', marginTop: '14px', lineHeight: '1.5' }}>
        No payment required now. {studioName} will confirm availability and get back to you.
      </p>
    </form>
  )
}
