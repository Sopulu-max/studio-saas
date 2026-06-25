'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { deleteStaff } from '@/app/actions/staff'

export default function StaffActions({ staffId }: { staffId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Remove this staff member? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deleteStaff(staffId)
    if (error) { toast.error(error); setLoading(false); return }
    router.push('/dashboard/staff')
  }

  return (
    <div className="glass-panel" style={{ padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>
      <button
        onClick={handleDelete}
        disabled={loading}
        style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595' }}
      >
        {loading ? '...' : 'Remove staff member'}
      </button>
    </div>
  )
}
