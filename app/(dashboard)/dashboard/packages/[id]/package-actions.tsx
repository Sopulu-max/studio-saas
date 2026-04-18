'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { deletePackage } from '@/app/actions/packages'

export default function PackageActions({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm('Delete this package? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deletePackage(packageId)
    if (error) { toast.error(error); setLoading(false); return }
    router.push('/dashboard/packages')
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Link
          href={`/dashboard/packages/${packageId}/edit`}
          style={{
            padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer',
            background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)',
            textDecoration: 'none', display: 'inline-block',
          }}
        >
          Edit package
        </Link>
        <button
          onClick={handleDelete}
          disabled={loading}
          style={{ padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595' }}
        >
          {loading ? '...' : 'Delete package'}
        </button>
      </div>
    </div>
  )
}
