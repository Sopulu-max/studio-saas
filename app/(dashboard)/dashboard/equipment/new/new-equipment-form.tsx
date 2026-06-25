'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addEquipment } from '@/app/actions/equipment'
import type { EquipmentCategoryConfig } from '@/lib/studio-config'

const STATUSES = ['available', 'in_use', 'maintenance', 'retired']

export default function NewEquipmentForm({ categories }: { categories: EquipmentCategoryConfig[] }) {
  const router = useRouter()
  const [loading, setLoading]       = useState(false)
  const [error,   setError]         = useState('')
  const [existingId, setExistingId] = useState('')
  const [form, setForm] = useState({
    name: '', category: categories[0]?.value ?? '', serial_number: '', status: 'available',
    notes: '', purchase_date: '', purchase_price: '',
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.name) { setError('Name is required'); return }
    setLoading(true)
    setError('')
    setExistingId('')
    const { error, equipmentId, existingEquipmentId } = await addEquipment(form)
    if (error) {
      setError(error)
      if (existingEquipmentId) setExistingId(existingEquipmentId)
      setLoading(false)
    } else {
      router.push(equipmentId ? `/dashboard/equipment/${equipmentId}` : '/dashboard/equipment')
    }
  }

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }
  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '6px' }

  return (
    <div style={{ maxWidth: '520px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Add equipment</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Add a piece of gear to your inventory</p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Name <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="text" value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="e.g. Canon EOS R5" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={e => update('category', e.target.value)} style={inputStyle}>
              {categories.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => update('status', e.target.value)} style={inputStyle}>
              {STATUSES.map(s => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Serial number</label>
          <input type="text" value={form.serial_number} onChange={e => update('serial_number', e.target.value)}
            placeholder="Optional" style={inputStyle} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={labelStyle}>Purchase date</label>
            <input type="date" value={form.purchase_date} onChange={e => update('purchase_date', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Purchase price (₦)</label>
            <input type="number" min="0" value={form.purchase_price} onChange={e => update('purchase_price', e.target.value)}
              placeholder="Optional" style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Notes</label>
          <textarea value={form.notes} onChange={e => update('notes', e.target.value)}
            placeholder="Condition notes, accessories included, repair history…"
            rows={3} style={{ ...inputStyle, resize: 'vertical' as const, fontFamily: 'inherit', fontSize: '14px' }} />
        </div>

        {error && (
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#e24b4a', margin: '0 0 6px' }}>{error}</p>
            {existingId && (
              <Link href={`/dashboard/equipment/${existingId}`}
                style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>
                View that equipment →
              </Link>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSubmit} disabled={loading} style={{ flex: 1, padding: '10px' }}>
            {loading ? 'Saving…' : 'Save equipment'}
          </button>
          <button onClick={() => router.back()} style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
