'use client'

import { useState, useMemo, useEffect } from 'react'
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

export type PublicPackage = {
  package_id:     string
  name:           string
  tagline?:       string | null
  base_price?:    number | null
  session_type?:  string | null
  service_type?:  string | null
  outfits_count?: number | null
  duration_mins?: number | null
  services:       PackageLinkedService[]
}

export default function BookingForm({
  studioId,
  studioName,
  sessionTypes,
  serviceTypes,
  catalogServices = [],
  publicPackages = [],
  initialPackageId = null,
}: {
  studioId:               string
  studioName:             string
  sessionTypes:           { value: string; label: string; is_event?: boolean }[]
  serviceTypes:           { value: string; label: string; booking_fields: BookingFieldConfig[] }[]
  catalogServices:        CatalogService[]
  publicPackages:         PublicPackage[]
  initialPackageId?:      string | null
}) {
  const [step, setStep] = useState(1) // 1: Intent, 2: Package, 3: Add-ons, 4: Details
  
  const [submitted, setSubmitted] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const [form, setForm] = useState({
    full_name:        '',
    phone:            '',
    email:            '',
    session_type:     sessionTypes[0]?.value ?? '',
    service_type:     serviceTypes[0]?.value ?? '',
    preferred_date:   '',
    outfits_count:    '',
    location_address: '',
    shoot_type:       '',
    event_name:       '',
    event_date:       '',
    video_duration:   '',
    coverage_hours:   '',
    crew_size:        '',
    notes:            '',
  })

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(initialPackageId)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  useEffect(() => {
    if (initialPackageId) {
      const pkg = publicPackages.find(p => p.package_id === initialPackageId)
      if (pkg) {
        set('session_type', pkg.session_type || sessionTypes[0]?.value || '')
        set('service_type', pkg.service_type || serviceTypes[0]?.value || '')
        if (pkg.outfits_count != null) set('outfits_count', String(pkg.outfits_count))
        
        const baseIds = pkg.services.filter(s => !s.is_addon).map(s => s.service_id)
        setSelectedServiceIds(baseIds)
        setStep(3) // Jump to step 3 (addons) if package was preselected
      }
    }
  }, [initialPackageId, publicPackages, sessionTypes, serviceTypes])

  const selectedPackage = useMemo(() => 
    publicPackages.find(p => p.package_id === selectedPackageId) || null
  , [publicPackages, selectedPackageId])

  const includedIds = useMemo(() => new Set(
    selectedPackage?.services.filter(s => !s.is_addon).map(s => s.service_id) || []
  ), [selectedPackage])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function handleNext() {
    setStep((s: number) => Math.min(s + 1, 4))
  }
  function handleBack() {
    setStep((s: number) => Math.max(s - 1, 1))
  }

  function selectPackage(pkgId: string | null) {
    setSelectedPackageId(pkgId)
    if (pkgId) {
      const pkg = publicPackages.find(p => p.package_id === pkgId)
      if (pkg) {
        const baseIds = pkg.services.filter(s => !s.is_addon).map(s => s.service_id)
        setSelectedServiceIds(baseIds)
      }
    } else {
      setSelectedServiceIds([])
    }
    handleNext()
  }

  function toggleService(id: string) {
    if (includedIds.has(id)) return
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const filteredPackages = useMemo(() => {
    return publicPackages.filter(p => 
      (p.session_type === form.session_type || !p.session_type) &&
      (p.service_type === form.service_type || !p.service_type)
    )
  }, [publicPackages, form.session_type, form.service_type])

  const pkgLinkedServiceIds = new Set(selectedPackage?.services.map(s => s.service_id) || [])
  const otherCatalogSvcs    = catalogServices.filter(s => !pkgLinkedServiceIds.has(s.service_id))
  const pkgAddonSvcs        = selectedPackage?.services.filter(s => s.is_addon) || []
  const pkgIncludedSvcs     = selectedPackage?.services.filter(s => !s.is_addon) || []

  const pkgBase = selectedPackage?.base_price != null ? Number(selectedPackage.base_price) : null
  const selectedOptional = selectedServiceIds.filter(id => !includedIds.has(id))
  const optionalTotal = selectedOptional.reduce((sum, id) => {
    const pkgAddon = pkgAddonSvcs.find(s => s.service_id === id)
    if (pkgAddon) return sum + (pkgAddon.addon_price ?? pkgAddon.price ?? 0)
    const catalog  = catalogServices.find(s => s.service_id === id)
    return sum + (catalog?.price ?? 0)
  }, 0)
  const estTotal = (pkgBase ?? 0) + optionalTotal

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

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step !== 4) return handleNext()
    
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

    const { error: err, whatsappUrl } = await submitBookingRequest({
      ...form,
      studio_id:            studioId,
      selected_service_ids: selectedServiceIds,
      package_id:           selectedPackageId ?? undefined,
    })
    if (err === '__DUPLICATE__') {
      setDuplicate(true)
    } else if (err) {
      setError(err)
      setLoading(false)
    } else {
      if (whatsappUrl) window.location.href = whatsappUrl
      else setSubmitted(true)
    }
  }

  const label: React.CSSProperties = { fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '.04em', textTransform: 'uppercase' }
  const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }
  const req:   React.CSSProperties = { color: 'var(--primary)' }
  const opt:   React.CSSProperties = { color: 'var(--text-4)', fontSize: '11px', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }
  const row:   React.CSSProperties = { marginBottom: '20px' }
  const stepContainerClass = `fade-in`

  if (duplicate) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '52px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px', color: 'var(--primary)' }}>✦</div>
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: '22px', fontWeight: '400', marginBottom: '12px', color: 'var(--text-main)' }}>Already received</h2>
        <div style={{ width: '32px', height: '2px', background: 'var(--primary)', margin: '0 auto 20px', borderRadius: '2px' }} />
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '320px', margin: '0 auto 28px' }}>
          <strong style={{ color: 'var(--text-main)' }}>{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.
          {studioName} will be in touch to confirm — no need to submit again.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="fade-in" style={{ textAlign: 'center', padding: '52px 24px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px', color: 'var(--primary)' }}>✦</div>
        <h2 style={{ fontFamily: 'var(--heading-font)', fontSize: '24px', fontWeight: '400', marginBottom: '12px', color: 'var(--text-main)' }}>Request received</h2>
        <div style={{ width: '32px', height: '2px', background: 'var(--primary)', margin: '0 auto 20px', borderRadius: '2px' }} />
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', maxWidth: '320px', margin: '0 auto 24px' }}>
          Thank you, <strong style={{ color: 'var(--text-main)' }}>{form.full_name.split(' ')[0]}</strong>. {studioName} will be in touch to confirm your session.
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-faint)' }}>You can close this page.</p>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '32px', justifyContent: 'center' }}>
        {[1,2,3,4].map(s => (
          <div key={s} style={{ height: '4px', flex: 1, borderRadius: '2px', background: s <= step ? 'var(--primary)' : 'var(--primary-dim)', transition: 'background 0.3s ease' }} />
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <div className={stepContainerClass}>
            <h2 style={{ fontSize: '28px', fontFamily: 'var(--heading-font)', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>What are you looking for?</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>Let's customize your experience.</p>
            
            <div style={row}>
              <label style={label}>Service <span style={req}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {serviceTypes.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => set('service_type', t.value)}
                    style={{
                      padding: '14px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: '500', transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
                      border: form.service_type === t.value ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      background: form.service_type === t.value ? 'var(--primary)' : 'var(--bg)',
                      color: form.service_type === t.value ? 'var(--on-primary)' : 'var(--text-main)',
                      boxShadow: form.service_type === t.value ? '0 4px 12px var(--primary-dim)' : 'none',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={row}>
              <label style={label}>Session <span style={req}>*</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {sessionTypes.map(t => (
                  <button key={t.value} type="button"
                    onClick={() => { set('session_type', t.value); set('outfits_count', '') }}
                    style={{
                      padding: '14px 24px', borderRadius: '12px', fontSize: '15px', fontWeight: '500', transition: 'all .2s cubic-bezier(0.16, 1, 0.3, 1)',
                      border: form.session_type === t.value ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      background: form.session_type === t.value ? 'var(--primary)' : 'var(--bg)',
                      color: form.session_type === t.value ? 'var(--on-primary)' : 'var(--text-main)',
                      boxShadow: form.session_type === t.value ? '0 4px 12px var(--primary-dim)' : 'none',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '40px' }}>
              <button type="button" onClick={handleNext} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 16px var(--primary-dim)' }}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={stepContainerClass}>
            <button type="button" onClick={handleBack} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 style={{ fontSize: '28px', fontFamily: 'var(--heading-font)', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Select a Package</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>Choose a base package for your {sessionTypes.find(s=>s.value===form.session_type)?.label.toLowerCase()} session.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
              {filteredPackages.map(pkg => (
                <div key={pkg.package_id} className="sf-wizard-card" onClick={() => selectPackage(pkg.package_id)}
                  style={{
                    padding: '24px', borderRadius: '16px', cursor: 'pointer',
                    border: selectedPackageId === pkg.package_id ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                    background: selectedPackageId === pkg.package_id ? 'var(--primary-dim)' : 'var(--card-bg)',
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: 'var(--text-main)' }}>{pkg.name}</h3>
                    {pkg.base_price != null && (
                      <span style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>₦{pkg.base_price.toLocaleString()}</span>
                    )}
                  </div>
                  {pkg.tagline && <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.5' }}>{pkg.tagline}</p>}
                  
                  <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', flexWrap: 'wrap', fontWeight: '500' }}>
                    {pkg.duration_mins != null && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {pkg.duration_mins} mins</span>}
                    {pkg.outfits_count != null && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>👕 {pkg.outfits_count} outfits</span>}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📸 {pkg.services.filter(s=>!s.is_addon).length} items included</span>
                  </div>
                </div>
              ))}
              
              <div className="sf-wizard-card" onClick={() => selectPackage(null)}
                style={{
                  padding: '24px', borderRadius: '16px', cursor: 'pointer',
                  border: selectedPackageId === null ? '2px solid var(--primary)' : '1px dashed var(--text-4)',
                  background: selectedPackageId === null ? 'var(--primary-dim)' : 'var(--bg)',
                }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text-main)' }}>Build Custom Shoot</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Start from scratch and choose only what you need.</p>
              </div>
            </div>
            
            <button type="button" onClick={handleNext} disabled={selectedPackageId === undefined} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 16px var(--primary-dim)' }}>
              Continue to Add-ons
            </button>
          </div>
        )}

        {step === 3 && (
          <div className={stepContainerClass}>
            <button type="button" onClick={handleBack} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 style={{ fontSize: '28px', fontFamily: 'var(--heading-font)', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Customize your session</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>Would you like to add videography, products, or additional coverage?</p>
            
            <div style={{ maxHeight: '45vh', overflowY: 'auto', paddingRight: '8px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              {pkgIncludedSvcs.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '12px' }}>Included in {selectedPackage?.name}</p>
                  {pkgIncludedSvcs.map(svc => (
                    <div key={svc.service_id} style={{ padding: '16px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--primary-dim)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text-main)' }}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', letterSpacing: '.04em', textTransform: 'uppercase' }}>Included</span>
                    </div>
                  ))}
                </div>
              )}

              {pkgAddonSvcs.length > 0 && <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '4px' }}>Package Upgrades</p>}
              {pkgAddonSvcs.map(svc => {
                const selected = selectedServiceIds.includes(svc.service_id)
                return (
                  <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)} className="sf-wizard-card"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', textAlign: 'left',
                      border: selected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      background: selected ? 'var(--primary-dim)' : 'var(--card-bg)', transition: 'all 0.2s',
                    }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text-main)' }}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</p>
                      {svc.description && <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>{svc.description}</p>}
                    </div>
                    {svc.addon_price != null && <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>+₦{Number(svc.addon_price).toLocaleString()}</span>}
                  </button>
                )
              })}

              {otherCatalogSvcs.length > 0 && <p style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '16px', marginBottom: '4px' }}>Additional Services & Products</p>}
              {otherCatalogSvcs.map(svc => {
                const selected = selectedServiceIds.includes(svc.service_id)
                return (
                  <button key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)} className="sf-wizard-card"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', textAlign: 'left',
                      border: selected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                      background: selected ? 'var(--primary-dim)' : 'var(--card-bg)', transition: 'all 0.2s',
                    }}>
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text-main)' }}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</p>
                      {svc.description && <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>{svc.description}</p>}
                    </div>
                    {svc.price != null && <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>+₦{Number(svc.price).toLocaleString()}</span>}
                  </button>
                )
              })}
            </div>

            <div style={{ padding: '20px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Estimated Total</span>
              <span style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)' }}>₦{estTotal.toLocaleString()}</span>
            </div>

            <button type="button" onClick={handleNext} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s', boxShadow: '0 4px 16px var(--primary-dim)' }}>
              Final Details
            </button>
          </div>
        )}

        {step === 4 && (
          <div className={stepContainerClass}>
            <button type="button" onClick={handleBack} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 style={{ fontSize: '28px', fontFamily: 'var(--heading-font)', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Final Details</h2>
            <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '32px' }}>Let {studioName} know who to contact.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <label style={label}>Full name <span style={req}>*</span></label>
                <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" style={input} />
              </div>
              <div>
                <label style={label}>Phone <span style={req}>*</span></label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08012345678" style={input} />
              </div>
            </div>

            <div style={row}>
              <label style={label}>Email <span style={opt}>(optional)</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" style={input} />
            </div>

            <div style={row}>
              <label style={label}>Preferred date <span style={req}>*</span></label>
              <input type="date" value={form.preferred_date} min={minDate} onChange={e => set('preferred_date', e.target.value)} style={input} />
            </div>

            {isEvent && (
              <>
                <div style={row}>
                  <label style={label}>Event name <span style={req}>*</span></label>
                  <input type="text" value={form.event_name} onChange={e => set('event_name', e.target.value)} placeholder="e.g. Sandra & Emeka's Wedding" style={input} />
                </div>
                <div style={row}>
                  <label style={label}>Venue <span style={opt}>(optional)</span></label>
                  <input type="text" value={form.location_address} onChange={e => set('location_address', e.target.value)} placeholder="Venue name or address" style={input} />
                </div>
              </>
            )}

            <div style={row}>
              <label style={label}>Notes <span style={opt}>(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Special requests..." rows={3} style={{ ...input, resize: 'vertical' }} />
            </div>

            {error && (
              <p style={{ fontSize: '13px', color: 'var(--destructive)', marginBottom: '20px', padding: '12px 16px', background: 'var(--destructive)', opacity: 0.9, borderRadius: '8px' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '16px', background: loading ? 'var(--primary-dim)' : 'var(--primary)', color: loading ? 'var(--primary)' : 'var(--on-primary)',
                borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', boxShadow: loading ? 'none' : '0 4px 16px var(--primary-dim)'
              }}>
              {loading ? 'Sending request…' : 'Request this session'}
            </button>
            <p style={{ fontSize: '13px', color: 'var(--text-faint)', textAlign: 'center', marginTop: '16px', fontWeight: '500' }}>
              No payment required now. {studioName} will confirm availability.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
