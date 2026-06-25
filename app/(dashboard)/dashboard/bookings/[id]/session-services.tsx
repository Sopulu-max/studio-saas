'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { updateBookingServiceStatus } from '@/app/actions/booking-services'
import { toast } from 'sonner'

type BookedService = {
  booking_service_id: string
  quantity: number
  price_at_booking?: number | null
  status?: string | null
  services?: { name?: string | null; type?: string | null; category_value?: string | null } | null
}

export default function SessionServices({ services }: { services: BookedService[] }) {
  const [items, setItems] = useState(services)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  if (items.length === 0) return null

  const statuses = [
    { value: 'pending', label: 'Pending', color: '#854f0b', bg: '#faeeda' },
    { value: 'in_progress', label: 'In Progress', color: '#185fa5', bg: '#e6f1fb' },
    { value: 'ready', label: 'Ready', color: '#3b6d11', bg: '#eaf3de' },
    { value: 'delivered', label: 'Delivered', color: '#5f5e5a', bg: '#f1efe8' },
  ]

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingId(id)
    setItems(prev => prev.map(s => s.booking_service_id === id ? { ...s, status: newStatus } : s))
    
    const { error } = await updateBookingServiceStatus(id, newStatus)
    if (error) {
      toast.error('Failed to update status: ' + error)
      // Revert
      setItems(services)
    } else {
      toast.success('Status updated')
    }
    setUpdatingId(null)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
      <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>SERVICE FULFILLMENT</p>
        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>
      <div style={{ padding: '0.5rem' }}>
        <AnimatePresence>
          {items.map((bs, i) => {
            const svc = bs.services
            const typeIcon = svc?.type === 'product' ? '📦' : svc?.type === 'digital' ? '💻' : '🎯'
            const currentStatus = bs.status || 'pending'

            return (
              <motion.div 
                key={bs.booking_service_id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: updatingId === bs.booking_service_id ? 'var(--bg)' : 'transparent',
                  opacity: updatingId === bs.booking_service_id ? 0.6 : 1,
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{typeIcon}</span>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{svc?.name ?? 'Unknown service'}</p>
                    {bs.quantity > 1 && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>Quantity: {bs.quantity}</p>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {statuses.map(st => (
                    <button
                      key={st.value}
                      onClick={() => handleStatusChange(bs.booking_service_id, st.value)}
                      disabled={updatingId === bs.booking_service_id}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '500',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: currentStatus === st.value ? st.bg : 'transparent',
                        color: currentStatus === st.value ? st.color : 'var(--text-4)',
                        transition: 'all 0.2s'
                      }}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
