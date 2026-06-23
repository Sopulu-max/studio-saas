'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateInvoiceStatus, addPayment, sendInvoiceToClient } from '@/app/actions/invoices'
import { buildInvoiceShareLink } from '@/lib/whatsapp-links'

const PAYMENT_METHODS = ['card', 'bank_transfer', 'cash', 'mobile_money']

const INVOICE_STATUSES = [
  { value: 'draft',   label: 'Draft' },
  { value: 'sent',    label: 'Sent to client' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid',    label: 'Paid' },
]

export default function InvoiceActions({
  invoiceId,
  currentStatus,
  balanceDue,
  total,
  clientPhone,
  publicLink,
}: {
  invoiceId: string
  currentStatus: string
  balanceDue: number
  total: number
  clientPhone?: string | null
  publicLink: string
}) {
  const router = useRouter()
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [payment, setPayment]   = useState({ amount: '', method: 'bank_transfer', reference: '' })
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp' | 'both'>('email')
  const [selectedStatus, setSelectedStatus] = useState(
    currentStatus === 'cancelled' ? 'draft' : currentStatus
  )

  async function handleSendToClient() {
    if (sendMethod === 'whatsapp' || sendMethod === 'both') {
      const waUrl = buildInvoiceShareLink(invoiceId.split('-')[0], total, publicLink, clientPhone)
      window.open(waUrl, '_blank')
    }
    
    if (sendMethod === 'email' || sendMethod === 'both') {
      setLoading(true)
      const { error } = await sendInvoiceToClient(invoiceId)
      if (error) toast.error(error)
      else { toast.success('Invoice sent via email'); router.refresh() }
      setLoading(false)
    } else {
      setLoading(true)
      const { error } = await updateInvoiceStatus(invoiceId, 'sent')
      if (error) toast.error(error)
      else { toast.success('Invoice marked as sent'); router.refresh() }
      setLoading(false)
    }
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
      toast.success('Payment recorded')
      router.refresh()
      setShowPaymentForm(false)
      setPayment({ amount: '', method: 'bank_transfer', reference: '' })
      setLoading(false)
    }
  }

  const inputStyle  = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle  = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }
  const unchanged   = selectedStatus === currentStatus

  if (currentStatus === 'cancelled') {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 16px' }}>This invoice has been cancelled.</p>
        <button onClick={() => handleStatusChange('draft')} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer' }}>
          Reopen as draft
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 10px', color: 'var(--text-3)' }}>UPDATE STATUS</p>

      {/* Status picker */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <select
          value={selectedStatus}
          onChange={e => setSelectedStatus(e.target.value)}
          style={{ flex: 1, minWidth: '160px', fontSize: '13px', boxSizing: 'border-box' as const }}
        >
          {INVOICE_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => handleStatusChange(selectedStatus)}
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
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: showPaymentForm ? '16px' : '0' }}>
        <a href={`/print/invoice/${invoiceId}`} target="_blank" rel="noreferrer"
          style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' }}>
          Download PDF
        </a>
        {currentStatus === 'draft' && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <select
              value={sendMethod}
              onChange={e => setSendMethod(e.target.value as 'email' | 'whatsapp' | 'both')}
              disabled={loading}
              style={{ padding: '8px 12px', fontSize: '13px', borderRadius: '8px 0 0 8px', border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', borderRight: 'none' }}
            >
              <option value="email">Email</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="both">Both</option>
            </select>
            <button onClick={handleSendToClient} disabled={loading}
              style={{ padding: '8px 16px', fontSize: '13px', background: '#185fa5', color: 'white', border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer' }}>
              Send Invoice
            </button>
          </div>
        )}
        {(currentStatus === 'sent' || currentStatus === 'overdue' || currentStatus === 'paid') && (
          <a href={buildInvoiceShareLink(invoiceId.split('-')[0], total, publicLink, clientPhone)} target="_blank" rel="noopener noreferrer"
             style={{ padding: '8px 16px', fontSize: '13px', background: '#25D366', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 0C5.385 0 0 5.385 0 12.031C0 14.673 1.05 17.202 2.87 19.166L1.134 23.366L5.438 21.63C7.355 23.303 9.773 24 12.031 24C18.677 24 24 18.615 24 11.969C24 5.323 18.677 0 12.031 0ZM18.57 16.711C18.293 17.487 16.892 18.172 16.208 18.256C15.655 18.339 14.898 18.423 11.83 17.151C8.077 15.589 5.666 11.758 5.485 11.517C5.304 11.276 4 9.539 4 7.747C4 5.955 4.908 5.086 5.274 4.721C5.551 4.444 5.986 4.316 6.388 4.316C6.516 4.316 6.634 4.321 6.743 4.326C7.02 4.341 7.159 4.356 7.34 4.789C7.568 5.339 8.125 6.702 8.192 6.841C8.258 6.98 8.35 7.16 8.258 7.34C8.167 7.52 8.106 7.595 7.97 7.747C7.835 7.899 7.7 8.084 7.564 8.192C7.429 8.3 7.279 8.423 7.444 8.708C7.61 8.993 8.183 9.932 9.034 10.688C10.13 11.587 11.018 11.874 11.334 12.008C11.56 12.102 11.846 12.078 12.012 11.898C12.223 11.673 12.479 11.282 12.736 10.891C12.932 10.59 13.174 10.545 13.43 10.635C13.702 10.726 15.134 11.433 15.42 11.568C15.706 11.704 15.897 11.779 15.957 11.884C16.017 11.99 16.017 12.516 15.741 13.292" /></svg>
            Share via WhatsApp
          </a>
        )}
        {balanceDue > 0 && (
          <button onClick={() => setShowPaymentForm(v => !v)} disabled={loading}
            style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {showPaymentForm ? 'Cancel' : 'Record payment'}
          </button>
        )}
        <button onClick={() => handleStatusChange('cancelled')} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', borderRadius: '8px', cursor: 'pointer', marginLeft: 'auto' }}>
          Cancel invoice
        </button>
      </div>

      {/* Payment form */}
      {showPaymentForm && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '4px' }}>
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
            style={{ width: '100%', padding: '10px', fontSize: '14px', borderRadius: '8px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', cursor: 'pointer' }}>
            {loading ? 'Saving...' : 'Save payment'}
          </button>
        </div>
      )}
    </div>
  )
}
