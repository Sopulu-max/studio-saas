'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { updateStudioTheme } from '@/app/actions/studio'
import { buildTheme, THEME_PRESETS, PRESET_ORDER, PRESET_LABELS } from '@/lib/studio-theme'
import type { StudioTheme, ThemePreset } from '@/lib/studio-theme'

export default function ThemeForm({ initial }: { initial: unknown }) {
  const [theme, setTheme] = useState<StudioTheme>(() => buildTheme(initial))
  const [loading, setLoading] = useState(false)

  const labelStyle: React.CSSProperties = {
    fontSize: '13px', color: 'var(--text-2)',
    display: 'block', marginBottom: '6px',
  }
  const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box' }

  async function handleSave() {
    setLoading(true)
    const res = await updateStudioTheme(theme)
    setLoading(false)
    if (res.error) toast.error(res.error)
    else toast.success('Theme saved')
  }

  function applyPreset(preset: ThemePreset) {
    setTheme(buildTheme({ preset }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Preset picker */}
      <div>
        <p style={{ ...labelStyle, marginBottom: '10px' }}>Preset</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
          {PRESET_ORDER.map(p => {
            const pr = THEME_PRESETS[p]
            const isActive = theme.preset === p
            return (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px',
                  border: isActive ? `2px solid ${pr.primary}` : '2px solid var(--line)',
                  borderRadius: '10px', cursor: 'pointer',
                  background: isActive ? `color-mix(in srgb, ${pr.primary} 8%, var(--bg))` : 'var(--bg)',
                  transition: 'border-color .15s, background .15s',
                  textAlign: 'left',
                }}
              >
                {/* Swatch circle */}
                <span style={{
                  width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                  background: `linear-gradient(135deg, ${pr.primary} 50%, ${pr.bg} 50%)`,
                  border: '1px solid rgba(0,0,0,.08)',
                }} />
                <span>
                  <span style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-1)' }}>
                    {PRESET_LABELS[p]}
                  </span>
                  <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
                    {pr.serif ? 'Serif headings' : 'Sans-serif'}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Colour overrides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Accent colour</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={theme.primary}
              onChange={e => setTheme(t => ({ ...t, primary: e.target.value }))}
              style={{ width: '42px', height: '36px', padding: '2px 4px', cursor: 'pointer', flexShrink: 0 }}
            />
            <input
              type="text"
              value={theme.primary}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setTheme(t => ({ ...t, primary: v }))
              }}
              maxLength={7}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', letterSpacing: '.04em' }}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Background colour</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="color"
              value={theme.bg}
              onChange={e => setTheme(t => ({ ...t, bg: e.target.value }))}
              style={{ width: '42px', height: '36px', padding: '2px 4px', cursor: 'pointer', flexShrink: 0 }}
            />
            <input
              type="text"
              value={theme.bg}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setTheme(t => ({ ...t, bg: v }))
              }}
              maxLength={7}
              style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', letterSpacing: '.04em' }}
            />
          </div>
        </div>
      </div>

      {/* Typography + radius */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Heading font</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[false, true].map(serif => (
              <button
                key={String(serif)}
                type="button"
                onClick={() => setTheme(t => ({ ...t, serif }))}
                style={{
                  flex: 1, padding: '8px',
                  border: theme.serif === serif ? '2px solid var(--primary, #2563eb)' : '2px solid var(--line)',
                  borderRadius: '8px', cursor: 'pointer',
                  background: theme.serif === serif ? 'var(--surface)' : 'transparent',
                  fontSize: serif ? '15px' : '13px',
                  fontFamily: serif ? 'Georgia, serif' : 'system-ui, sans-serif',
                  color: 'var(--text-1)',
                }}
              >
                {serif ? 'Serif' : 'Sans'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label style={labelStyle}>Corner radius — {theme.radius}px</label>
          <input
            type="range"
            min={0} max={32} step={2}
            value={theme.radius}
            onChange={e => setTheme(t => ({ ...t, radius: Number(e.target.value) }))}
            style={{ width: '100%', marginTop: '8px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>
            <span>Square</span><span>Rounded</span>
          </div>
        </div>
      </div>

      {/* Live preview strip */}
      <div style={{
        borderRadius: `${theme.radius}px`,
        background: theme.bg,
        border: '1px solid rgba(0,0,0,.1)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <p style={{
            fontFamily: theme.serif ? 'Georgia, serif' : 'system-ui, sans-serif',
            fontSize: '18px', fontWeight: '400', margin: '0 0 4px',
            color: theme.bg < '#888888' ? '#f0ece6' : '#1a1a1a',
          }}>
            Your Studio Name
          </p>
          <p style={{ fontSize: '12px', color: theme.primary, margin: 0, letterSpacing: '.08em', textTransform: 'uppercase' }}>
            Preview
          </p>
        </div>
        <div style={{
          padding: '9px 18px',
          borderRadius: `${Math.max(4, Math.round(theme.radius * 0.6))}px`,
          background: theme.primary,
          color: '#fff',
          fontSize: '13px', fontWeight: '600',
          cursor: 'default',
        }}>
          Book now
        </div>
      </div>

      <div>
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '9px 20px', fontSize: '13px', fontWeight: '600',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            background: 'var(--btn)', color: 'var(--btn-fg)',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Saving…' : 'Save theme'}
        </button>
      </div>
    </div>
  )
}
