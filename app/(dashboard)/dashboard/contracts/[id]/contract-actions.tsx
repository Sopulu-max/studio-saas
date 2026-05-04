'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateContractStatus, markContractSigned, deleteContract, sendContractToClient } from '@/app/actions/contracts'

// 'signed' is intentionally excluded — use the "Record signature" button below
// to ensure signed_by and signed_at are always captured alongside the status change
const CONTRACT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent',  label: 'Sent to client' },
]

export default function ContractActions({
  contractId,
  currentStatus,
  clientName,
}: {
  contractId: string
  currentStatus: string
  clientName: string
}) {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [showSignForm, setShowSignForm] = useState(false)
  const [signedBy, setSignedBy]     = useState(clientName)
  const [error, setError]           = useState('')
  const [selectedStatus, setSelectedStatus] = useState(currentStatus === 'void' ? 'draft' : currentStatus)

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
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 16px' }}>This contract has been voided.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
          <button onClick={() => handleStatus('draft')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>
            Reopen as draft
          </button>
          <button onClick={handleDelete} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', cursor: 'pointer', marginLeft: 'auto' }}>
            Delete
          </button>
        </div>
      </div>
    )
  }

  const unchanged = selectedStatus === currentStatus

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      {/* Status picker */}
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 10px' }}>UPDATE STATUS</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ flex: 1, minWidth: '160px', fontSize: '13px', boxSizing: 'border-box' as const }}
        >
          {CONTRACT_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => handleStatus(selectedStatus)}
          disabled={loading || unchanged}
          style={{
            padding: '8px 18px', fontSize: '14px', borderRadius: '8px',
            background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none',
            cursor: unchanged ? 'default' : 'pointer',
            opacity: unchanged ? 0.45 : 1,
          }}
        >
          {loading ? '...' : 'Save'}
        </button>
      </div>

      {/* Other actions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: showSignForm ? '16px' : '0' }}>
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
        <button
          onClick={() => setShowSignForm(v => !v)}
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {showSignForm ? 'Cancel' : 'Record signature'}
        </button>
        <button onClick={() => handleStatus('void')} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', borderRadius: '8px', cursor: 'pointer' }}>
          Void
        </button>
        <button onClick={handleDelete} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--text-4)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', marginLeft: 'auto' }}>
          Delete
        </button>
      </div>

      {/* Signature form */}
      {showSignForm && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '16px' }}>
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
