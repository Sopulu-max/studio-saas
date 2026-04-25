'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateSession } from '@/app/actions/sessions'
import SearchableSelect from '@/components/searchable-select'
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

type SessionRecord = {
  client_id?: string | null
  session_type?: string | null
  service_type?: string | null
  session_date?: string | null
  package_id?: string | null
  outfits_count?: number | null
  location_address?: string | null
  event_name?: string | null
  event_date?: string | null
  notes?: string | null
}

function isEventType(t: string)   { return t === 'event' }
function isOutdoorType(t: string) { return t === 'outdoor' }

// Format a DB datetime string to datetime-local input value
function toDatetimeLocal(val: string | null | undefined): string {
  if (!val) return ''
  // '2025-08-10T14:00:00+01:00' → '2025-08-10T14:00'
  return val.slice(0, 16)
}

export default function EditSessionForm({
  sessionId,
  session,
  clients,
  packages,
  staff,
  photographerId,
  editorId,
}: {
  sessionId: string
  session: SessionRecord
  clients: Client[]
  packages: SessionPackage[]
  staff: StaffMember[]
  photographerId: string
  editorId: string
}) {
  const router = useRouter()
  const config = useStudioConfig()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    client_id:        session.client_id        ?? '',
    session_type:     session.session_type     ?? config.sessionTypes[0]?.value ?? 'studio',
    service_type:     session.service_type     ?? config.serviceTypes[0]?.value ?? 'photo',
    session_date:     toDatetimeLocal(session.session_date),
    package_id:       session.package_id       ?? '',
    outfits_count:    session.outfits_count    != null ? String(session.outfits_count) : '',
    location_address: session.location_address ?? '',
    event_name:       session.event_name       ?? '',
    event_date:       session.event_date        ?? '',
    notes:            session.notes            ?? '',
    photographer_id:  photographerId,
    editor_id:        editorId,
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  // Package matching
  const outfitsNum = form.outfits_count ? parseInt(form.outfits_count) : null
  const sessionFiltered = packages.filter((p) =>
    !p.session_type || p.session_type === form.session_type
  )
  const exactMatches = outfitsNum != null
    ? sessionFiltered.filter((p) => p.outfits_count === outfitsNum)
    : []
  const otherPackages = outfitsNum != null
    ? sessionFiltered.filter((p) => p.outfits_count !== outfitsNum)
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
    const { error } = await updateSession(sessionId, form)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/sessions/${sessionId}`)
      router.refresh()
    }
  }

  const inputStyle   = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle   = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

  const isOutdoor      = isOutdoorType(form.session_type)
  const isEvent        = isEventType(form.session_type)
  const isVideoSession = form.service_type === 'video' || form.service_type === 'photo_video'

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit session</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Update session details</p>
      </div>

      {/* Session type + service type */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Session type</label>
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
          <label style={labelStyle}>Service type</label>
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
          <label style={labelStyle}>Client</label>
          <SearchableSelect
            options={clients.map((c) => ({
              value: c.client_id,
              label: c.full_name,
              sublabel: c.phone ?? undefined,
            }))}
            value={form.client_id}
            onChange={v => update('client_id', v)}
            placeholder="Search by name or phone…"
            emptyMessage="No clients match"
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
              <label style={labelStyle}>Event date</label>
              <input type="date" value={form.event_date} onChange={e => update('event_date', e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: (isOutdoor || isEvent) ? '16px' : 0 }}>
          <label style={labelStyle}>
            {isEvent ? 'Shoot date & time' : 'Session date & time'} <span style={{ color: '#e24b4a' }}>*</span>
          </label>
          <input type="datetime-local" value={form.session_date}
            onChange={e => update('session_date', e.target.value)} style={inputStyle} />
        </div>

        {(isOutdoor || isEvent) && (
          <div>
            <label style={labelStyle}>{isEvent ? 'Venue address' : 'Location address'}</label>
            <input type="text" value={form.location_address}
              onChange={e => update('location_address', e.target.value)}
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

        {!isVideoSession && !isEvent && (
          <div style={{ marginBottom: sessionFiltered.length > 0 ? '16px' : 0 }}>
            <label style={labelStyle}>Outfits</label>
            <input type="number" min="1" value={form.outfits_count}
              onChange={e => update('outfits_count', e.target.value)}
              placeholder="e.g. 3" style={inputStyle} />
          </div>
        )}

        {/* Package picker */}
        {sessionFiltered.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '14px' }}>
            {outfitsNum != null && exactMatches.length > 0 ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Matching packages
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: otherPackages.length > 0 ? '12px' : 0 }}>
                  {exactMatches.map(pkgCard)}
                </div>
                {otherPackages.length > 0 && (
                  <>
                    <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
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
                <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                  Packages
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {sessionFiltered.map(pkgCard)}
                </div>
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
                  ...staff.map((s) => ({ value: s.staff_id, label: s.full_name, sublabel: s.role ?? undefined }))
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
                  ...staff.map((s) => ({ value: s.staff_id, label: s.full_name, sublabel: s.role ?? undefined }))
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

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/dashboard/sessions/${sessionId}`)}
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
