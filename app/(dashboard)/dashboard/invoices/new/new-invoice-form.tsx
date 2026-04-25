'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addInvoice } from '@/app/actions/invoices'
import SearchableSelect from '@/components/searchable-select'
import { sessionTitle } from '@/lib/session-title'

type Addon = {
  addon_id: string
  name: string
  price: number | string
}

type BookingPackageSummary = {
  name?: string | null
  base_price?: number | string | null
}

type BookingClientSummary = {
  full_name?: string | null
  phone?: string | null
}

type Booking = {
  booking_id: string
  package_id?: string | null
  session_type?: string | null
  session_date?: string | null
  outfits_count?: number | null
  clients?: BookingClientSummary | null
  packages?: BookingPackageSummary | null
}

type Package = {
  package_id: string
  name: string
  base_price: number | string
  session_type?: string | null
  outfits_count?: number | null
  edited_photos?: number | null
  inclusions?: string[] | null
  package_addons?: Addon[] | null
}

type InvoiceFormState = {
  booking_id: string
  agreed_amount: string
  discount: string
  tax: string
  due_date: string
}

type BookingSelectionState = {
  agreedAmount: string
  selectedPackageId: string
  addons: Addon[]
  editedPhotos: string
}

function getBookingSelectionState(
  bookingId: string,
  bookings: Booking[],
  packages: Package[],
): BookingSelectionState {
  const booking = bookings.find((item) => item.booking_id === bookingId)
  if (!booking) {
    return {
      agreedAmount: '',
      selectedPackageId: '',
      addons: [],
      editedPhotos: '',
    }
  }

  if (booking.package_id) {
    const pkg = packages.find((item) => item.package_id === booking.package_id)
    if (pkg) {
      return {
        agreedAmount: String(pkg.base_price),
        selectedPackageId: pkg.package_id,
        addons: pkg.package_addons ?? [],
        editedPhotos: pkg.edited_photos != null ? String(pkg.edited_photos) : '',
      }
    }
  }

  return {
    agreedAmount: booking.packages?.base_price ? String(booking.packages.base_price) : '',
    selectedPackageId: '',
    addons: [],
    editedPhotos: '',
  }
}

export default function NewInvoiceForm({
  bookings,
  packages,
  preselectedSessionId = '',
}: {
  bookings: Booking[]
  packages: Package[]
  preselectedSessionId?: string
}) {
  const router = useRouter()
  const initialSelection = getBookingSelectionState(preselectedSessionId, bookings, packages)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dupInvoiceId, setDupInvoiceId] = useState('')
  const [addons, setAddons] = useState<Addon[]>(initialSelection.addons)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [selectedPackageId, setSelectedPackageId] = useState(initialSelection.selectedPackageId)
  const [editedPhotos, setEditedPhotos] = useState(initialSelection.editedPhotos)
  const [form, setForm] = useState<InvoiceFormState>({
    booking_id: preselectedSessionId,
    agreed_amount: initialSelection.agreedAmount,
    discount: '0',
    tax: '0',
    due_date: '',
  })

  function update(field: keyof InvoiceFormState, value: string) {
    if (field === 'booking_id') {
      const selection = getBookingSelectionState(value, bookings, packages)
      setForm((prev) => ({
        ...prev,
        booking_id: value,
        agreed_amount: selection.agreedAmount,
      }))
      setSelectedPackageId(selection.selectedPackageId)
      setAddons(selection.addons)
      setSelectedAddons([])
      setEditedPhotos(selection.editedPhotos)
      return
    }

    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function selectPackage(pkg: Package) {
    setSelectedPackageId(pkg.package_id)
    setForm((prev) => ({ ...prev, agreed_amount: String(pkg.base_price) }))
    setAddons(pkg.package_addons ?? [])
    setSelectedAddons([])
    setEditedPhotos(pkg.edited_photos != null ? String(pkg.edited_photos) : '')
  }

  function clearPackage() {
    setSelectedPackageId('')
    setAddons([])
    setSelectedAddons([])
    setForm((prev) => ({ ...prev, agreed_amount: '' }))
  }

  function toggleAddon(id: string) {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  async function handleSubmit(forceDuplicate = false) {
    if (!form.booking_id) {
      setError('Please select a session')
      return
    }
    if (!form.agreed_amount || parseFloat(form.agreed_amount) <= 0) {
      setError('Enter the agreed amount')
      return
    }

    setLoading(true)
    setError('')
    setDupInvoiceId('')
    const { error: submitError, invoiceId, existingInvoiceId } = await addInvoice({
      ...form,
      addon_ids: selectedAddons,
      package_id: selectedPackageId || undefined,
      force_duplicate: forceDuplicate,
    })

    if (submitError === '__DUPLICATE__') {
      setDupInvoiceId(existingInvoiceId ?? '')
      setLoading(false)
      return
    }

    if (submitError) {
      setError(submitError)
      setLoading(false)
      return
    }

    router.push(`/dashboard/invoices/${invoiceId}`)
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  const selectedBooking = bookings.find((item) => item.booking_id === form.booking_id)
  const outfitsCount = selectedBooking?.outfits_count ?? null
  const photosCount = editedPhotos ? parseInt(editedPhotos) : null
  const hasSpecs = outfitsCount != null || photosCount != null

  const sessionMatches = packages.filter((pkg) =>
    !selectedBooking?.session_type || pkg.session_type === selectedBooking.session_type
  )

  const exactMatches = hasSpecs
    ? sessionMatches.filter((pkg) => {
        const outfitsOk = outfitsCount != null ? pkg.outfits_count === outfitsCount : true
        const photosOk = photosCount != null ? pkg.edited_photos === photosCount : true
        return outfitsOk && photosOk
      })
    : []

  const otherPackages = hasSpecs
    ? sessionMatches.filter((pkg) => !exactMatches.includes(pkg))
    : sessionMatches

  const canSaveAsPackage = selectedBooking && parseFloat(form.agreed_amount) > 0 && hasSpecs
  const saveAsPackageUrl = canSaveAsPackage
    ? `/dashboard/packages/new?outfits=${outfitsCount ?? ''}&photos=${editedPhotos}&price=${form.agreed_amount}&session_type=${selectedBooking.session_type ?? 'studio'}`
    : null

  const baseAmount = parseFloat(form.agreed_amount) || 0
  const selectedAddonRows = addons.filter((addon) => selectedAddons.includes(addon.addon_id))
  const previewDiscount = Math.max(0, parseFloat(form.discount) || 0)
  const previewTaxableSubtotal = baseAmount + selectedAddonRows.reduce((sum, addon) => sum + Number(addon.price), 0)
  const previewTax = previewTaxableSubtotal * (Math.max(0, parseFloat(form.tax) || 0)) / 100
  const previewTotal = Math.max(0, previewTaxableSubtotal - previewDiscount + previewTax)

  function renderPackageCard(pkg: Package) {
    const selected = selectedPackageId === pkg.package_id
    const specs: string[] = []
    if (pkg.outfits_count != null) specs.push(`${pkg.outfits_count} outfit${pkg.outfits_count !== 1 ? 's' : ''}`)
    if (pkg.edited_photos != null) specs.push(`${pkg.edited_photos} photos`)
    const specsLine = specs.length > 0 ? specs.join(' . ') : null
    const inclusionsPreview = !specsLine && pkg.inclusions?.length
      ? pkg.inclusions.slice(0, 3).join(' . ')
      : null

    return (
      <button
        key={pkg.package_id}
        type="button"
        onClick={() => selectPackage(pkg)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '12px 14px',
          borderRadius: '8px',
          cursor: 'pointer',
          textAlign: 'left',
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
          NGN {Number(pkg.base_price).toLocaleString()}
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
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Session <span style={{ color: '#e24b4a' }}>*</span></label>
          {bookings.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No sessions yet - <Link href="/dashboard/sessions/new" style={{ color: 'var(--link)' }}>create one first</Link>
            </p>
          ) : (
            <SearchableSelect
              options={bookings.map((booking) => ({
                value: booking.booking_id,
                label: sessionTitle(booking.clients?.full_name, booking.session_type, booking.session_date),
                sublabel: [
                  booking.clients?.phone,
                  booking.packages?.name,
                ].filter(Boolean).join(' · '),
              }))}
              value={form.booking_id}
              onChange={(value) => update('booking_id', value)}
              placeholder="Search by name or phone..."
              emptyMessage="No sessions match"
            />
          )}
        </div>

        {form.booking_id && (
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--hover)', borderRadius: '8px' }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Pricing specs
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }}>Outfits</p>
                <p style={{ fontSize: '15px', fontWeight: '500', margin: 0, color: outfitsCount != null ? 'var(--text)' : 'var(--text-4)' }}>
                  {outfitsCount != null ? outfitsCount : '-'}
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
                  onChange={(e) => setEditedPhotos(e.target.value)}
                  placeholder="e.g. 40"
                  style={{ ...inputStyle, fontSize: '14px' }}
                />
              </div>
            </div>
          </div>
        )}

        {form.booking_id && (
          <div style={{ marginBottom: '16px' }}>
            {hasSpecs ? (
              <>
                <div style={{ marginBottom: exactMatches.length > 0 || otherPackages.length > 0 ? '12px' : 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Matching packages
                  </p>
                  {exactMatches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {exactMatches.map((pkg) => renderPackageCard(pkg))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '8px 0' }}>
                      No saved package matches{outfitsCount != null ? ` ${outfitsCount} outfit${outfitsCount !== 1 ? 's' : ''}` : ''}{photosCount != null ? ` . ${photosCount} photos` : ''}. Enter the price below and save it as a package afterward if you want to reuse it.
                    </p>
                  )}
                </div>

                {otherPackages.length > 0 && (
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Other packages
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {otherPackages.map((pkg) => renderPackageCard(pkg))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              sessionMatches.length > 0 && (
                <>
                  <label style={labelStyle}>Package</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {sessionMatches.map((pkg) => renderPackageCard(pkg))}
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
                x No package
              </button>
            )}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>
            Agreed amount (NGN) <span style={{ color: '#e24b4a' }}>*</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.agreed_amount}
            onChange={(e) => update('agreed_amount', e.target.value)}
            placeholder="Enter the amount agreed with the client"
            style={inputStyle}
          />
          {selectedPackageId && (
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '5px 0 0' }}>
              Pre-filled from package price - edit if different
            </p>
          )}
        </div>

        {addons.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Add-ons</label>
            {addons.map((addon) => (
              <label key={addon.addon_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', padding: '8px 0', borderBottom: '1px solid var(--line-inner)', cursor: 'pointer' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={selectedAddons.includes(addon.addon_id)} onChange={() => toggleAddon(addon.addon_id)} />
                  {addon.name}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>NGN {Number(addon.price).toLocaleString()}</span>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Discount (NGN)</label>
            <input type="number" min="0" value={form.discount} onChange={(e) => update('discount', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tax (%)</label>
            <input type="number" min="0" value={form.tax} onChange={(e) => update('tax', e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Due date</label>
          <input type="date" value={form.due_date} onChange={(e) => update('due_date', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px' }}>Preview</p>
        {[
          { label: 'Agreed amount', value: baseAmount },
          ...selectedAddonRows.map((addon) => ({
            label: addon.name,
            value: Number(addon.price),
          })),
          { label: 'Discount', value: -previewDiscount },
          { label: `Tax (${form.tax || 0}%)`, value: previewTax },
        ].map((row, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-3)', marginBottom: '6px' }}>
            <span>{row.label}</span>
            <span>{row.value < 0 ? '-' : ''}NGN {Math.abs(row.value).toLocaleString()}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--line-inner)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '500', fontSize: '15px' }}>
          <span>Total</span>
          <span>NGN {previewTotal.toLocaleString()}</span>
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      {dupInvoiceId && (
        <div style={{ marginBottom: '12px', padding: '12px 14px', background: '#fffbea', border: '1px solid #f5e07a', borderRadius: '10px' }}>
          <p style={{ fontSize: '13px', color: '#7a5800', margin: '0 0 8px', fontWeight: '500' }}>
            This session already has an invoice.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
            <Link href={`/dashboard/invoices/${dupInvoiceId}`}
              style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
              View existing invoice →
            </Link>
            <span style={{ color: '#ccc' }}>|</span>
            <button type="button" onClick={() => handleSubmit(true)}
              style={{ fontSize: '13px', background: 'none', border: 'none', cursor: 'pointer', color: '#7a5800', padding: 0, textDecoration: 'underline' }}>
              Create another anyway
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: saveAsPackageUrl ? '10px' : 0 }}>
        <button onClick={() => handleSubmit(false)} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Creating...' : 'Create invoice'}
        </button>
        <button onClick={() => router.back()} type="button" style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>

      {saveAsPackageUrl && !selectedPackageId && (
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          Using custom pricing?{' '}
          <Link href={saveAsPackageUrl} style={{ color: 'var(--link)', textDecoration: 'none' }}>
            Save these terms as a package
          </Link>{' '}
          to reuse next time.
        </p>
      )}
    </div>
  )
}
