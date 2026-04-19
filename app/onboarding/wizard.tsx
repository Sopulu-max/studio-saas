'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { completeOnboarding } from '@/app/actions/onboarding'
import type { SessionTypeConfig } from '@/lib/studio-config'
import { COLOR_PRESETS } from '@/lib/color-presets'
import { TIMEZONES } from '@/lib/timezones'

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function typeSlug(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

export default function OnboardingWizard({
  initialName,
  initialSlug,
  initialTimezone,
  initialPhone,
  initialSessionTypes,
  siteUrl,
}: {
  initialName: string
  initialSlug: string
  initialTimezone: string
  initialPhone: string
  initialSessionTypes: SessionTypeConfig[]
  siteUrl: string
}) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Step 1
  const [name, setName]         = useState(initialName)
  const [slug, setSlug]         = useState(initialSlug)
  const [timezone, setTimezone] = useState(initialTimezone || 'Africa/Lagos')
  const [phone, setPhone]       = useState(initialPhone)

  // Step 2
  const [types, setTypes]           = useState<SessionTypeConfig[]>(initialSessionTypes)
  const [addingType, setAddingType] = useState(false)
  const [newLabel, setNewLabel]     = useState('')
  const [newColor, setNewColor]     = useState(COLOR_PRESETS[3])

  function handleNameChange(v: string) {
    setName(v)
    setSlug(slugify(v))
  }

  function removeType(i: number) {
    setTypes(prev => prev.filter((_, idx) => idx !== i))
  }

  function addType() {
    const label = newLabel.trim()
    if (!label) return
    const value = typeSlug(label)
    if (types.find(t => t.value === value)) { toast.error('A type with that name already exists'); return }
    setTypes(prev => [...prev, { value, label, color_bg: newColor.bg, color_fg: newColor.fg }])
    setNewLabel('')
    setAddingType(false)
  }

  async function handleFinish() {
    setLoading(true)
    const { error } = await completeOnboarding({ name, slug, timezone, phone, sessionTypes: types })
    if (error) { toast.error(error); setLoading(false); return }
    window.location.href = '/dashboard'
  }

  const bookingUrl = `${siteUrl}/book/${slug}`

  const stepDot = (n: number) => (
    <div style={{
      width: n === step ? '28px' : '8px',
      height: '8px',
      borderRadius: '4px',
      background: n <= step ? 'var(--btn)' : 'var(--line)',
      transition: 'all 0.25s ease',
      flexShrink: 0,
    }} />
  )

  return (
    <div style={{ width: '100%', maxWidth: '520px' }}>
      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '28px' }}>
        {stepDot(1)}{stepDot(2)}{stepDot(3)}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', padding: '36px 40px' }}>

        {/* ── Step 1 ── */}
        {step === 1 && <>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>Step 1 of 3</p>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text)' }}>Set up your studio</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 28px' }}>Confirm your name and public booking URL.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Studio name</label>
              <input value={name} onChange={e => handleNameChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Booking URL</label>
              <div style={{ display: 'flex', border: '1px solid var(--line-inner)', borderRadius: '8px', overflow: 'hidden' }}>
                <span style={{ padding: '8px 10px', background: 'var(--hover)', fontSize: '12px', color: 'var(--text-3)', borderRight: '1px solid var(--line-inner)', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                  {siteUrl.replace(/^https?:\/\//, '')}/book/
                </span>
                <input
                  value={slug}
                  onChange={e => setSlug(slugify(e.target.value))}
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '8px 10px', background: 'transparent', fontSize: '13px', minWidth: 0 }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ width: '100%' }}>
                {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', display: 'block', marginBottom: '6px' }}>
                Phone <span style={{ fontWeight: '400', color: 'var(--text-4)' }}>(optional)</span>
              </label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 555 000 0000" style={{ width: '100%', boxSizing: 'border-box' as const }} />
            </div>
          </div>

          <div style={{ marginTop: '28px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStep(2)} disabled={!name.trim() || !slug.trim()} style={{ padding: '10px 24px', fontSize: '14px' }}>
              Continue →
            </button>
          </div>
        </>}

        {/* ── Step 2 ── */}
        {step === 2 && <>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>Step 2 of 3</p>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text)' }}>Session types</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 22px' }}>Remove any you don't offer. You can always change these later.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
            {types.map((t, i) => (
              <div key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'var(--hover)', borderRadius: '8px' }}>
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: t.color_bg, border: `3px solid ${t.color_fg}`, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '13px', fontWeight: '500' }}>{t.label}</span>
                <button type="button" onClick={() => removeType(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e24b4a', fontSize: '17px', lineHeight: 1, padding: '2px 4px' }}>×</button>
              </div>
            ))}
          </div>

          {addingType ? (
            <div style={{ background: 'var(--hover)', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', alignItems: 'flex-end', marginBottom: '10px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Label</label>
                  <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addType() }}
                    placeholder="e.g. Boudoir, Wedding…" autoFocus
                    style={{ width: '100%', boxSizing: 'border-box' as const }} />
                </div>
                <button onClick={addType} type="button"
                  style={{ padding: '7px 14px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                  Add
                </button>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                {COLOR_PRESETS.map((p, pi) => (
                  <button key={pi} type="button" onClick={() => setNewColor(p)}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: p.bg, border: newColor === p ? `3px solid ${p.fg}` : '2px solid transparent' }} />
                ))}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setAddingType(true)}
              style={{ width: '100%', padding: '8px', fontSize: '13px', background: 'none', border: '1px dashed var(--line)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-3)', marginBottom: '10px' }}>
              + Add session type
            </button>
          )}

          <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => setStep(1)}
              style={{ padding: '10px 20px', fontSize: '14px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-3)' }}>
              ← Back
            </button>
            <button onClick={() => setStep(3)} disabled={types.length === 0} style={{ padding: '10px 24px', fontSize: '14px' }}>
              Continue →
            </button>
          </div>
        </>}

        {/* ── Step 3 ── */}
        {step === 3 && <>
          <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 8px' }}>Step 3 of 3</p>
          <h1 style={{ fontSize: '22px', fontWeight: '600', margin: '0 0 6px', color: 'var(--text)' }}>You're all set! 🎉</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: '0 0 28px' }}>Share your booking link with clients to start receiving requests.</p>

          <div style={{ background: 'var(--hover)', borderRadius: '10px', padding: '16px 20px', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 6px' }}>Your booking URL</p>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, wordBreak: 'break-all' as const, color: 'var(--text)' }}>{bookingUrl}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '28px' }}>
            {[
              'Clients submit requests through your booking page',
              'You review and confirm sessions in the dashboard',
              'Send contracts, invoices, and updates from one place',
            ].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text-3)' }}>
                <span style={{ color: 'var(--btn)', fontWeight: '700', marginTop: '1px', flexShrink: 0 }}>✓</span>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" onClick={() => setStep(2)}
              style={{ padding: '10px 20px', fontSize: '14px', background: 'transparent', border: '1px solid var(--line)', color: 'var(--text-3)' }}>
              ← Back
            </button>
            <button onClick={handleFinish} disabled={loading} style={{ padding: '10px 28px', fontSize: '14px' }}>
              {loading ? 'Setting up…' : 'Go to dashboard →'}
            </button>
          </div>
        </>}

      </div>
    </div>
  )
}
