'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { addPayment, updateInvoiceStatus } from '@/app/actions/invoices'

const METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card',          label: 'Card' },
  { value: 'mobile_money',  label: 'Mobile money' },
]

export default function QuickPayment({
  invoiceId,
  balanceDue,
}: {
  invoiceId: string
  balanceDue: number
}) {
  const router  = useRouter()
  const [open,    setOpen]    = useState(false)
  const [loading, setLoading] = useState(false)
  const [payment, setPayment] = useState({ amount: String(balanceDue), method: 'bank_transfer', reference: '' })
  const [error,   setError]   = useState('')

  async function handleRecord() {
    const amt = parseFloat(payment.amount)
    if (!payment.amount || amt <= 0) { setError('Enter a valid amount'); return }
    setLoading(true)
    setError('')
    const { error } = await addPayment({ invoice_id: invoiceId, ...payment })
    if (error) {
      setError(error)
      toast.error(error)
      setLoading(false)
    } else {
      if (balanceDue - amt <= 0) {
        await updateInvoiceStatus(invoiceId, 'paid')
      }
      toast.success('Payment recorded')
      setOpen(false)
      router.refresh()
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '12px', color: 'var(--text-4)', display: 'block', marginBottom: '4px' }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ fontSize: '12px', color: 'var(--link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'none' }}
      >
        Record payment →
      </button>
    )
  }

  return (
    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--line-inner)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
        <div>
          <label style={labelStyle}>Amount (₦)</label>
          <input type="number" value={payment.amount}
            onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
            style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Method</label>
          <select value={payment.method} onChange={e => setPayment(p => ({ ...p, method: e.target.value }))} style={inputStyle}>
            {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>Reference (optional)</label>
        <input type="text" value={payment.reference}
          onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))}
          placeholder="Transaction ID" style={inputStyle} />
      </div>
      {error && <p style={{ fontSize: '12px', color: '#e24b4a', margin: '0 0 8px' }}>{error}</p>}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleRecord} disabled={loading}
          style={{ flex: 1, padding: '8px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {loading ? 'Saving…' : 'Save payment'}
        </button>
        <button onClick={() => setOpen(false)}
          style={{ padding: '8px 12px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
