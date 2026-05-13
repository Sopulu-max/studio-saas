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
  sessionTypes:           { value: string; label: string }[]
  serviceTypes:           { value: string; label: string; booking_fields: BookingFieldConfig[] }[]
  catalogServices?:       CatalogService[]
  preselectedPackage?:    PreselectedPackage | null
  packageLinkedServices?: PackageLinkedService[]
}) {
  // IDs of services that are locked-included in the package
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

  // Pre-select all included services; add-ons start unchecked
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() =>
    packageLinkedServices.filter(s => !s.is_addon).map(s => s.service_id)
  )

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleService(id: string) {
    if (includedIds.has(id)) return // included services are locked
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const isEvent = form.session_type === 'event'

  // Derive the active service type's field config
  const activeServiceType  = serviceTypes.find(t => t.value === form.service_type) ?? serviceTypes[0]
  const serviceBookingFields: BookingFieldConfig[] = activeServiceType?.booking_fields ?? []
  const fieldEnabled  = (key: string) => serviceBookingFields.some(f => f.key === key)
  const fieldRequired = (key: string) => serviceBookingFields.find(f => f.key === key)?.required ?? false

  // Event sessions always show event_name + event_date + location regardless of service config
  const showOutfits  = !isEvent && fieldEnabled('outfits_count')
  const showOccasion = !isEvent && fieldEnabled('shoot_type')
  const showOccDate  = !isEvent && fieldEnabled('event_date')
  const showLocation = isEvent  || fieldEnabled('location_address')
  const showEventName = isEvent || fieldEnabled('event_name')
  const showVideoDuration = fieldEnabled('video_duration')
  const showCoverageHours = fieldEnabled('coverage_hours')
  const showCrewSize      = fieldEnabled('crew_size')

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Separate catalog services into pkg add-ons and other
  const pkgLinkedServiceIds = new Set(packageLinkedServices.map(s => s.service_id))
  const otherCatalogSvcs    = catalogServices.filter(s => !pkgLinkedServiceIds.has(s.service_id))
  const pkgAddonSvcs        = packageLinkedServices.filter(s => s.is_addon)
  const pkgIncludedSvcs     = packageLinkedServices.filter(s => !s.is_addon)

  // Price tally
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

    // Validate required dynamic fields
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

  const label: React.CSSProperties = { fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }
  const req:   React.CSSProperties = { color: '#e24b4a' }
  const row:   React.CSSProperties = { marginBottom: '16px' }

  // ── Already submitted ──────────────────────────────────────────────────────
  if (duplicate) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '36px', marginBottom: '20px' }}>✅</div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px', color: '#111' }}>Already received!</h2>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 28px' }}>
          <strong>{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.
          {studioName} will be in touch to confirm — no need to submit again.
        </p>
        <p style={{ fontSize: '13px', color: '#aaa' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
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
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ fontSize: '40px', marginBottom: '20px' }}>🎉</div>
        <h2 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '10px', color: '#111' }}>Request received!</h2>
        <p style={{ fontSize: '15px', color: '#666', lineHeight: '1.6', maxWidth: '340px', margin: '0 auto 28px' }}>
          Thanks, <strong>{form.full_name.split(' ')[0]}</strong>. {studioName} will be in touch to confirm your session.
        </p>
        {allSelected.length > 0 && (
          <div style={{ background: '#f7f7f5', borderRadius: '10px', padding: '14px', maxWidth: '300px', margin: '0 auto 20px', textAlign: 'left' }}>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 8px', fontWeight: '600' }}>REQUESTED SERVICES</p>
            {allSelected.map((s, i) => (
              <p key={i} style={{ fontSize: '13px', color: '#444', margin: '0 0 4px' }}>
                {TYPE_ICONS[s.type] ?? '•'} {s.name}
                {s.included
                  ? <span style={{ color: '#22c55e', marginLeft: '4px' }}>✓ included</span>
                  : s.price != null && <span style={{ color: '#888' }}> — ₦{Number(s.price).toLocaleString()}</span>
                }
              </p>
            ))}
          </div>
        )}
        <p style={{ fontSize: '13px', color: '#aaa' }}>You can close this page.</p>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  const hasServices = pkgIncludedSvcs.length > 0 || pkgAddonSvcs.length > 0 || otherCatalogSvcs.length > 0

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* Package banner */}
      {preselectedPackage && (
        <div style={{ background: '#111', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px', color: 'white' }}>
          <p style={{ fontSize: '11px', color: '#aaa', margin: '0 0 4px', letterSpacing: '.06em', textTransform: 'uppercase' }}>
            You&apos;re booking
          </p>
          <p style={{ fontSize: '17px', fontWeight: '700', margin: '0 0 2px', letterSpacing: '-.01em' }}>
            {preselectedPackage.name}
          </p>
          {preselectedPackage.tagline && (
            <p style={{ fontSize: '13px', color: '#ccc', margin: '0 0 8px' }}>{preselectedPackage.tagline}</p>
          )}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {preselectedPackage.base_price != null && (
              <p style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                ₦{Number(preselectedPackage.base_price).toLocaleString()}
              </p>
            )}
            {preselectedPackage.duration_mins != null && (
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>{preselectedPackage.duration_mins} mins</p>
            )}
            {preselectedPackage.outfits_count != null && (
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>{preselectedPackage.outfits_count} outfits</p>
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
                padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500',
                border: form.session_type === t.value ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                background: form.session_type === t.value ? '#111' : 'white',
                color: form.session_type === t.value ? 'white' : '#555',
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
                  padding: '10px 16px', borderRadius: '10px', cursor: 'pointer',
                  fontSize: '14px', fontWeight: '500',
                  border: form.service_type === t.value ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                  background: form.service_type === t.value ? '#111' : 'white',
                  color: form.service_type === t.value ? 'white' : '#555',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Name + Phone */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
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
        <label style={label}>Email <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span></label>
        <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
          placeholder="you@example.com" style={input} autoComplete="email" />
      </div>

      {/* Preferred date */}
      <div style={row}>
        <label style={label}>Preferred date <span style={req}>*</span></label>
        <input type="date" value={form.preferred_date} min={minDate}
          onChange={e => set('preferred_date', e.target.value)} style={input} />
        <p style={{ fontSize: '12px', color: '#aaa', margin: '5px 0 0' }}>
          This is a request — the studio will confirm the final date with you.
        </p>
      </div>

      {/* ── Dynamic fields from service type config ─────────────────────── */}

      {/* Outfits */}
      {showOutfits && (
        <div style={row}>
          <label style={label}>
            Number of outfits{' '}
            {fieldRequired('outfits_count')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
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
            {fieldRequired('shoot_type')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
          </label>
          <input type="text" list="category-list" value={form.shoot_type}
            onChange={e => set('shoot_type', e.target.value)}
            placeholder="e.g. Birthday, Anniversary, Graduation…" style={input} autoComplete="off" />
          <datalist id="category-list">
            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
      )}

      {/* Occasion date (non-event) */}
      {showOccDate && form.shoot_type.trim() && (
        <div style={row}>
          <label style={label}>
            {form.shoot_type} date{' '}
            <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
          </label>
          <input type="date" value={form.event_date}
            onChange={e => set('event_date', e.target.value)} style={{ ...input, maxWidth: '200px' }} />
        </div>
      )}

      {/* Event name (event session OR service type has it enabled) */}
      {showEventName && !isEvent && (
        <div style={row}>
          <label style={label}>
            Event name{' '}
            {fieldRequired('event_name')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
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
            {fieldRequired('video_duration')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
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
            {fieldRequired('coverage_hours')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
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
            {fieldRequired('crew_size')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
          </label>
          <input type="number" min="1" max="20" value={form.crew_size ?? ''}
            onChange={e => set('crew_size', e.target.value)}
            placeholder="e.g. 2" style={{ ...input, maxWidth: '160px' }} />
        </div>
      )}

      {/* Location (outdoor/event always show it; other sessions show if enabled) */}
      {showLocation && !isEvent && (
        <div style={row}>
          <label style={label}>
            Preferred location{' '}
            {fieldRequired('location_address')
              ? <span style={req}>*</span>
              : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
          </label>
          <input type="text" value={form.location_address}
            onChange={e => set('location_address', e.target.value)}
            placeholder="e.g. Lekki Conservation Centre, Lagos" style={input} />
        </div>
      )}

      {/* Event session: event name + date + venue always shown */}
      {isEvent && (
        <>
          <div style={row}>
            <label style={label}>Event name <span style={req}>*</span></label>
            <input type="text" value={form.event_name}
              onChange={e => set('event_name', e.target.value)}
              placeholder="e.g. Sandra & Emeka's Wedding" style={input} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={label}>Event date <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span></label>
              <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} style={input} />
            </div>
            <div>
              <label style={label}>Venue <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span></label>
              <input type="text" value={form.location_address}
                onChange={e => set('location_address', e.target.value)}
                placeholder="Venue name or address" style={input} />
            </div>
          </div>
          {showVideoDuration && (
            <div style={row}>
              <label style={label}>
                Desired video length{' '}
                {fieldRequired('video_duration')
                  ? <span style={req}>*</span>
                  : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
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
                {fieldRequired('coverage_hours')
                  ? <span style={req}>*</span>
                  : <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>}
              </label>
              <input type="number" min="1" max="24" value={form.coverage_hours ?? ''}
                onChange={e => set('coverage_hours', e.target.value)}
                placeholder="e.g. 4" style={{ ...input, maxWidth: '160px' }} />
            </div>
          )}
        </>
      )}

      {/* ── Services section ──────────────────────────────────────────────── */}
      {hasServices && (
        <div style={{ borderTop: '0.5px solid #e5e5e5', paddingTop: '16px', marginTop: '4px', marginBottom: '16px' }}>

          {/* Included in package — locked */}
          {pkgIncludedSvcs.length > 0 && (
            <div style={{ marginBottom: pkgAddonSvcs.length > 0 || otherCatalogSvcs.length > 0 ? '14px' : '0' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#22c55e', margin: '0 0 8px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                ✓ Included in your package
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pkgIncludedSvcs.map(svc => (
                  <div key={svc.service_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', borderRadius: '10px',
                    border: '1.5px solid #d1fae5',
                    background: '#f0fdf4',
                    cursor: 'default',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px' }}>{TYPE_ICONS[svc.type] ?? '•'}</span>
                      <div>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#166534' }}>{svc.name}</p>
                        {svc.description && (
                          <p style={{ fontSize: '12px', margin: 0, color: '#4ade80' }}>{svc.description}</p>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: '600' }}>Included</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Package add-ons — optional */}
          {pkgAddonSvcs.length > 0 && (
            <div style={{ marginBottom: otherCatalogSvcs.length > 0 ? '14px' : '0' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', margin: '0 0 8px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                Package add-ons <span style={{ fontWeight: '400' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pkgAddonSvcs.map(svc => {
                  const selected    = selectedServiceIds.includes(svc.service_id)
                  const displayPrice = svc.addon_price ?? svc.price
                  return (
                    <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                        border: selected ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                        background: selected ? '#111' : 'white',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>{TYPE_ICONS[svc.type] ?? '•'}</span>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: selected ? 'white' : '#111' }}>{svc.name}</p>
                          {svc.description && (
                            <p style={{ fontSize: '12px', margin: 0, color: selected ? '#ccc' : '#888' }}>{svc.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {displayPrice != null && (
                          <span style={{ fontSize: '13px', fontWeight: '500', color: selected ? '#ccc' : '#555' }}>
                            +₦{Number(displayPrice).toLocaleString()}
                          </span>
                        )}
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                          border: selected ? 'none' : '1.5px solid #ccc',
                          background: selected ? '#fff' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#111', fontSize: '12px', fontWeight: '700' }}>✓</span>}
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
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', margin: '0 0 8px', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                {pkgIncludedSvcs.length > 0 || pkgAddonSvcs.length > 0
                  ? 'Additional services'
                  : 'Services'}{' '}
                <span style={{ fontWeight: '400' }}>(optional)</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {otherCatalogSvcs.map(svc => {
                  const selected = selectedServiceIds.includes(svc.service_id)
                  return (
                    <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                        border: selected ? '1.5px solid #111' : '0.5px solid #d5d5d5',
                        background: selected ? '#111' : 'white',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>{TYPE_ICONS[svc.type] ?? '•'}</span>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: selected ? 'white' : '#111' }}>{svc.name}</p>
                          {svc.description && (
                            <p style={{ fontSize: '12px', margin: 0, color: selected ? '#ccc' : '#888' }}>{svc.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {svc.price != null && (
                          <span style={{ fontSize: '13px', fontWeight: '500', color: selected ? '#ccc' : '#555' }}>
                            +₦{Number(svc.price).toLocaleString()}
                          </span>
                        )}
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                          border: selected ? 'none' : '1.5px solid #ccc',
                          background: selected ? '#fff' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {selected && <span style={{ color: '#111', fontSize: '12px', fontWeight: '700' }}>✓</span>}
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
            <div style={{ marginTop: '12px', padding: '12px', background: '#f7f7f5', borderRadius: '8px' }}>
              {pkgBase != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: optionalTotal > 0 ? '6px' : '0' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Package</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>₦{pkgBase.toLocaleString()}</span>
                </div>
              )}
              {optionalTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: pkgBase != null ? '6px' : '0', paddingTop: pkgBase != null ? '6px' : '0', borderTop: pkgBase != null ? '0.5px solid #e5e5e5' : 'none' }}>
                  <span style={{ fontSize: '13px', color: '#555' }}>Add-ons ({selectedOptional.length})</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>+₦{optionalTotal.toLocaleString()}</span>
                </div>
              )}
              {pkgBase != null && optionalTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '0.5px solid #e5e5e5', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>Estimated total</span>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>₦{(pkgBase + optionalTotal).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div style={row}>
        <label style={label}>
          Anything else? <span style={{ color: '#aaa', fontSize: '12px' }}>(optional)</span>
        </label>
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
          placeholder="Special requests, questions, or details about your shoot..."
          rows={3} style={{ ...input, resize: 'vertical' }} />
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '14px' }}>{error}</p>
      )}

      <button type="submit" disabled={loading}
        style={{ width: '100%', padding: '12px', background: '#111', color: 'white', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}>
        {loading ? 'Sending request…' : 'Request this session'}
      </button>

      <p style={{ fontSize: '12px', color: '#bbb', textAlign: 'center', marginTop: '14px' }}>
        No payment required now. {studioName} will confirm availability and get back to you.
      </p>
    </form>
  )
}
