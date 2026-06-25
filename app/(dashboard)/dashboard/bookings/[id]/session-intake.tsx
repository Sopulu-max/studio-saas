'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { recordIntake } from '@/app/actions/sessions'

const METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card',          label: 'Card' },
  { value: 'mobile_money',  label: 'Mobile money' },
]

export default function SessionIntake({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState('')
  const [paid, setPaid]     = useState('')
  const [method, setMethod] = useState('cash')
  const [error, setError]   = useState('')

  const agreedNum = parseFloat(agreed) || 0
  const paidNum   = parseFloat(paid) || 0
  const balance   = Math.max(0, agreedNum - paidNum)

  async function handleSubmit() {
    if (!agreed || agreedNum <= 0) { setError('Enter the agreed amount'); return }
    setLoading(true)
    setError('')
    const { error: err } = await recordIntake({
      sessionId,
      agreedAmount: agreed,
      paymentAmount: paid,
      paymentMethod: method,
    })
    if (err) {
      setError(err)
      setLoading(false)
    } else {
      toast.success('Invoice created' + (paidNum > 0 ? ' and payment recorded' : ''))
      router.refresh()
    }
  }

  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block' as const, marginBottom: '5px' }
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 4px' }}>QUICK INTAKE</p>
      <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 16px' }}>Create invoice and record payment in one step</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={labelStyle}>Agreed amount (₦) <span style={{ color: '#e24b4a' }}>*</span></label>
          <input
            type="number" min="0"
            value={agreed} onChange={e => setAgreed(e.target.value)}
            placeholder="e.g. 50000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Amount paid now (₦)</label>
          <input
            type="number" min="0"
            value={paid} onChange={e => setPaid(e.target.value)}
            placeholder="0 = invoice only"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={labelStyle}>Payment method</label>
        <select value={method} onChange={e => setMethod(e.target.value)} style={inputStyle}>
          {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {agreedNum > 0 && (
        <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'var(--text-2)' }}>Total agreed</span>
            <span>₦{agreedNum.toLocaleString()}</span>
          </div>
          {paidNum > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-2)' }}>Paid now</span>
              <span style={{ color: '#3b6d11' }}>₦{paidNum.toLocaleString()}</span>
            </div>
          )}
          {balance > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--line)', fontWeight: '500', color: '#a32d2d' }}>
              <span>Balance due</span>
              <span>₦{balance.toLocaleString()}</span>
            </div>
          )}
          {paidNum >= agreedNum && agreedNum > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--line)', fontWeight: '500', color: '#3b6d11' }}>
              <span>Fully paid</span>
              <span>✓</span>
            </div>
          )}
        </div>
      )}

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', margin: '0 0 10px' }}>{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{ padding: '9px 20px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', fontSize: '14px', cursor: 'pointer', width: '100%' }}
      >
        {loading ? 'Saving...' : paidNum > 0 ? 'Create invoice & record payment' : 'Create invoice'}
      </button>
    </div>
  )
}
