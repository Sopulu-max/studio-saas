'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toggleServiceActive, deleteService } from '@/app/actions/services'

export default function ServiceActions({
  serviceId,
  isActive,
}: {
  serviceId: string
  isActive: boolean
}) {
  const router = useRouter()
  const [toggling,  setToggling]  = useState(false)
  const [deleting,  setDeleting]  = useState(false)
  const [confirm,   setConfirm]   = useState(false)
  const [error,     setError]     = useState('')

  async function handleToggle() {
    setToggling(true)
    setError('')
    const { error: err } = await toggleServiceActive(serviceId, !isActive)
    if (err) { setError(err); setToggling(false) }
    else router.refresh()
  }

  async function handleDelete() {
    setDeleting(true)
    setError('')
    const { error: err } = await deleteService(serviceId)
    if (err) { setError(err); setDeleting(false); setConfirm(false) }
    else router.push('/dashboard/services')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {/* Toggle active */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
            border: '1px solid var(--line)', background: 'var(--surface)',
            color: 'var(--text-2)', cursor: 'pointer',
          }}
        >
          {toggling ? '...' : isActive ? 'Set inactive' : 'Set active'}
        </button>

        {/* Delete */}
        {!confirm ? (
          <button
            type="button"
            onClick={() => setConfirm(true)}
            style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
              border: '1px solid #fca5a5', background: 'transparent',
              color: '#e24b4a', cursor: 'pointer',
            }}
          >
            Delete service
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>Are you sure?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                border: 'none', background: '#e24b4a', color: 'white', cursor: 'pointer',
              }}
            >
              {deleting ? 'Deleting...' : 'Yes, delete'}
            </button>
            <button
              type="button"
              onClick={() => setConfirm(false)}
              style={{
                padding: '6px 14px', borderRadius: '8px', fontSize: '13px',
                border: '1px solid var(--line)', background: 'var(--surface)',
                color: 'var(--text-2)', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '13px', color: '#e24b4a', margin: '10px 0 0' }}>{error}</p>
      )}
    </div>
  )
}
