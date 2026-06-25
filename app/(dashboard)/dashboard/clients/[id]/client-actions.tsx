'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteClient } from '@/app/actions/clients'

export default function ClientActions({ clientId }: { clientId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this client? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deleteClient(clientId)
    if (error) { toast.error(error); setLoading(false); return }
    router.push('/dashboard/clients')
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595' }}
      >
        {loading ? '...' : 'Delete client'}
      </button>
    </div>
  )
}
