'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { updateStudio, updateStudioLogo } from '@/app/actions/studio'

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Nairobi',
  'Africa/Accra',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'Asia/Dubai',
  'Asia/London',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
]

export default function SettingsForm({
  studioId,
  name,
  email,
  slug,
  phone,
  address,
  timezone,
  logoUrl,
  siteUrl,
}: {
  studioId: string
  name: string
  email: string
  slug: string
  phone: string
  address: string
  timezone: string
  logoUrl: string | null
  siteUrl: string
}) {
  const [form, setForm] = useState({ name, email, slug, phone, address, timezone })
  const [loading, setLoading]     = useState(false)
  const [logo, setLogo]           = useState<string | null>(logoUrl)
  const [logoLoading, setLogoLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block' as const, marginBottom: '6px' }

  function slugify(value: string) {
    return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSave() {
    setLoading(true)
    const { error } = await updateStudio(form)
    if (error) toast.error(error)
    else toast.success('Settings saved')
    setLoading(false)
  }

  async function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size is 5 MB'); return }

    setLogoLoading(true)

    const path = `studio/${studioId}`
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      toast.error(uploadError.message)
      setLogoLoading(false)
      return
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`

    const result = await updateStudioLogo(data.publicUrl)
    if (result.error) {
      toast.error(result.error)
    } else {
      setLogo(publicUrl)
      toast.success('Logo updated')
    }

    setLogoLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const bookingUrl = `${siteUrl}/book/${form.slug}`
  const slugValid  = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug) && form.slug.length >= 3

  return (
    <div style={{ maxWidth: '500px' }}>

      {/* Logo */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>STUDIO LOGO</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            onClick={() => !logoLoading && fileInputRef.current?.click()}
            style={{
              width: 72, height: 72, borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
              border: '1px solid var(--line)', cursor: 'pointer', background: 'var(--surface-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            }}
          >
            {logo ? (
              <img src={logo} alt="Studio logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
            {logoLoading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={logoLoading}
              style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-2)', cursor: 'pointer' }}
            >
              {logoLoading ? 'Uploading…' : logo ? 'Change logo' : 'Upload logo'}
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '6px 0 0' }}>JPG, PNG or WebP — max 5 MB</p>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleLogoFile} style={{ display: 'none' }} />
      </div>

      {/* Studio info */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>STUDIO INFO</p>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Studio name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Contact email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Phone number</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+234 800 000 0000"
            style={inputStyle}
          />
        </div>

        <div>
          <label style={labelStyle}>Studio address</label>
          <textarea
            value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
            placeholder="12 Victoria Island, Lagos, Nigeria"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit', fontSize: '14px' }}
          />
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>
            Used on invoice headers and contract footers.
          </p>
        </div>
      </div>

      {/* Booking link / slug */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 4px' }}>BOOKING PAGE</p>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 16px' }}>
          Your public URL — share this with clients so they can request sessions.
        </p>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>URL slug</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-4)', whiteSpace: 'nowrap' as const }}>
              {siteUrl}/book/
            </span>
            <input
              value={form.slug}
              onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
              placeholder="your-studio-name"
              style={{ flex: 1, boxSizing: 'border-box' as const }}
            />
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '6px 0 0' }}>
            Lowercase letters, numbers, and hyphens only. No spaces.
          </p>
        </div>

        {form.slug && slugValid && (
          <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <code style={{ fontSize: '13px', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              {bookingUrl}
            </code>
            <a
              href={`/book/${form.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none', whiteSpace: 'nowrap' as const }}
            >
              Preview ↗
            </a>
          </div>
        )}
      </div>

      {/* Timezone */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '16px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>TIMEZONE</p>
        <div>
          <label style={labelStyle}>Studio timezone</label>
          <select value={form.timezone} onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))} style={inputStyle}>
            <option value="">Select timezone…</option>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
            ))}
          </select>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '6px 0 0' }}>
            Used for session scheduling and calendar display.
          </p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={loading || !slugValid}
        style={{
          padding: '9px 24px', fontSize: '14px', borderRadius: '8px',
          background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', cursor: 'pointer', fontWeight: '500',
        }}
      >
        {loading ? 'Saving…' : 'Save changes'}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
