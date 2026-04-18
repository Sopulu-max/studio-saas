'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addInvoice } from '@/app/actions/invoices'
import SearchableSelect from '@/components/searchable-select'

export default function NewInvoiceForm({
  bookings,
  packages,
  preselectedSessionId = '',
}: {
  bookings: any[]
  packages: any[]
  preselectedSessionId?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [addons, setAddons] = useState<any[]>([])
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [editedPhotos, setEditedPhotos] = useState('')
  const [form, setForm] = useState({
    booking_id: preselectedSessionId, agreed_amount: '', discount: '0', tax: '0', due_date: '',
  })
  const [preview, setPreview] = useState({ subtotal: 0, discount: 0, tax: 0, total: 0 })

  // When session changes, prefill agreed_amount from package and load addons
  useEffect(() => {
    const booking = bookings.find(b => b.booking_id === form.booking_id)
    if (!booking) {
      setSelectedPackageId('')
      setAddons([])
      setSelectedAddons([])
      setEditedPhotos('')
      return
    }

    // Auto-select if booking already has a package
    if (booking.package_id) {
      const pkg = packages.find(p => p.package_id === booking.package_id)
      if (pkg) {
        setSelectedPackageId(pkg.package_id)
        setForm(prev => ({ ...prev, agreed_amount: String(pkg.base_price) }))
        setAddons(pkg.package_addons ?? [])
        setSelectedAddons([])
        if (pkg.edited_photos != null) setEditedPhotos(String(pkg.edited_photos))
        return
      }
    }

    setForm(prev => ({
      ...prev,
      agreed_amount: booking.packages?.base_price ? String(booking.packages.base_price) : '',
    }))
    setSelectedPackageId('')
    setAddons([])
    setSelectedAddons([])
  }, [form.booking_id])

  // Recalculate preview whenever amounts change
  useEffect(() => {
    const base = parseFloat(form.agreed_amount) || 0
    const addonTotal = addons
      .filter(a => selectedAddons.includes(a.addon_id))
      .reduce((sum, a) => sum + Number(a.price), 0)
    const subtotal = base + addonTotal
    const discount = Math.max(0, parseFloat(form.discount) || 0)
    const taxAmt   = subtotal * (Math.max(0, parseFloat(form.tax) || 0)) / 100
    const total    = Math.max(0, subtotal - discount + taxAmt)
    setPreview({ subtotal, discount, tax: taxAmt, total })
  }, [form.agreed_amount, form.discount, form.tax, selectedAddons, addons])

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function selectPackage(pkg: any) {
    setSelectedPackageId(pkg.package_id)
    setForm(prev => ({ ...prev, agreed_amount: String(pkg.base_price) }))
    setAddons(pkg.package_addons ?? [])
    setSelectedAddons([])
    if (pkg.edited_photos != null) setEditedPhotos(String(pkg.edited_photos))
  }

  function clearPackage() {
    setSelectedPackageId('')
    setAddons([])
    setSelectedAddons([])
    setForm(prev => ({ ...prev, agreed_amount: '' }))
  }

  function toggleAddon(id: string) {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    )
  }

  async function handleSubmit() {
    if (!form.booking_id)    { setError('Please select a session'); return }
    if (!form.agreed_amount || parseFloat(form.agreed_amount) <= 0) {
      setError('Enter the agreed amount'); return
    }
    setLoading(true)
    setError('')
    const { error, invoiceId } = await addInvoice({
      ...form,
      addon_ids: selectedAddons,
      package_id: selectedPackageId || undefined,
    })
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/invoices/${invoiceId}`)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  const selectedBooking   = bookings.find(b => b.booking_id === form.booking_id)
  const outfitsCount      = selectedBooking?.outfits_count ?? null          // integer | null from booking
  const photosCount       = editedPhotos ? parseInt(editedPhotos) : null    // integer | null from input
  const hasSpecs          = outfitsCount != null || photosCount != null

  const sessionMatches = packages.filter(p =>
    !selectedBooking?.session_type || p.session_type === selectedBooking.session_type
  )

  // Exact = session_type + both specs match (only active when specs are provided)
  const exactMatches = hasSpecs
    ? sessionMatches.filter(p => {
        const outfitsOk = outfitsCount != null ? p.outfits_count === outfitsCount : true
        const photosOk  = photosCount  != null ? p.edited_photos === photosCount  : true
        return outfitsOk && photosOk
      })
    : []

  const otherPackages = hasSpecs
    ? sessionMatches.filter(p => !exactMatches.includes(p))
    : sessionMatches

  // Build "save as package" URL
  const canSaveAsPackage = selectedBooking && (parseFloat(form.agreed_amount) > 0) && hasSpecs
  const saveAsPackageUrl = canSaveAsPackage
    ? `/dashboard/packages/new?outfits=${outfitsCount ?? ''}&photos=${editedPhotos}&price=${form.agreed_amount}&session_type=${selectedBooking.session_type ?? 'studio'}`
    : null

  function renderPackageCard(pkg: any) {
    const selected = selectedPackageId === pkg.package_id
    const specs: string[] = []
    if (pkg.outfits_count != null) specs.push(`${pkg.outfits_count} outfit${pkg.outfits_count !== 1 ? 's' : ''}`)
    if (pkg.edited_photos != null) specs.push(`${pkg.edited_photos} photos`)
    const specsLine = specs.length > 0 ? specs.join(' · ') : null
    const inclusionsPreview = !specsLine && pkg.inclusions?.length > 0
      ? pkg.inclusions.slice(0, 3).join(' · ')
      : null
    return (
      <button
        key={pkg.package_id}
        type="button"
        onClick={() => selectPackage(pkg)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '12px 14px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
          border: selected ? '1.5px solid var(--btn)' : '1px solid var(--line)',
          background: selected ? 'var(--btn)' : 'var(--surface)',
          color: selected ? 'var(--btn-fg)' : 'var(--text)',
          width: '100%',
        }}
      >
        <div>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>{pkg.name}</div>
          {(specsLine ?? inclusionsPreview) && (
            <div style={{ fontSize: '12px', opacity: 0.65, marginTop: '2px' }}>
              {specsLine ?? inclusionsPreview}
            </div>
          )}
        </div>
        <div style={{ fontSize: '15px', fontWeight: '600', flexShrink: 0, marginLeft: '12px' }}>
          ₦{Number(pkg.base_price).toLocaleString()}
        </div>
      </button>
    )
  }

  return (
    <div style={{ maxWidth: '560px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New invoice</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Generate an invoice for a session</p>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>

        {/* Session selector */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Session <span style={{ color: '#e24b4a' }}>*</span></label>
          {bookings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No sessions yet — <a href="/dashboard/sessions/new" style={{ color: 'var(--link)' }}>create one first</a>
            </p>
          ) : (
            <SearchableSelect
              options={bookings.map((b: any) => ({
                value: b.booking_id,
                label: b.clients?.full_name ?? 'Unknown',
                sublabel: [
                  b.clients?.phone,
                  b.packages?.name,
                  new Date(b.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
                ].filter(Boolean).join(' · '),
              }))}
              value={form.booking_id}
              onChange={v => update('booking_id', v)}
              placeholder="Search by name or phone…"
              emptyMessage="No sessions match"
            />
          )}
        </div>

        {/* Pricing specs — shown when a session is selected */}
        {form.booking_id && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--hover)', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Pricing specs
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Outfits</p>
                <p style={{ fontSize: '15px', fontWeight: '500', margin: 0, color: outfitsCount != null ? 'var(--text)' : 'var(--text-4)' }}>
                  {outfitsCount != null ? outfitsCount : '—'}
                </p>
                {outfitsCount == null && (
                  <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '2px 0 0' }}>From session record</p>
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-4)', display: 'block', marginBottom: '4px' }}>
                  Edited photos
                </label>
                <input
                  type="number"
                  min="1"
                  value={editedPhotos}
                  onChange={e => setEditedPhotos(e.target.value)}
                  placeholder="e.g. 40"
                  style={{ ...inputStyle, fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Package picker */}
        {form.booking_id && (
          <div style={{ marginBottom: '16px' }}>
            {hasSpecs ? (
              <>
                {/* Exact matches */}
                <div style={{ marginBottom: exactMatches.length > 0 || otherPackages.length > 0 ? '12px' : 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Matching packages
                  </p>
                  {exactMatches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {exactMatches.map(pkg => renderPackageCard(pkg))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '8px 0' }}>
                      No saved package matches{outfitsCount != null ? ` ${outfitsCount} outfit${outfitsCount !== 1 ? 's' : ''}` : ''}{photosCount != null ? ` · ${photosCount} photos` : ''}. Enter the price below — you can save it as a package after.
                    </p>
                  )}
                </div>

                {/* Other packages */}
                {otherPackages.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Other packages
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {otherPackages.map(pkg => renderPackageCard(pkg))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              sessionMatches.length > 0 && (
                <>
                  <label style={labelStyle}>Package</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionMatches.map(pkg => renderPackageCard(pkg))}
                  </div>
                </>
              )
            )}

            {selectedPackageId && (
              <button
                type="button"
                onClick={clearPackage}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '12px', padding: '6px 0 0', display: 'block' }}
              >
                ✕ No package
              </button>
            )}
          </div>
        )}

        {/* Agreed amount */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Agreed amount (₦) <span style={{ color: '#e24b4a' }}>*</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.agreed_amount}
            onChange={e => update('agreed_amount', e.target.value)}
            placeholder="Enter the amount agreed with the client"
            style={inputStyle}
          />
          {selectedPackageId && (
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '5px 0 0' }}>
              Pre-filled from package price — edit if different
            </p>
          )}
        </div>

        {/* Add-ons */}
        {addons.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Add-ons</label>
            {addons.map(a => (
              <label key={a.addon_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid var(--line-inner)', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedAddons.includes(a.addon_id)} onChange={() => toggleAddon(a.addon_id)} />
                  {a.name}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>₦{Number(a.price).toLocaleString()}</span>
              </label>
            ))}
          </div>
        )}

        {/* Discount + Tax */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Discount (₦)</label>
            <input type="number" min="0" value={form.discount} onChange={e => update('discount', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tax (%)</label>
            <input type="number" min="0" value={form.tax} onChange={e => update('tax', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Due date</label>
          <input type="date" value={form.due_date} onChange={e => update('due_date', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Live preview */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>Preview</p>
        {[
          { label: 'Agreed amount', value: parseFloat(form.agreed_amount) || 0 },
          ...(addons.filter(a => selectedAddons.includes(a.addon_id)).map(a => ({
            label: a.name, value: Number(a.price),
          }))),
          { label: 'Discount', value: -preview.discount },
          { label: `Tax (${form.tax || 0}%)`, value: preview.tax },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
            <span>{row.label}</span>
            <span>{row.value < 0 ? '-' : ''}₦{Math.abs(row.value).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '500', fontSize: '15px' }}>
          <span>Total</span>
          <span>₦{preview.total.toLocaleString()}</span>
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px', marginBottom: saveAsPackageUrl ? '10px' : 0 }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Creating...' : 'Create invoice'}
        </button>
        <button onClick={() => router.back()} type="button" style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>

      {saveAsPackageUrl && !selectedPackageId && (
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Using custom pricing?{' '}
          <a href={saveAsPackageUrl} style={{ color: 'var(--link)', textDecoration: 'none' }}>
            Save these terms as a package
          </a>{' '}
          to reuse next time.
        </p>
      )}
    </div>
  )
}
