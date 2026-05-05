'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addSession } from '@/app/actions/sessions'
import { addPackage } from '@/app/actions/packages'
import SearchableSelect from '@/components/searchable-select'
import ClientField from '@/components/client-field'
import { useStudioConfig } from '@/components/studio-config-provider'

type Client = {
  client_id: string
  full_name: string
  phone?: string | null
}

type SessionPackage = {
  package_id: string
  name: string
  base_price: number | string
  session_type?: string | null
  outfits_count?: number | null
  edited_photos?: number | null
}

type StaffMember = {
  staff_id: string
  full_name: string
  role?: string | null
}

const CATEGORY_SUGGESTIONS = [
  'Portrait', 'Wedding', 'Maternity', 'Corporate', 'Fashion',
  'Birthday', 'Graduation', 'Engagement', 'Newborn', 'Event',
  'Boudoir', 'Product', 'Lifestyle', 'Family', 'Other',
]

function isEventType(t: string)   { return t === 'event' }
function isOutdoorType(t: string) { return t === 'outdoor' }

export default function NewSessionForm({ clients, packages, staff }: {
  clients: Client[]
  packages: SessionPackage[]
  staff: StaffMember[]
}) {
  const router = useRouter()
  const config = useStudioConfig()
  const [loading, setLoading]               = useState(false)
  const [error, setError]                   = useState('')
  const [dupSessionId, setDupId]            = useState<string | null>(null)
  const [newPackageName, setNewPackageName] = useState('')
  const [selectedClientName, setSelectedClientName] = useState('')

  const firstType    = config.sessionTypes[0]?.value ?? 'studio'
  const firstService = config.serviceTypes[0]?.value ?? 'photo'

  const [form, setForm] = useState({
    client_id: '',
    session_type: firstType,
    service_type: firstService,
    session_date: '',
    package_id: '',
    outfits_count: '',
    edited_photos: '',
    base_price: '',
    shoot_type: '',
    location_address: '',
    event_name: '',
    event_date: '',
    drive_link: '',
    notes: '',
    photographer_id: '',
    editor_id: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Package matching logic
  const outfitsNum   = form.outfits_count ? parseInt(form.outfits_count) : null
  const photosNum    = form.edited_photos ? parseInt(form.edited_photos) : null
  const hasSpecs     = outfitsNum != null || photosNum != null

  const sessionFiltered = packages.filter((p) =>
    !p.session_type || p.session_type === form.session_type
  )
  const exactMatches = hasSpecs
    ? sessionFiltered.filter((p) => {
        const outfitsOk = outfitsNum != null ? p.outfits_count === outfitsNum : true
        const photosOk  = photosNum  != null ? p.edited_photos === photosNum  : true
        return outfitsOk && photosOk
      })
    : []
  const otherPackages = hasSpecs
    ? sessionFiltered.filter((p) => !exactMatches.includes(p))
    : sessionFiltered

  function pkgCard(p: SessionPackage) {
    const selected = form.package_id === p.package_id
    const specs: string[] = []
    if (p.outfits_count != null) specs.push(`${p.outfits_count} outfit${p.outfits_count !== 1 ? 's' : ''}`)
    if (p.edited_photos != null) specs.push(`${p.edited_photos} photos`)
    return (
      <button
        key={p.package_id}
        type="button"
        onClick={() => update('package_id', selected ? '' : p.package_id)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', textAlign: 'left', width: '100%',
          border: selected ? '1.5px solid var(--btn)' : '1px solid var(--line)',
          background: selected ? 'var(--btn)' : 'var(--surface)',
          color: selected ? 'var(--btn-fg)' : 'var(--text)',
        }}
      >
        <div>
          <div style={{ fontSize: '13px', fontWeight: '500' }}>{p.name}</div>
          {specs.length > 0 && (
            <div style={{ fontSize: '11px', opacity: 0.65, marginTop: '2px' }}>{specs.join(' · ')}</div>
          )}
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', flexShrink: 0, marginLeft: '12px' }}>
          ₦{Number(p.base_price).toLocaleString()}
        </div>
      </button>
    )
  }

  async function handleSubmit() {
    if (!form.client_id || !form.session_date) {
      setError('Client and session date are required')
      return
    }
    if (form.session_type === 'event' && !form.event_name) {
      setError('Event name is required for event sessions')
      return
    }
    setLoading(true)
    setError('')

    let packageId = form.package_id

    // Inline package creation if name is entered
    if (newPackageName.trim() && !packageId) {
      if (!form.base_price) { setError('Enter a price to save the package'); setLoading(false); return }
      if (!form.shoot_type) { setError('Enter a category to save the package'); setLoading(false); return }
      const { error: pkgError, packageId: newId } = await addPackage({
        name: newPackageName.trim(),
        description: '',
        base_price: form.base_price,
        duration_mins: '60',
        session_type: form.session_type,
        service_type: form.service_type,
        shoot_type: form.shoot_type,
        inclusions: [],
        outfits_count: form.outfits_count,
        edited_photos: form.edited_photos,
        coverage_hours: '',
        addons: [],
      })
      if (pkgError) { setError(pkgError); setLoading(false); return }
      packageId = (newId as string | undefined) ?? ''
    }

    const { base_price: _price, ...sessionForm } = form
    const result = await addSession({
      ...sessionForm,
      service_type: form.service_type,
      package_id: packageId,
      photographer_id: form.photographer_id,
      editor_id: form.editor_id,
    })
    if (result.error === '__DUPLICATE__') {
      setDupId((result as { duplicateId?: string }).duplicateId ?? null)
      setError('__DUPLICATE__')
      setLoading(false)
    } else if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/dashboard/sessions')
    }
  }

  async function handleForceSave() {
    setLoading(true)
    setError('')
    setDupId(null)
    const { base_price: _price, ...sessionForm } = form
    const result = await addSession({
      ...sessionForm,
      service_type: form.service_type,
      package_id: form.package_id,
      photographer_id: form.photographer_id,
      editor_id: form.editor_id,
      force_duplicate: true,
    })
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/dashboard/sessions')
    }
  }

  const inputStyle  = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle  = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

  const isOutdoor      = isOutdoorType(form.session_type)
  const isEvent        = isEventType(form.session_type)
  const isVideoSession = form.service_type === 'video' || form.service_type === 'photo_video'

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>New session</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Record a studio, outdoor, or event shoot</p>
      </div>

      {/* Session type + service type */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Session type <span style={{ color: '#e24b4a' }}>*</span></label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {config.sessionTypes.map(t => {
              const selected = form.session_type === t.value
              return (
                <button key={t.value} type="button" onClick={() => update('session_type', t.value)}
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
          <label style={labelStyle}>Service type <span style={{ color: '#e24b4a' }}>*</span></label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
            {config.serviceTypes.map(t => {
              const selected = form.service_type === t.value
              return (
                <button key={t.value} type="button" onClick={() => update('service_type', t.value)}
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

      {/* Client + date */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Client <span style={{ color: '#e24b4a' }}>*</span></label>
          <ClientField
            value={form.client_id}
            selectedName={selectedClientName}
            initialClients={clients}
            onChange={(id, name) => { update('client_id', id); setSelectedClientName(name) }}
          />
        </div>

        {isEvent && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Event name <span style={{ color: '#e24b4a' }}>*</span></label>
              <input type="text" value={form.event_name} onChange={e => update('event_name', e.target.value)}
                placeholder="e.g. Tola's 30th Birthday" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Event date <span style={{ color: '#e24b4a' }}>*</span></label>
              <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: (isOutdoor || isEvent) ? '16px' : 0 }}>
          <label style={labelStyle}>
            {isEvent ? 'Shoot date & time' : 'Session date & time'} <span style={{ color: '#e24b4a' }}>*</span>
          </label>
          <input type="datetime-local" value={form.session_date} onChange={e => update('session_date', e.target.value)} style={inputStyle} />
        </div>

        {(isOutdoor || isEvent) && (
          <div>
            <label style={labelStyle}>
              {isEvent ? 'Venue address' : 'Location address'} <span style={{ color: '#e24b4a' }}>*</span>
            </label>
            <input type="text" value={form.location_address} onChange={e => update('location_address', e.target.value)}
              placeholder={isEvent ? 'e.g. Eko Hotel, Victoria Island' : 'e.g. Lekki Conservation Centre, Lagos'}
              style={inputStyle} />
          </div>
        )}
      </div>

      {/* Pricing specs + package */}
      <div style={sectionStyle}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 14px' }}>
          {isVideoSession ? 'PROJECT DETAILS' : 'PRICING SPECS'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {!isVideoSession && !isEvent && (
            <div>
              <label style={labelStyle}>Outfits</label>
              <input type="number" min="1" value={form.outfits_count}
                onChange={e => update('outfits_count', e.target.value)}
                placeholder="e.g. 3" style={inputStyle} />
            </div>
          )}
          {!isVideoSession && (
            <div>
              <label style={labelStyle}>Edited photos</label>
              <input type="number" min="1" value={form.edited_photos}
                onChange={e => update('edited_photos', e.target.value)}
                placeholder="e.g. 40" style={inputStyle} />
            </div>
          )}
          <div>
            <label style={labelStyle}>Price (₦){isVideoSession && <span style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '400', marginLeft: '4px' }}>— leave blank if quoted per project</span>}</label>
            <input type="number" min="0" value={form.base_price}
              onChange={e => update('base_price', e.target.value)}
              placeholder={isVideoSession ? 'Starting rate or leave blank' : 'e.g. 85000'} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <input
              type="text"
              list="session-category-suggestions"
              value={form.shoot_type}
              onChange={e => update('shoot_type', e.target.value)}
              placeholder={isVideoSession ? 'e.g. Reel, Brand film, Coverage…' : 'e.g. Portrait, Wedding…'}
              style={inputStyle}
            />
            <datalist id="session-category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
        </div>

        {/* Occasion date for non-event sessions (Birthday, Anniversary, etc.) */}
        {!isEvent && form.shoot_type && (
          <div style={{ marginTop: '4px', marginBottom: '4px' }}>
            <label style={labelStyle}>
              {form.shoot_type} date{' '}
              <span style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '400' }}>— optional</span>
            </label>
            <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)} style={inputStyle} />
          </div>
        )}

        {/* Package matching */}
        {hasSpecs && (
          <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '14px' }}>
            {exactMatches.length > 0 ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Matching packages
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {exactMatches.map(pkgCard)}
                </div>
                {otherPackages.length > 0 && (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '12px 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Other packages
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {otherPackages.map(pkgCard)}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                {otherPackages.length > 0 && (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                      Packages
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                      {otherPackages.map(pkgCard)}
                    </div>
                  </>
                )}
                {/* Inline save-as-package */}
                {!form.package_id && (
                  <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 6px' }}>Save as new package?</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px' }}>
                      No saved package matches these specs. Give it a name and it will be saved automatically.
                    </p>
                    <input
                      type="text"
                      value={newPackageName}
                      onChange={e => setNewPackageName(e.target.value)}
                      placeholder="e.g. 3-outfit portrait session"
                      style={inputStyle}
                    />
                  </div>
                )}
              </>
            )}

            {form.package_id && (
              <button type="button" onClick={() => update('package_id', '')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '12px', padding: '8px 0 0', display: 'block' }}>
                ✕ No package
              </button>
            )}
          </div>
        )}

        {/* Show packages if no specs entered yet */}
        {!hasSpecs && sessionFiltered.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Saved packages
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sessionFiltered.map(pkgCard)}
            </div>
          </div>
        )}
      </div>

      {/* Team */}
      <div style={sectionStyle}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 14px' }}>{isVideoSession ? 'CREW' : 'TEAM'}</p>
        {staff.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
            No staff yet — <Link href="/dashboard/staff/new" style={{ color: 'var(--link)' }}>add team members first</Link>
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>{isVideoSession ? 'Videographer' : 'Photographer'}</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'None', sublabel: undefined },
                  ...staff.map((s) => ({
                    value: s.staff_id,
                    label: s.full_name,
                    sublabel: s.role ?? undefined,
                  }))
                ]}
                value={form.photographer_id}
                onChange={v => update('photographer_id', v)}
                placeholder="Select photographer…"
                emptyMessage="No staff match"
              />
            </div>
            <div>
              <label style={labelStyle}>{isVideoSession ? 'Video editor' : 'Editor / Retoucher'}</label>
              <SearchableSelect
                options={[
                  { value: '', label: 'None', sublabel: undefined },
                  ...staff.map((s) => ({
                    value: s.staff_id,
                    label: s.full_name,
                    sublabel: s.role ?? undefined,
                  }))
                ]}
                value={form.editor_id}
                onChange={v => update('editor_id', v)}
                placeholder="Select editor…"
                emptyMessage="No staff match"
              />
            </div>
          </div>
        )}
      </div>

      {/* Notes / Project brief */}
      <div style={sectionStyle}>
        <label style={labelStyle}>{isVideoSession ? 'Project brief / Notes' : 'Notes'}</label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder={isVideoSession
            ? 'Describe the deliverables, style references, usage rights, special requirements…'
            : 'Any special requests or details...'}
          rows={isVideoSession ? 5 : 3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {error === '__DUPLICATE__' ? (
        <div style={{ marginBottom: '14px', padding: '14px 16px', borderRadius: '10px', background: '#faeeda', border: '1px solid #e8c97a' }}>
          <p style={{ fontSize: '13px', fontWeight: '600', color: '#854f0b', margin: '0 0 6px' }}>
            ⚠️ This client already has a session on this date
          </p>
          <p style={{ fontSize: '13px', color: '#854f0b', margin: '0 0 12px' }}>
            A session for this client is already booked for the selected date.
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {dupSessionId && (
              <a href={`/dashboard/sessions/${dupSessionId}`}
                style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #c89040', color: '#854f0b', textDecoration: 'none', background: 'transparent' }}>
                View existing session →
              </a>
            )}
            <button onClick={handleForceSave} disabled={loading}
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', border: '1px solid #c89040', color: '#854f0b', background: 'transparent', cursor: 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Saving…' : 'Create anyway'}
            </button>
          </div>
        </div>
      ) : error ? (
        <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>
      ) : null}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving...' : (newPackageName.trim() && !form.package_id ? 'Create session & save package' : 'Create session')}
        </button>
        <button onClick={() => router.back()} type="button" style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
