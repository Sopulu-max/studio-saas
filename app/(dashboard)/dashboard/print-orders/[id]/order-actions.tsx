'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updatePrintOrderStatus } from '@/app/actions/print-orders'

const TRANSITIONS: Record<string, { label: string; next: string; primary: boolean }[]> = {
  pending:   [{ label: 'Send to printing', next: 'printing',  primary: true  }],
  printing:  [{ label: 'Mark as ready',    next: 'ready',     primary: true  }],
  ready:     [{ label: 'Mark collected',   next: 'collected', primary: true  }],
  collected: [],
  cancelled: [],
}

const CANCEL_ALLOWED = ['pending', 'printing']

export default function OrderActions({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const transitions = TRANSITIONS[currentStatus] ?? []

  async function handleStatus(next: string) {
    setLoading(true)
    const { error } = await updatePrintOrderStatus(orderId, next)
    if (error) toast.error(error)
    else toast.success('Order updated')
    router.refresh()
    setLoading(false)
  }

  if (currentStatus === 'collected') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#3b6d11', margin: 0 }}>✓ Order collected</p>
      </div>
    )
  }

  if (currentStatus === 'cancelled') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>This order has been cancelled.</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
        {transitions.map(t => (
          <button key={t.next} onClick={() => handleStatus(t.next)} disabled={loading}
            style={{
              padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: t.primary ? '#111' : 'transparent',
              color: t.primary ? 'white' : '#888',
            }}>
            {loading ? '…' : t.label}
          </button>
        ))}
        {CANCEL_ALLOWED.includes(currentStatus) && (
          <button onClick={() => handleStatus('cancelled')} disabled={loading}
            style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', marginLeft: 'auto' }}>
            Cancel order
          </button>
        )}
      </div>
    </div>
  )
}
