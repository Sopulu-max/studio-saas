'use client'

import { useState, useMemo, useEffect } from 'react'
import { submitBookingRequest } from '@/app/actions/public'
import { motion, AnimatePresence } from 'framer-motion'
import DynamicIntakeForm from '@/components/dynamic-intake-form'

const TYPE_ICONS: Record<string, string> = {
  service: '🎯',
  product: '📦',
  digital: '💻',
}

export default function PackageIntakeDrawer({
  studioId,
  studioName,
  sessionTypes,
  catalogServices = [],
  pkg,
}: {
  studioId: string
  studioName: string
  sessionTypes: any[]
  catalogServices: any[]
  pkg: any
}) {
  const [isOpen, setIsOpen] = useState(false)

  // Hash-based routing for the drawer
  useEffect(() => {
    const checkHash = () => setIsOpen(window.location.hash === '#book')
    checkHash()
    window.addEventListener('hashchange', checkHash)
    return () => window.removeEventListener('hashchange', checkHash)
  }, [])

  function closeDrawer() {
    window.location.hash = ''
  }

  // --- Booking Form State ---
  const [step, setStep] = useState(1) // 1: Add-ons, 2: Details
  const [submitted, setSubmitted] = useState(false)
  const [duplicate, setDuplicate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Derive initial session_type from the package's primary service
  const baseServices = pkg?.package_services?.filter((s: any) => !s.is_addon).map((s: any) => s.services) || []
  const primaryService = baseServices.find((s: any) => s?.category_value) ?? baseServices[0]
  const initialSessionType = (primaryService?.session_type && primaryService?.session_type !== 'any') 
    ? primaryService.session_type 
    : (sessionTypes[0]?.value ?? '')

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    session_type: initialSessionType,
    preferred_date: '',
    location_address: '',
    shoot_type: '',
    event_name: '',
    event_date: '',
    notes: '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(baseServices.map((s: any) => s.service_id))

  // Smart Pipeline Logistics
  const isEvent = sessionTypes.find(t => t.value === form.session_type)?.is_event ?? false
  const isOutdoor = sessionTypes.find(t => t.value === form.session_type)?.is_outdoor ?? false

  const includedIds = useMemo(() => new Set(baseServices.map((s: any) => s.service_id)), [baseServices])

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleService(id: string) {
    if (includedIds.has(id)) return
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  // Catalog Math
  const pkgLinkedServiceIds = new Set(pkg?.package_services?.map((s: any) => s.service_id) || [])
  const otherCatalogSvcs = catalogServices.filter(s => !pkgLinkedServiceIds.has(s.service_id))
  const pkgAddonSvcs = pkg?.package_services?.filter((s: any) => s.is_addon && s.services).map((s: any) => ({ ...s.services, addon_price: s.addon_price })) || []
  const pkgIncludedSvcs = baseServices

  const pkgBase = pkg?.base_price != null ? Number(pkg.base_price) : 0
  const selectedOptional = selectedServiceIds.filter(id => !includedIds.has(id))
  const optionalTotal = selectedOptional.reduce((sum, id) => {
    const pkgAddon = pkgAddonSvcs.find((s: any) => s.service_id === id)
    if (pkgAddon) return sum + (pkgAddon.addon_price ?? pkgAddon.price ?? 0)
    const catalog = catalogServices.find(s => s.service_id === id)
    return sum + (catalog?.price ?? 0)
  }, 0)
  const estTotal = pkgBase + optionalTotal

  // Introspect Custom Fields
  const customFields = useMemo(() => {
    const fields: { id: string; label: string; type: string; required: boolean }[] = []
    const seenIds = new Set<string>()
    for (const svcId of selectedServiceIds) {
      const svc = catalogServices.find(s => s.service_id === svcId) || 
        pkg?.package_services?.map((ps: any) => ps.services).find((s: any) => s?.service_id === svcId)
      if (svc && Array.isArray(svc.booking_fields)) {
        for (const field of svc.booking_fields) {
          if (!seenIds.has(field.id)) {
            seenIds.add(field.id)
            fields.push(field)
          }
        }
      }
    }
    return fields
  }, [selectedServiceIds, catalogServices, pkg])

  // Automatically skip Add-ons step if there are no add-ons and no catalog services
  useEffect(() => {
    if (isOpen && pkgAddonSvcs.length === 0 && otherCatalogSvcs.length === 0) {
      setStep(2)
    }
  }, [isOpen, pkgAddonSvcs.length, otherCatalogSvcs.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name || !form.phone || !form.preferred_date) return
    if (isEvent && !form.event_name) return
    if (isOutdoor && !form.location_address) return

    for (const f of customFields) {
      if (f.required && (!customAnswers[f.id] || customAnswers[f.id].toString().trim() === '')) {
        setError(`Please answer: ${f.label}`)
        return
      }
    }

    setLoading(true)
    setError('')

    const result = await submitBookingRequest({
      studio_id: studioId,
      ...form,
      package_id: pkg.package_id,
      selected_service_ids: Array.from(selectedServiceIds),
      custom_answers: customAnswers,
    })
    
    if (result.error === '__DUPLICATE__') {
      setDuplicate(true)
    } else if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      if (result.whatsappUrl) window.location.href = result.whatsappUrl
      else setSubmitted(true)
    }
  }

  const labelStyle: React.CSSProperties = { fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '6px', fontWeight: '600', letterSpacing: '.04em', textTransform: 'uppercase' }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', fontSize: '14px', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-sm)', padding: '10px 13px', outline: 'none', color: 'var(--text-main)', background: 'var(--card-bg)' }
  const reqStyle:   React.CSSProperties = { color: 'var(--primary)' }
  const optStyle:   React.CSSProperties = { color: 'var(--text-4)', fontSize: '11px', fontWeight: '400', textTransform: 'none', letterSpacing: '0' }
  const rowStyle:   React.CSSProperties = { marginBottom: '20px' }
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={closeDrawer}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ 
              position: 'fixed', top: 0, right: 0, bottom: 0, 
              width: '100%', maxWidth: '480px', 
              background: 'var(--bg)', zIndex: 10000, 
              boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
              display: 'flex', flexDirection: 'column',
              borderLeft: '1px solid var(--line-inner)'
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--nav-bg)', backdropFilter: 'blur(12px)' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-main)' }}>{pkg.name}</h2>
                <p style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: '500' }}>₦{estTotal.toLocaleString()}</p>
              </div>
              <button onClick={closeDrawer} style={{ background: 'var(--card-bg)', border: '1px solid var(--line-inner)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-main)' }}>
                ✕
              </button>
            </div>

            {/* Content area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {duplicate ? (
                <div style={{ textAlign: 'center', padding: '52px 0' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px', color: 'var(--primary)' }}>✦</div>
                  <h2 style={{ fontSize: '22px', fontWeight: '400', marginBottom: '12px', color: 'var(--text-main)' }}>Already received</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', margin: '0 auto' }}>
                    <strong style={{ color: 'var(--text-main)' }}>{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.
                  </p>
                </div>
              ) : submitted ? (
                <div style={{ textAlign: 'center', padding: '52px 0' }}>
                  <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-dim)', border: '1px solid var(--primary-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: '22px', color: 'var(--primary)' }}>✦</div>
                  <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '12px', color: 'var(--text-main)' }}>Request received</h2>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.7', margin: '0 auto 24px' }}>
                    Thank you, <strong style={{ color: 'var(--text-main)' }}>{form.full_name.split(' ')[0]}</strong>. {studioName} will be in touch to confirm your session.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <h3 style={{ fontSize: '22px', fontWeight: '600', marginBottom: '8px', color: 'var(--text-main)' }}>Enhance your package</h3>
                      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '32px' }}>Select any optional add-ons to customize your session.</p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                        {pkgAddonSvcs.map((svc: any) => {
                          const selected = selectedServiceIds.includes(svc.service_id)
                          return (
                            <button 
                              key={svc.service_id} type="button" onClick={() => toggleService(svc.service_id)} 
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', textAlign: 'left',
                                border: selected ? '2px solid var(--primary)' : '1px solid var(--card-border)',
                                background: selected ? 'var(--primary-dim)' : 'var(--card-bg)', transition: 'border 0.2s, background 0.2s',
                              }}>
                              <div>
                                <p style={{ fontSize: '15px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text-main)' }}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</p>
                                {svc.description && <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-muted)' }}>{svc.description}</p>}
                              </div>
                              {svc.addon_price != null && <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary)' }}>+₦{Number(svc.addon_price).toLocaleString()}</span>}
                            </button>
                          )
                        })}
                      </div>

                      <button type="button" onClick={() => setStep(2)} style={{ width: '100%', padding: '16px', background: 'var(--primary)', color: 'var(--on-primary)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', border: 'none' }}>
                        Continue
                      </button>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        {(pkgAddonSvcs.length > 0 || otherCatalogSvcs.length > 0) && (
                          <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            Back
                          </button>
                        )}
                        <h3 style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-main)', margin: 0 }}>Final Details</h3>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div>
                          <label style={labelStyle}>Full name <span style={reqStyle}>*</span></label>
                          <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Phone <span style={reqStyle}>*</span></label>
                          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08012345678" style={inputStyle} />
                        </div>
                      </div>

                      <div style={rowStyle}>
                        <label style={labelStyle}>Email <span style={optStyle}>(optional)</span></label>
                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" style={inputStyle} />
                      </div>

                      <div style={rowStyle}>
                        <label style={labelStyle}>Preferred date <span style={reqStyle}>*</span></label>
                        <input type="date" value={form.preferred_date} min={minDate} onChange={e => set('preferred_date', e.target.value)} style={inputStyle} />
                      </div>

                      {/* Smart Pipeline: Logistics Introspection */}
                      {isEvent && (
                        <div style={rowStyle}>
                          <label style={labelStyle}>Event name <span style={reqStyle}>*</span></label>
                          <input type="text" value={form.event_name} onChange={e => set('event_name', e.target.value)} placeholder="e.g. Sandra & Emeka's Wedding" style={inputStyle} />
                        </div>
                      )}
                      
                      {isOutdoor && (
                        <div style={rowStyle}>
                          <label style={labelStyle}>Location Address <span style={reqStyle}>*</span></label>
                          <input type="text" value={form.location_address} onChange={e => set('location_address', e.target.value)} placeholder="Where is the shoot happening?" style={inputStyle} />
                        </div>
                      )}

                      {/* Smart Pipeline: Custom Questions Introspection */}
                      <DynamicIntakeForm 
                        fields={customFields}
                        answers={customAnswers}
                        onChange={(id, value) => setCustomAnswers(prev => ({ ...prev, [id]: value }))}
                        inputStyle={inputStyle}
                        labelStyle={labelStyle}
                        reqStyle={reqStyle}
                        optStyle={optStyle}
                        rowStyle={rowStyle}
                      />

                      <div style={rowStyle}>
                        <label style={labelStyle}>Notes <span style={optStyle}>(optional)</span></label>
                        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Special requests..." rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                      </div>

                      {error && (
                        <p style={{ fontSize: '13px', color: 'var(--destructive)', marginBottom: '20px', padding: '12px 16px', background: 'rgba(255,0,0,0.1)', border: '1px solid var(--destructive)', borderRadius: '8px' }}>
                          {error}
                        </p>
                      )}

                      <button type="submit" disabled={loading} style={{ width: '100%', padding: '16px', background: loading ? 'var(--primary-dim)' : 'var(--primary)', color: loading ? 'var(--primary)' : 'var(--on-primary)', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', border: 'none' }}>
                        {loading ? 'Sending request…' : 'Request this session'}
                      </button>
                    </motion.div>
                  )}
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
