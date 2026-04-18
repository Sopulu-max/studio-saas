'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateSessionStatus } from '@/app/actions/sessions'

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  confirmed:      { label: 'Start session',    next: 'in_progress' },
  in_progress:    { label: 'Mark complete',    next: 'colour_grading' },
  colour_grading: { label: 'Send to editing',  next: 'editing' },
  editing:        { label: 'Mark delivered',   next: 'delivered' },
}

export default function TodayActions({ sessionId, status }: { sessionId: string; status: string }) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  const action = NEXT_STATUS[status]
  if (!action) return null

  async function handleAdvance() {
    setLoading(true)
    const { error } = await updateSessionStatus(sessionId, action.next)
    if (error) toast.error(error)
    else { toast.success('Status updated'); router.refresh() }
    setLoading(false)
  }

  return (
    <button
      onClick={handleAdvance}
      disabled={loading}
      style={{
        padding: '4px 10px', fontSize: '11px', borderRadius: '6px',
        background: 'var(--btn)', color: 'var(--btn-fg)',
        border: 'none', cursor: 'pointer', fontWeight: '500', whiteSpace: 'nowrap',
      }}
    >
      {loading ? '…' : action.label}
    </button>
  )
}
