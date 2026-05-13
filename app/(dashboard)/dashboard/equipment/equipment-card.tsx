'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { updateEquipmentStatus, deleteEquipment } from '@/app/actions/equipment'

const STATUSES = ['available', 'in_use', 'maintenance', 'retired']

type EquipmentItem = {
  equipment_id:  string
  name:          string
  category:      string
  serial_number?: string | null
  status:        string
  assigned_to?:  string | null
}

export default function EquipmentCard({ item, catStyle, statusStyle, isLast }: {
  item: EquipmentItem
  catStyle: { bg: string; color: string }
  statusStyle: { bg: string; color: string }
  isLast: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showActions, setShowActions] = useState(false)

  async function handleStatus(status: string) {
    setLoading(true)
    const { error } = await updateEquipmentStatus(item.equipment_id, status)
    if (error) toast.error(error)
    else toast.success('Status updated')
    router.refresh()
    setLoading(false)
    setShowActions(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete ${item.name}? This cannot be undone.`)) return
    setLoading(true)
    const { error } = await deleteEquipment(item.equipment_id)
    if (error) { toast.error(error); setLoading(false); return }
    router.refresh()
  }

  return (
    <>
      <div style={{
        display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
        padding: '1rem 1.25rem', alignItems: 'center',
        borderBottom: !isLast || showActions ? '1px solid var(--line-inner)' : 'none',
      }}>
        <div>
          <Link href={`/dashboard/equipment/${item.equipment_id}`} style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px', display: 'block', color: 'inherit', textDecoration: 'none' }}>
            {item.name}
          </Link>
          <button
            onClick={() => setShowActions(v => !v)}
            style={{ fontSize: '12px', color: 'var(--link)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            {showActions ? 'Hide actions' : 'Manage'}
          </button>
        </div>
        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: catStyle.bg, color: catStyle.color, fontWeight: '500', display: 'inline-block' }}>
          {item.category}
        </span>
        <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>
          {item.serial_number ?? '—'}
        </p>
        <div>
          <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: statusStyle.bg, color: statusStyle.color, fontWeight: '500', display: 'inline-block' }}>
            {item.status.replace('_', ' ')}
          </span>
          {item.status === 'in_use' && item.assigned_to && (
            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '2px 0 0 2px' }}>with {item.assigned_to}</p>
          )}
        </div>
      </div>

      {showActions && (
        <div style={{ padding: '12px 1.25rem', background: 'var(--bg)', borderBottom: isLast ? 'none' : '1px solid var(--line-inner)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 8px 0 0' }}>Set status:</p>
          {STATUSES.map(s => (
            <button key={s} onClick={() => handleStatus(s)} disabled={loading || s === item.status}
              style={{
                padding: '5px 12px', fontSize: '12px', borderRadius: '20px', cursor: s === item.status ? 'default' : 'pointer',
                background: s === item.status ? '#111' : 'white',
                color: s === item.status ? 'white' : '#555',
                border: `1px solid ${s === item.status ? '#111' : 'var(--line)'}`,
              }}>
              {s.replace('_', ' ')}
            </button>
          ))}
          <button onClick={handleDelete} disabled={loading}
            style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '12px', borderRadius: '20px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', cursor: 'pointer' }}>
            Delete
          </button>
        </div>
      )}
    </>
  )
}
