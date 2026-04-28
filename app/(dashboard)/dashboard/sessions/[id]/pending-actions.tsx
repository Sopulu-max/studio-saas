'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateSessionStatus } from '@/app/actions/sessions'

export default function PendingActions({
  sessionId,
  confirmStatus,
  cancelStatus,
}: {
  sessionId:     string
  confirmStatus: string
  cancelStatus:  string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<'confirm' | 'decline' | null>(null)
  const [showDecline, setShowDecline] = useState(false)

  async function handle(next: string) {
    setLoading(next === confirmStatus ? 'confirm' : 'decline')
    const { error } = await updateSessionStatus(sessionId, next)
    if (error) {
      toast.error(error)
      setLoading(null)
      return
    }
    toast.success(next === 'confirmed' ? 'Session confirmed' : 'Booking declined')
    router.refresh()
  }

  return (
    <div style={{
      background: '#fdf6e9',
      border: '1px solid #e5c98a',
      borderRadius: '12px',
      padding: '1.25rem 1.5rem',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
    }}>
      <div>
        <p style={{ fontSize: '14px', fontWeight: '600', color: '#854f0b', margin: '0 0 2px' }}>
          Pending booking request
        </p>
        <p style={{ fontSize: '13px', color: '#a06826', margin: 0 }}>
          Confirm to add this to your schedule, or decline to close the request.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        {!showDecline ? (
          <>
            <button
              onClick={() => setShowDecline(true)}
              disabled={!!loading}
              style={{
                padding: '8px 16px', fontSize: '13px', borderRadius: '8px',
                background: 'transparent', color: '#a32d2d',
                border: '1px solid #f09595', cursor: 'pointer',
                opacity: loading ? 0.5 : 1,
              }}
            >
              Decline
            </button>
            <button
              onClick={() => handle(confirmStatus)}
              disabled={!!loading}
              style={{
                padding: '8px 18px', fontSize: '13px', borderRadius: '8px',
                background: '#2a6b3c', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: '500',
                opacity: loading === 'confirm' ? 0.6 : 1,
              }}
            >
              {loading === 'confirm' ? 'Confirming…' : '✓ Confirm booking'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '13px', color: '#854f0b', margin: 'auto 0' }}>Decline this booking?</p>
            <button
              onClick={() => setShowDecline(false)}
              style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '8px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={() => handle(cancelStatus)}
              disabled={!!loading}
              style={{
                padding: '8px 16px', fontSize: '13px', borderRadius: '8px',
                background: '#a32d2d', color: '#fff',
                border: 'none', cursor: 'pointer', fontWeight: '500',
                opacity: loading === 'decline' ? 0.6 : 1,
              }}
            >
              {loading === 'decline' ? 'Declining…' : 'Yes, decline'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
