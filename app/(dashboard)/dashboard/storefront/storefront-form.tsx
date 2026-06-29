'use client'

import { useState } from 'react'
import { StudioRow } from '@/lib/studio'
import { updateStorefrontSettings } from '@/app/actions/storefront'
import StorefrontView from '@/components/storefront-view'
import { THEME_PRESETS, PRESET_ORDER, PRESET_LABELS, type ThemePreset, buildTheme, getThemeStyles } from '@/lib/studio-theme'

import type { PublicStorefrontDTO } from '@/lib/domains/public/types'

type Props = {
  studio: StudioRow
  staff: any[]
}

export default function StorefrontForm({ studio, staff }: Props) {
  const [bio, setBio] = useState(studio.bio || '')
  
  // Use existing theme preset or default to 'luxury'
  const initialPreset = (typeof studio.theme === 'object' && studio.theme !== null && 'preset' in studio.theme) 
    ? (studio.theme as any).preset as ThemePreset 
    : 'luxury'
  
  const [themePreset, setThemePreset] = useState<ThemePreset>(initialPreset)

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    const fd = new FormData()
    fd.append('bio', bio)
    fd.append('theme', JSON.stringify({ preset: themePreset }))

    const res = await updateStorefrontSettings(fd)
    if (res?.error) setMessage(res.error)
    else setMessage('Saved successfully')

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', alignItems: 'center' }}>
      {/* Top: Form */}
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <form onSubmit={handleSave} className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>Edit Website</h2>
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px' }}>Studio Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell your clients a little about your studio..."
              rows={6}
              style={{
                width: '100%', padding: '12px', fontSize: '14px', borderRadius: '8px',
                border: '1px solid var(--line-inner)', background: 'var(--bg)',
                color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit'
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-4)' }}>
              This will be displayed prominently on your public website.
            </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '12px' }}>Color Theme</label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {PRESET_ORDER.map((presetId) => {
                const preset = THEME_PRESETS[presetId]
                const isSelected = presetId === themePreset
                return (
                  <button
                    key={presetId}
                    type="button"
                    onClick={() => setThemePreset(presetId)}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: preset.bg,
                      border: isSelected ? `2px solid var(--text)` : '2px solid transparent',
                      boxShadow: isSelected ? '0 0 0 2px var(--bg)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s',
                    }}
                    title={PRESET_LABELS[presetId]}
                  >
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: preset.primary }} />
                  </button>
                )
              })}
            </div>
            <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-4)' }}>
              Select a color palette for your storefront.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 16px', background: 'var(--btn)', color: 'var(--btn-fg)',
                border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {message && (
              <span style={{ fontSize: '13px', color: message === 'Saved successfully' ? 'var(--text-3)' : '#c0392b' }}>
                {message}
              </span>
            )}
          </div>
        </form>

        <div className="glass-panel" style={{ marginTop: '24px', padding: '16px' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Want to update your address, phone, or logo?</p>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-3)' }}>
            These are pulled directly from your main studio settings to ensure everything stays in sync.
          </p>
          <a href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--btn)', textDecoration: 'none', fontWeight: '500' }}>
            Go to Settings →
          </a>
        </div>
      </div>

      {/* Bottom: Live Preview */}
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, fontWeight: '600' }}>Live Preview</p>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>
        
        {/* We add a border wrapper so it looks like a "page" within the dashboard */}
        <div style={{ 
          borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--line)', boxShadow: '0 12px 48px rgba(0,0,0,0.05)',
          ...getThemeStyles(buildTheme({ preset: themePreset }))
        }}>
          <StorefrontView 
            storefront={{
              studio_id: studio.studio_id,
              slug: studio.slug || 'preview',
              name: studio.name || 'Studio',
              bio: bio || null,
              logo_url: studio.logo_url,
              cover_url: null,
              address: studio.address,
              email: studio.email,
              phone: studio.phone,
              theme: { preset: themePreset },
              packages: [], // Mock packages for preview
              team: staff.filter(s => s.is_public).map(s => ({
                staff_id: s.staff_id,
                name: s.full_name,
                role: s.role,
                bio: s.bio,
                avatar_url: s.avatar_url || s.users?.avatar_url || null,
              }))
            }} 
          />
        </div>
      </div>
    </div>
  )
}
