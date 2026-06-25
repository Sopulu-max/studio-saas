'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteSession } from '@/app/actions/sessions'

export default function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this session? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deleteSession(sessionId)
    if (error) {
      toast.error(error)
      setLoading(false)
    } else {
      toast.success('Session deleted')
      router.push('/dashboard/bookings')
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      style={{
        fontSize: '13px',
        padding: '4px 12px',
        borderRadius: '8px',
        border: '1px solid #f09595',
        color: '#e24b4a',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {loading ? 'Deleting…' : 'Delete'}
    </button>
  )
}
