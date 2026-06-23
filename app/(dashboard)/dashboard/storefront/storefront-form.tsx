'use client'

import { useState } from 'react'
import { StudioRow } from '@/lib/studio'
import { updateStudioBio } from '@/app/actions/storefront'
import StorefrontView from '@/components/storefront-view'

type Props = {
  studio: StudioRow
  staff: any[]
}

export default function StorefrontForm({ studio, staff }: Props) {
  const [bio, setBio] = useState(studio.bio || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    
    const fd = new FormData()
    fd.append('bio', bio)

    const res = await updateStudioBio(fd)
    if (res?.error) setMessage(res.error)
    else setMessage('Saved successfully')

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'start' }}>
      {/* Left side: Form */}
      <div>
        <form onSubmit={handleSave} style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--line)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 16px' }}>Edit Storefront</h2>
          
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
              This will be displayed prominently on your public storefront.
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

        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px dashed var(--line)' }}>
          <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: '600' }}>Want to update your address, phone, or logo?</p>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-3)' }}>
            These are pulled directly from your main studio settings to ensure everything stays in sync.
          </p>
          <a href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--btn)', textDecoration: 'none', fontWeight: '500' }}>
            Go to Settings →
          </a>
        </div>
      </div>

      {/* Right side: Live Preview */}
      <div style={{ position: 'sticky', top: '24px' }}>
        <p style={{ fontSize: '11px', color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px 12px', fontWeight: '600' }}>Live Preview</p>
        <StorefrontView 
          studio={{ ...studio, bio }} 
          staff={staff} 
          showTeam={true} 
        />
      </div>
      
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
