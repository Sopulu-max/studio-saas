'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { updateSession } from '@/app/actions/sessions'
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

type SessionRecord = {
  client_id?: string | null
  session_type?: string | null
  service_type?: string | null
  shoot_type?: string | null
  session_date?: string | null
  package_id?: string | null
  outfits_count?: number | null
  edited_photos?: number | null
  location_address?: string | null
  event_name?: string | null
  event_date?: string | null
  notes?: string | null
  custom_answers?: Record<string, any> | null
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
  videographerId,
  videoEditorId,
}: {
  sessionId: string
  session: SessionRecord
  clients: Client[]
  packages: SessionPackage[]
  staff: StaffMember[]
  photographerId: string
  editorId: string
  videographerId?: string
  videoEditorId?: string
  services: any[]
}) {
  const router = useRouter()
  const config = useStudioConfig()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedClientName, setSelectedClientName] = useState(
    () => clients.find(c => c.client_id === (session.client_id ?? ''))?.full_name ?? ''
  )

  const [form, setForm] = useState({
    client_id:          session.client_id          ?? '',
    session_type:       session.session_type       ?? config.sessionTypes[0]?.value ?? 'studio',
    shoot_type:         session.shoot_type         ?? '',
    session_date:       toDatetimeLocal(session.session_date),
    package_id:         session.package_id         ?? '',
    location_address:   session.location_address   ?? '',
    event_name:         session.event_name         ?? '',
    event_date:         session.event_date          ?? '',
    notes:              session.notes              ?? '',
    photographer_id:    photographerId ?? '',
    editor_id:          editorId ?? '',
    videographer_id:    videographerId ?? '',
    video_editor_id:    videoEditorId  ?? '',
  })
  const [customAnswers, setCustomAnswers] = useState<Record<string, any>>(session.custom_answers || {})

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateCustomAnswer(fieldId: string, value: any) {
    setCustomAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const selectedServiceIds: string[] = [] // Placeholder for logic referenced in instructions

  const requiredStaff = useMemo(() => {
    // If no package is selected, we assume it's a custom session and give full freedom.
    if (!form.package_id) return { needsPhotoTeam: true, needsVideoTeam: true }

    const pkg = packages.find(p => p.package_id === form.package_id)
    if (!pkg) return { needsPhotoTeam: true, needsVideoTeam: true }

    // Collect all active service types
    const activeServiceTypes = new Set<string>()

    // Get the base package services + add-ons
    const pkgServices = (pkg as any).package_services || []
    for (const ps of pkgServices) {
      if (!ps.is_addon || selectedServiceIds.includes(ps.services?.service_id)) {
        if (ps.services?.type) activeServiceTypes.add(ps.services.type)
      }
    }

    let needsPhotoTeam = false
    let needsVideoTeam = false

    // Introspect using StudioConfig
    for (const typeVal of activeServiceTypes) {
      const svcDef = config.serviceTypes.find(t => t.value === typeVal)
      // Photographers typically handle 'photo' or 'photo_video'
      if (typeVal === 'photo' || typeVal === 'photo_video') needsPhotoTeam = true
      // Videographers are needed if the config flag is set
      if (svcDef?.has_video_crew) needsVideoTeam = true
    }

    return { needsPhotoTeam, needsVideoTeam }
  }, [form.package_id, selectedServiceIds, packages, config])

  // Package matching
  const sessionFiltered = packages.filter((p) => {
    const matchSession = !p.session_type || p.session_type === form.session_type
    if (!matchSession) return false
    
    if (form.shoot_type) {
      const search = form.shoot_type.toLowerCase()
      const matchName = p.name.toLowerCase().includes(search)
      const matchShoot = (p as any).shoot_type?.toLowerCase().includes(search)
      return matchName || matchShoot
    }
    return true
  })

  function pkgCard(p: SessionPackage) {
    const selected = form.package_id === p.package_id
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
        </div>
        <div style={{ fontSize: '13px', fontWeight: '600', flexShrink: 0, marginLeft: '12px' }}>
          ₦{Number(p.base_price).toLocaleString()}
        </div>
      </button>
    )
  }

  const customFields = useMemo(() => {
    if (!form.package_id) return []
    const pkg = packages.find(p => p.package_id === form.package_id) as any
    if (!pkg || !pkg.package_services) return []
    const fields: { id: string; label: string; type: string; required: boolean }[] = []
    const seenIds = new Set<string>()
    for (const ps of pkg.package_services) {
      if (ps.services?.booking_fields && Array.isArray(ps.services.booking_fields)) {
        for (const field of ps.services.booking_fields) {
          if (!seenIds.has(field.id)) {
            seenIds.add(field.id)
            fields.push(field)
          }
        }
      }
    }
    return fields
  }, [form.package_id, packages])

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
    const { error } = await updateSession(sessionId, {
      client_id:       form.client_id,
      session_type:    form.session_type,
      shoot_type:      form.shoot_type,
      session_date:    form.session_date,
      package_id:      form.package_id,
      location_address: form.location_address,
      event_name:      form.event_name,
      event_date:      form.event_date,
      notes:           form.notes,
      photographer_id: form.photographer_id,
      editor_id:       form.editor_id,
      videographer_id: form.videographer_id,
      video_editor_id: form.video_editor_id,
      custom_answers:  customAnswers,
    })
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/sessions/${sessionId}`)
    }
  }

  const inputStyle   = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle   = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const sectionStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }

  const isOutdoor      = isOutdoorType(form.session_type)
  const isEvent        = isEventType(form.session_type)

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit session</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Update session details</p>
      </div>

      {/* Session type */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: 0 }}>
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
      </div>

      {/* Client + date */}
      <div style={sectionStyle}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Client</label>
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
          PRICING SPECS
        </p>

        {/* Category (shoot_type) */}
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Category</label>
          <input
            type="text"
            list="edit-session-category-suggestions"
            value={form.shoot_type}
            onChange={e => update('shoot_type', e.target.value)}
            placeholder={'e.g. Portrait, Wedding, Birthday…'}
            style={inputStyle}
          />
          <datalist id="edit-session-category-suggestions">
            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>

        {/* Package picker */}
        {sessionFiltered.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-3)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Packages
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
              {sessionFiltered.map(pkgCard)}
            </div>
            {form.package_id && (
              <button type="button" onClick={() => update('package_id', '')}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '12px', padding: '8px 0 0', display: 'block' }}>
                ✕ No package
              </button>
            )}
          </div>
        )}

        {/* Dynamic Custom Fields from the selected package */}
        {customFields.length > 0 && (
          <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 14px' }}>
              CUSTOM SERVICE QUESTIONS
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {customFields.map((field, idx) => (
                <div key={idx}>
                  <label style={labelStyle}>
                    {field.label} {field.required && <span style={{ color: 'var(--primary)' }}>*</span>}
                  </label>
                  {field.type === 'boolean' ? (
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="radio"
                          name={`cf_${field.id}`}
                          checked={customAnswers[field.id] === 'Yes'}
                          onChange={() => updateCustomAnswer(field.id, 'Yes')}
                        /> Yes
                      </label>
                      <label style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="radio"
                          name={`cf_${field.id}`}
                          checked={customAnswers[field.id] === 'No'}
                          onChange={() => updateCustomAnswer(field.id, 'No')}
                        /> No
                      </label>
                    </div>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={customAnswers[field.id] || ''}
                      onChange={e => updateCustomAnswer(field.id, e.target.value)}
                      style={inputStyle}
                      placeholder={field.type === 'number' ? 'e.g. 2' : 'Your answer...'}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {/* Team */}
      {(requiredStaff.needsPhotoTeam || requiredStaff.needsVideoTeam) && (
        <div style={sectionStyle}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 14px' }}>TEAM / CREW</p>
          {staff.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>
              No staff yet — <Link href="/dashboard/staff/new" style={{ color: 'var(--link)' }}>add team members first</Link>
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {requiredStaff.needsPhotoTeam && (
                <>
                  <div>
                    <label style={labelStyle}>Photographer</label>
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
                    <label style={labelStyle}>Editor / Retoucher</label>
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
                </>
              )}
              {requiredStaff.needsVideoTeam && (
                <>
                  <div>
                    <label style={labelStyle}>Videographer</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'None', sublabel: undefined },
                        ...staff.map((s) => ({
                          value: s.staff_id,
                          label: s.full_name,
                          sublabel: s.role ?? undefined,
                        }))
                      ]}
                      value={form.videographer_id}
                      onChange={v => update('videographer_id', v)}
                      placeholder="Select videographer…"
                      emptyMessage="No staff match"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Video Editor</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'None', sublabel: undefined },
                        ...staff.map((s) => ({
                          value: s.staff_id,
                          label: s.full_name,
                          sublabel: s.role ?? undefined,
                        }))
                      ]}
                      value={form.video_editor_id}
                      onChange={v => update('video_editor_id', v)}
                      placeholder="Select video editor…"
                      emptyMessage="No staff match"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Notes / Project brief */}
      <div style={sectionStyle}>
        <label style={labelStyle}>Notes</label>
        <textarea
          value={form.notes}
          onChange={e => update('notes', e.target.value)}
          placeholder={'Any special requests or details...'}
          rows={3}
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
