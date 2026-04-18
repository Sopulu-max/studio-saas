'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateContractStatus, markContractSigned, deleteContract, sendContractToClient } from '@/app/actions/contracts'

export default function ContractActions({
  contractId,
  currentStatus,
  clientEmail,
  clientName,
}: {
  contractId: string
  currentStatus: string
  clientEmail: string
  clientName: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showSignForm, setShowSignForm] = useState(false)
  const [signedBy, setSignedBy] = useState(clientName)
  const [error, setError] = useState('')

  async function handleStatus(status: string) {
    setLoading(true)
    const { error } = await updateContractStatus(contractId, status)
    if (error) toast.error(error)
    else toast.success('Contract updated')
    router.refresh()
    setLoading(false)
  }

  async function handleSigned() {
    if (!signedBy) { setError('Enter the name of who signed'); return }
    setLoading(true)
    setError('')
    const { error } = await markContractSigned(contractId, signedBy)
    if (error) { toast.error(error); setLoading(false); return }
    toast.success('Contract marked as signed')
    router.refresh()
    setLoading(false)
    setShowSignForm(false)
  }

  async function handleSendToClient() {
    setLoading(true)
    const { error } = await sendContractToClient(contractId)
    if (error) toast.error(error)
    else { toast.success('Contract sent to client'); router.refresh() }
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this contract? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deleteContract(contractId)
    if (error) { toast.error(error); setLoading(false); return }
    router.push('/dashboard/contracts')
  }

  if (currentStatus === 'void') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>This contract has been voided.</p>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <a href={`/print/contract/${contractId}`} target="_blank" rel="noreferrer"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
          Download PDF
        </a>
        {currentStatus === 'draft' && (
          <button onClick={handleSendToClient} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: '#185fa5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Send to client
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: showSignForm ? '16px' : '0' }}>
        {currentStatus === 'draft' && (
          <button onClick={() => handleStatus('sent')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px' }}>
            Mark as sent
          </button>
        )}
        {(currentStatus === 'draft' || currentStatus === 'sent') && (
          <button
            onClick={() => setShowSignForm(v => !v)}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none' }}>
            {showSignForm ? 'Cancel' : 'Record signature'}
          </button>
        )}
        {currentStatus === 'signed' && (
          <button onClick={() => handleStatus('void')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)' }}>
            Void contract
          </button>
        )}
        <button onClick={handleDelete} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', marginLeft: 'auto' }}>
          Delete
        </button>
      </div>

      {showSignForm && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 8px' }}>
            Record that this contract was signed — enter the full name of the person who signed.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={signedBy}
              onChange={e => setSignedBy(e.target.value)}
              placeholder="Full name of signer"
              style={{ flex: 1, boxSizing: 'border-box' as const }}
            />
            <button onClick={handleSigned} disabled={loading}
              style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
              {loading ? '...' : 'Confirm'}
            </button>
          </div>
          {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginTop: '8px', marginBottom: 0 }}>{error}</p>}
        </div>
      )}
    </div>
  )
}