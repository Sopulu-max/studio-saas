'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateInvoiceStatus, addPayment, sendInvoiceToClient } from '@/app/actions/invoices'

const PAYMENT_METHODS = ['card', 'bank_transfer', 'cash', 'mobile_money']

export default function InvoiceActions({
  invoiceId,
  currentStatus,
  balanceDue,
}: {
  invoiceId: string
  currentStatus: string
  balanceDue: number
}) {
  const router = useRouter()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payment, setPayment] = useState({ amount: '', method: 'bank_transfer', reference: '' })

  async function handleSendToClient() {
    setLoading(true)
    const { error } = await sendInvoiceToClient(invoiceId)
    if (error) toast.error(error)
    else { toast.success('Invoice sent to client'); router.refresh() }
    setLoading(false)
  }

  async function handleStatusChange(status: string) {
    setLoading(true)
    const { error } = await updateInvoiceStatus(invoiceId, status)
    if (error) toast.error(error)
    else toast.success('Invoice updated')
    router.refresh()
    setLoading(false)
  }

  async function handlePayment() {
    if (!payment.amount || parseFloat(payment.amount) <= 0) {
      setError('Enter a valid amount')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await addPayment({ invoice_id: invoiceId, ...payment })
    if (error) {
      setError(error)
      toast.error(error)
      setLoading(false)
    } else {
      if (balanceDue - parseFloat(payment.amount) <= 0) {
        await updateInvoiceStatus(invoiceId, 'paid')
      }
      toast.success('Payment recorded')
      router.refresh()
      setShowPaymentForm(false)
      setPayment({ amount: '', method: 'bank_transfer', reference: '' })
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 12px', color: 'var(--text-3)' }}>ACTIONS</p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <a href={`/print/invoice/${invoiceId}`} target="_blank" rel="noreferrer"
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

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: showPaymentForm ? '16px' : '0' }}>
        {currentStatus === 'draft' && (
          <button onClick={() => handleStatusChange('sent')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px' }}>
            Mark as sent
          </button>
        )}
        {currentStatus === 'sent' && (
          <button onClick={() => handleStatusChange('overdue')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: '#a32d2d', border: '0.5px solid #f09595' }}>
            Mark as overdue
          </button>
        )}
        {currentStatus !== 'paid' && currentStatus !== 'cancelled' && balanceDue > 0 && (
          <button onClick={() => setShowPaymentForm(v => !v)} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none' }}>
            {showPaymentForm ? 'Cancel' : 'Record payment'}
          </button>
        )}
        {currentStatus !== 'cancelled' && currentStatus !== 'paid' && (
          <button onClick={() => handleStatusChange('cancelled')} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)' }}>
            Cancel invoice
          </button>
        )}
      </div>

      {showPaymentForm && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Amount (₦) <span style={{ color: '#e24b4a' }}>*</span></label>
              <input type="number" value={payment.amount}
                onChange={e => setPayment(p => ({ ...p, amount: e.target.value }))}
                placeholder={balanceDue.toString()} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment method</label>
              <select value={payment.method}
                onChange={e => setPayment(p => ({ ...p, method: e.target.value }))}
                style={inputStyle}>
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={labelStyle}>Reference / transaction ID</label>
            <input type="text" value={payment.reference}
              onChange={e => setPayment(p => ({ ...p, reference: e.target.value }))}
              placeholder="Optional" style={inputStyle} />
          </div>
          {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}
          <button onClick={handlePayment} disabled={loading}
            style={{ width: '100%', padding: '10px', fontSize: '14px' }}>
            {loading ? 'Saving...' : 'Save payment'}
          </button>
        </div>
      )}
    </div>
  )
}