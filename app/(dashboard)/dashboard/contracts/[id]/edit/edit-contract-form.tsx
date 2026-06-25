'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateContract } from '@/app/actions/contracts'

export default function EditContractForm({
  contractId,
  content,
  clientName,
}: {
  contractId: string
  content: string
  clientName: string
}) {
  const router  = useRouter()
  const [text,    setText]    = useState(content)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSave() {
    if (!text.trim()) { setError('Contract content is required'); return }
    setLoading(true)
    setError('')
    const { error } = await updateContract(contractId, text)
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/contracts/${contractId}`)
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit contract</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
          {clientName ? `Contract for ${clientName}` : 'Draft contract'}
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>CONTRACT CONTENT</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={28}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            lineHeight: '1.7',
            color: 'var(--text-2)',
          }}
        />
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSave} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button type="button" onClick={() => router.push(`/dashboard/contracts/${contractId}`)}
          className="glass-panel hover-lift" style={{ padding: '10px 16px', color: 'var(--text-2)', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
