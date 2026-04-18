'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updatePrintOrder } from '@/app/actions/print-orders'

type Item = { product_name: string; size: string; quantity: string; unit_price: string }

const PRODUCT_SUGGESTIONS = [
  '4×6 Print', '5×7 Print', '8×10 Print', '10×12 Print', '11×14 Print', '16×20 Print', '20×24 Print',
  'Canvas Print', 'Framed Print', 'Photo Album', 'Photo Book', 'Wallet Prints',
]

function emptyItem(): Item {
  return { product_name: '', size: '', quantity: '1', unit_price: '' }
}

export default function EditOrderForm({
  orderId,
  initialNotes,
  initialItems,
}: {
  orderId: string
  initialNotes: string
  initialItems: Item[]
}) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [notes,   setNotes]   = useState(initialNotes)
  const [items,   setItems]   = useState<Item[]>(initialItems.length ? initialItems : [emptyItem()])

  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block' as const, marginBottom: '5px' }
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }

  function updateItem(index: number, field: keyof Item, value: string) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }
  function addItem()            { setItems(prev => [...prev, emptyItem()]) }
  function removeItem(i: number){ setItems(prev => prev.length === 1 ? prev : prev.filter((_, j) => j !== i)) }

  const total = items.reduce((sum, item) => {
    return sum + (parseInt(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
  }, 0)

  async function handleSubmit() {
    const parsed = items.map(item => ({
      product_name: item.product_name.trim(),
      size:         item.size.trim(),
      quantity:     parseInt(item.quantity) || 0,
      unit_price:   parseFloat(item.unit_price) || 0,
    }))

    if (parsed.some(i => !i.product_name)) { setError('All items need a product name'); return }
    if (parsed.some(i => i.quantity < 1))   { setError('All quantities must be at least 1'); return }

    setLoading(true)
    setError('')
    const { error } = await updatePrintOrder(orderId, { notes, items: parsed })
    if (error) {
      setError(error)
      setLoading(false)
    } else {
      router.push(`/dashboard/print-orders/${orderId}`)
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Edit print order</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Update items and notes</p>
      </div>

      {/* Line items */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>ORDER ITEMS</p>

        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1fr 1fr 32px', gap: '8px', marginBottom: '8px', fontSize: '12px', color: 'var(--text-4)' }}>
          <span>Product</span><span>Size</span><span>Qty</span><span>Unit price (₦)</span><span></span>
        </div>

        {items.map((item, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr 1fr 1fr 32px', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input
              list="product-suggestions"
              value={item.product_name}
              onChange={e => updateItem(i, 'product_name', e.target.value)}
              placeholder="e.g. 8×10 Print"
              style={inputStyle}
            />
            <input value={item.size} onChange={e => updateItem(i, 'size', e.target.value)}
              placeholder="e.g. A4" style={inputStyle} />
            <input type="number" min="1" value={item.quantity}
              onChange={e => updateItem(i, 'quantity', e.target.value)} style={inputStyle} />
            <input type="number" min="0" step="0.01" value={item.unit_price}
              onChange={e => updateItem(i, 'unit_price', e.target.value)} placeholder="0" style={inputStyle} />
            <button onClick={() => removeItem(i)} disabled={items.length === 1}
              style={{ padding: '0', width: '28px', height: '28px', background: 'transparent', border: 'none', cursor: items.length === 1 ? 'default' : 'pointer', color: 'var(--text-4)', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ×
            </button>
          </div>
        ))}

        <datalist id="product-suggestions">
          {PRODUCT_SUGGESTIONS.map(p => <option key={p} value={p} />)}
        </datalist>

        <button onClick={addItem}
          style={{ fontSize: '13px', color: 'var(--link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: '4px' }}>
          + Add item
        </button>

        {total > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--line-inner)' }}>
            <div style={{ textAlign: 'right' as const }}>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 2px' }}>Order total</p>
              <p style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>₦{total.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem', marginBottom: '12px' }}>
        <label style={labelStyle}>Notes <span style={{ color: 'var(--text-4)', fontSize: '12px' }}>(optional)</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Paper type, finish, delivery instructions…"
          rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
      </div>

      {error && <p style={{ fontSize: '13px', color: '#e24b4a', marginBottom: '12px' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
          {loading ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={() => router.push(`/dashboard/print-orders/${orderId}`)}
          style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
