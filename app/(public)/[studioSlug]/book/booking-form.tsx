'use client'

import { useState, useMemo, useEffect } from 'react'
import { submitBookingRequest } from '@/app/actions/public'
import { motion, AnimatePresence } from 'framer-motion'
import DynamicIntakeForm from '@/components/dynamic-intake-form'
import { unwrapRow } from "@/lib/utils";

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
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  duration_mins?: number | null
  booking_fields?: any[]
}

type PackageLinkedService = {
  service_id:   string
  name:         string
  type:         string
  description?: string | null
  price?:       number | null
  category_value?: string | null
  session_type?: string | null
  outfits_count?: number | null
  duration_mins?: number | null
  booking_fields?: any[]
  is_addon:     boolean
  addon_price?: number | null
}

export type PublicPackage = {
  package_id:     string
  name:           string
  tagline?:       string | null
  base_price?:    number | null
  services:       PackageLinkedService[]
}

export default function BookingForm({
  studioId,
  studioName,
  sessionTypes,
  catalogServices = [],
  publicPackages = [],
  initialPackageId = null,
}: {
  studioId:               string
  studioName:             string
  sessionTypes:           { value: string; label: string; is_event?: boolean }[]
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
    preferred_date:   '',
    location_address: '',
    shoot_type:       '',
    event_name:       '',
    event_date:       '',
    notes:            '',
  })

  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>({})

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(initialPackageId)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])

  useEffect(() => {
    if (initialPackageId) {
      const pkg = publicPackages.find(p => p.package_id === initialPackageId)
      if (pkg) {
        const hasServices = pkg.services.filter(s => !s.is_addon)
        const primaryService = hasServices.find(s => s.category_value) ?? hasServices[0]
        if (primaryService) {
          set('session_type', primaryService.session_type && primaryService.session_type !== 'any' ? primaryService.session_type : sessionTypes[0]?.value ?? '')
        }
        
        const baseIds = hasServices.map(s => s.service_id)
        setSelectedServiceIds(baseIds)
        setStep(3) // Jump to step 3 (addons) if package was preselected
      }
    }
  }, [initialPackageId, publicPackages, sessionTypes])

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
    return publicPackages.filter(p => {
      // Must have at least one base service matching the intent (or be a generic package if no services restrict it)
      const baseSvcs = p.services.filter(s => !s.is_addon)
      if (baseSvcs.length === 0) return true
      return baseSvcs.some(s => 
        (s.session_type === 'any' || !s.session_type || s.session_type === form.session_type)
      )
    })
  }, [publicPackages, form.session_type])

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

  const customFields = useMemo(() => {
    const fields: { id: string; label: string; type: string; required: boolean }[] = []
    const seenIds = new Set<string>()
    for (const svcId of selectedServiceIds) {
      const svc = catalogServices.find(s => s.service_id === svcId) || 
        publicPackages.flatMap(p => p.services).find(s => s.service_id === svcId)
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
  }, [selectedServiceIds, catalogServices, publicPackages])

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step !== 4) return handleNext()
    
    if (!form.full_name.trim())              { setError('Please enter your full name');    return }
    if (!form.phone.trim())                  { setError('Please enter your phone number'); return }
    if (!form.preferred_date)                { setError('Please select a preferred date'); return }

    // Validate dynamic custom fields
    for (const field of customFields) {
      if (field.required) {
        const val = customAnswers[field.id]
        if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
          setError(`Please answer: ${field.label}`)
          return
        }
      }
    }

    setLoading(true)
    setError('')

    const result = await submitBookingRequest({
      studio_id: studioId,
      ...form,
      package_id: selectedPackageId ?? undefined,
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

  if (duplicate) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6 text-2xl text-[var(--primary)] shadow-lg shadow-[var(--primary)]/5">✦</div>
        <h2 className="text-2xl font-bold mb-3 text-[var(--foreground)] tracking-tight">Already received</h2>
        <div className="w-8 h-1 bg-[var(--primary)] mx-auto mb-6 rounded-full" />
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs mx-auto mb-8">
          <strong className="text-[var(--foreground)]">{form.full_name.split(' ')[0]}</strong>, we already have a booking request from you for this date.
          {studioName} will be in touch to confirm — no need to submit again.
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="animate-in fade-in zoom-in-95 duration-500 text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/20 flex items-center justify-center mx-auto mb-6 text-2xl text-[var(--primary)] shadow-lg shadow-[var(--primary)]/5">✦</div>
        <h2 className="text-2xl font-bold mb-3 text-[var(--foreground)] tracking-tight">Request received</h2>
        <div className="w-8 h-1 bg-[var(--primary)] mx-auto mb-6 rounded-full" />
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-xs mx-auto mb-6">
          Thank you, <strong className="text-[var(--foreground)]">{form.full_name.split(' ')[0]}</strong>. {studioName} will be in touch to confirm your session.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]/70">You can close this page.</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className="flex gap-2 mb-8 justify-center">
        {[1,2,3,4].map(s => (
          <div key={s} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${s <= step ? 'bg-[var(--primary)]' : 'bg-[var(--primary)]/20'}`} />
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[var(--foreground)] tracking-tight">What are you looking for?</h2>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mb-8">Let's customize your experience.</p>
            
            <div className="mb-8">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-4">
                Session <span className="text-[var(--primary)] ml-1">*</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {sessionTypes.map(t => {
                  const isSelected = form.session_type === t.value
                  return (
                    <button key={t.value} type="button"
                      onClick={() => set('session_type', t.value)}
                      className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                        ${isSelected 
                          ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/25 scale-[1.02]' 
                          : 'bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5'
                        }
                      `}>
                      {t.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-10">
              <button type="button" onClick={handleNext} className="w-full py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-base font-bold transition-all shadow-lg shadow-[var(--primary)]/25 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[var(--foreground)] tracking-tight">Select a Package</h2>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mb-8">Choose a base package for your {sessionTypes.find(s=>s.value===form.session_type)?.label.toLowerCase()} session.</p>
            
            <div className="flex flex-col gap-4 mb-8">
              <AnimatePresence>
                {filteredPackages.map((pkg, idx) => {
                  const isSelected = selectedPackageId === pkg.package_id
                  return (
                    <motion.div 
                      key={pkg.package_id} 
                      onClick={() => selectPackage(pkg.package_id)}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={`p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden group
                        ${isSelected 
                          ? 'bg-[var(--primary)]/5 border-2 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10' 
                          : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5'
                        }
                      `}>
                      {isSelected && (
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                      )}
                      <div className="flex justify-between items-start mb-2 relative z-10">
                        <h3 className={`text-lg md:text-xl font-bold ${isSelected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{pkg.name}</h3>
                        {pkg.base_price != null && (
                          <span className="text-lg md:text-xl font-extrabold text-[var(--primary)]">₦{pkg.base_price.toLocaleString()}</span>
                        )}
                      </div>
                      {pkg.tagline && <p className="text-sm text-[var(--muted-foreground)] mb-4 leading-relaxed relative z-10">{pkg.tagline}</p>}
                      
                      <div className="flex flex-wrap gap-4 text-xs font-semibold text-[var(--muted-foreground)] relative z-10">
                        {pkg.services.reduce((total, s) => total + (s.duration_mins ?? 0), 0) > 0 && (
                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> 
                            {pkg.services.reduce((total, s) => total + (s.duration_mins ?? 0), 0)} mins
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                          {pkg.services.filter(s=>!s.is_addon).length} items included
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
                
                <motion.div 
                  onClick={() => selectPackage(null)}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: filteredPackages.length * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className={`p-6 rounded-2xl cursor-pointer transition-all duration-300
                    ${selectedPackageId === null 
                      ? 'bg-[var(--primary)]/5 border-2 border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10' 
                      : 'bg-[var(--background)] border border-dashed border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--primary)]/5'
                    }
                  `}>
                  <h3 className={`text-lg font-bold mb-1 ${selectedPackageId === null ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>Build Custom Shoot</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">Start from scratch and choose only what you need.</p>
                </motion.div>
              </AnimatePresence>
            </div>
            
            <button type="button" onClick={handleNext} disabled={selectedPackageId === undefined} className="w-full py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-base font-bold transition-all shadow-lg shadow-[var(--primary)]/25 disabled:opacity-50 disabled:shadow-none hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]">
              Continue to Add-ons
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[var(--foreground)] tracking-tight">Customize your session</h2>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mb-8">Would you like to add videography, products, or additional coverage?</p>
            
            <div className="max-h-[50vh] overflow-y-auto pr-2 mb-8 flex flex-col gap-4 styled-scrollbar">
              
              {pkgIncludedSvcs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-[var(--primary)] uppercase tracking-wider mb-3">Included in {selectedPackage?.name}</p>
                  {pkgIncludedSvcs.map(svc => (
                    <div key={svc.service_id} className="p-4 rounded-xl bg-[var(--background)] border border-[var(--primary)]/20 mb-2 flex justify-between items-center shadow-sm">
                      <span className="font-semibold text-[var(--foreground)]">{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</span>
                      <span className="text-xs font-bold text-[var(--primary)] tracking-wider uppercase">Included</span>
                    </div>
                  ))}
                </div>
              )}

              {pkgAddonSvcs.length > 0 && <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mt-2 mb-1">Package Upgrades</p>}
              {pkgAddonSvcs.map((svc, idx) => {
                const selected = selectedServiceIds.includes(svc.service_id)
                return (
                  <motion.button 
                    key={svc.service_id} 
                    type="button" 
                    onClick={() => toggleService(svc.service_id)} 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center justify-between p-4 rounded-xl text-left transition-all duration-300
                      ${selected 
                        ? 'bg-[var(--primary)]/10 border-2 border-[var(--primary)] shadow-md shadow-[var(--primary)]/10' 
                        : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5'
                      }
                    `}>
                    <div>
                      <p className={`font-semibold mb-1 ${selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</p>
                      {svc.description && <p className="text-xs text-[var(--muted-foreground)] m-0 leading-relaxed max-w-[280px]">{svc.description}</p>}
                    </div>
                    {svc.addon_price != null && <span className="font-bold text-[var(--primary)] text-right shrink-0 ml-4">+₦{Number(svc.addon_price).toLocaleString()}</span>}
                  </motion.button>
                )
              })}

              {otherCatalogSvcs.length > 0 && <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mt-4 mb-1">Additional Services & Products</p>}
              {otherCatalogSvcs.map((svc, idx) => {
                const selected = selectedServiceIds.includes(svc.service_id)
                return (
                  <motion.button 
                    key={svc.service_id} 
                    type="button" 
                    onClick={() => toggleService(svc.service_id)} 
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`flex items-center justify-between p-4 rounded-xl text-left transition-all duration-300
                      ${selected 
                        ? 'bg-[var(--primary)]/10 border-2 border-[var(--primary)] shadow-md shadow-[var(--primary)]/10' 
                        : 'bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5'
                      }
                    `}>
                    <div>
                      <p className={`font-semibold mb-1 ${selected ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{TYPE_ICONS[svc.type] ?? '✦'} {svc.name}</p>
                      {svc.description && <p className="text-xs text-[var(--muted-foreground)] m-0 leading-relaxed max-w-[280px]">{svc.description}</p>}
                    </div>
                    {svc.price != null && <span className="font-bold text-[var(--primary)] text-right shrink-0 ml-4">+₦{Number(svc.price).toLocaleString()}</span>}
                  </motion.button>
                )
              })}
            </div>

            <div className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl mb-8 flex justify-between items-center shadow-sm">
              <span className="font-semibold text-[var(--foreground)]">Estimated Total</span>
              <span className="text-2xl font-extrabold text-[var(--primary)]">₦{estTotal.toLocaleString()}</span>
            </div>

            <button type="button" onClick={handleNext} className="w-full py-4 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-xl text-base font-bold transition-all shadow-lg shadow-[var(--primary)]/25 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]">
              Final Details
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button type="button" onClick={handleBack} className="flex items-center gap-2 text-sm font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </button>
            <h2 className="text-2xl md:text-3xl font-bold mb-2 text-[var(--foreground)] tracking-tight">Final Details</h2>
            <p className="text-sm md:text-base text-[var(--muted-foreground)] mb-8">Let {studioName} know who to contact.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Full name <span className="text-[var(--primary)] ml-1">*</span></label>
                <input type="text" value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Your full name" className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Phone <span className="text-[var(--primary)] ml-1">*</span></label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="08012345678" className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all" />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Email <span className="text-[var(--muted-foreground)] ml-1 font-normal lowercase">(optional)</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all" />
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Preferred date <span className="text-[var(--primary)] ml-1">*</span></label>
              <input type="date" value={form.preferred_date} min={minDate} onChange={e => set('preferred_date', e.target.value)} className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all" />
            </div>

            {isEvent && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Event name <span className="text-[var(--primary)] ml-1">*</span></label>
                <input type="text" value={form.event_name} onChange={e => set('event_name', e.target.value)} placeholder="e.g. Sandra & Emeka's Wedding" className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all" />
              </div>
            )}

            <DynamicIntakeForm 
              fields={customFields}
              answers={customAnswers}
              onChange={(id, value) => setCustomAnswers(prev => ({ ...prev, [id]: value }))}
            />

            <div className="mb-8">
              <label className="block text-xs font-bold text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Notes <span className="text-[var(--muted-foreground)] ml-1 font-normal lowercase">(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Special requests..." rows={3} className="w-full p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] text-sm focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 outline-none transition-all resize-y" />
            </div>

            {error && (
              <p className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-semibold mb-6 border border-destructive/20 shadow-sm animate-in fade-in">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading}
              className={`w-full py-4 rounded-xl text-base font-bold transition-all ${
                loading 
                  ? 'bg-[var(--primary)]/50 text-[var(--primary-foreground)]/50 cursor-not-allowed' 
                  : 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/25 hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'
              }`}>
              {loading ? 'Sending request…' : 'Request this session'}
            </button>
            <p className="text-xs text-[var(--muted-foreground)] text-center mt-4 font-semibold tracking-wide">
              No payment required now. {studioName} will confirm availability.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
