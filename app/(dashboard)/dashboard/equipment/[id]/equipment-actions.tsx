'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateEquipmentStatus, deleteEquipment, checkoutEquipment, checkinEquipment } from '@/app/actions/equipment'

const NON_CHECKOUT_STATUSES = ['maintenance', 'retired']

type StaffMember = { staff_id: string; full_name: string }

export default function EquipmentActions({
  equipmentId,
  currentStatus,
  assignedTo,
  staffList = [],
}: {
  equipmentId:   string
  currentStatus: string
  assignedTo?:   string | null
  staffList?:    StaffMember[]
}) {
  const router = useRouter()
  const [loading,      setLoading]      = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [assignTo,     setAssignTo]     = useState('')
  const [coNotes,      setCoNotes]      = useState('')

  async function handleStatus(status: string) {
    setLoading(true)
    const { error } = await updateEquipmentStatus(equipmentId, status)
    if (error) toast.error(error)
    else toast.success('Status updated')
    router.refresh()
    setLoading(false)
  }

  async function handleCheckout() {
    if (!assignTo.trim()) { toast.error('Enter who is taking this equipment'); return }
    setLoading(true)
    const { error } = await checkoutEquipment(equipmentId, assignTo, undefined, coNotes)
    if (error) toast.error(error)
    else {
      toast.success('Checked out')
      setShowCheckout(false)
      setAssignTo('')
      setCoNotes('')
    }
    router.refresh()
    setLoading(false)
  }

  async function handleCheckin() {
    setLoading(true)
    const { error } = await checkinEquipment(equipmentId)
    if (error) toast.error(error)
    else toast.success('Checked in — marked available')
    router.refresh()
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm('Delete this equipment? This cannot be undone.')) return
    setLoading(true)
    const { error } = await deleteEquipment(equipmentId)
    if (error) { toast.error(error); setLoading(false); return }
    router.push('/dashboard/equipment')
  }

  const isCheckedOut = currentStatus === 'in_use'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 14px' }}>ACTIONS</p>

      {/* Checkout / Check-in */}
      {!NON_CHECKOUT_STATUSES.includes(currentStatus) && (
        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--line-inner)' }}>
          {isCheckedOut ? (
            <div>
              {assignedTo && (
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 10px' }}>
                  Currently with: <strong style={{ color: 'var(--text)' }}>{assignedTo}</strong>
                </p>
              )}
              <button onClick={handleCheckin} disabled={loading}
                style={{ padding: '7px 16px', fontSize: '13px', background: '#eaf3de', color: '#3b6d11', border: '1px solid #b8d9a0', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                ✓ Check back in
              </button>
            </div>
          ) : (
            <div>
              {!showCheckout ? (
                <button onClick={() => setShowCheckout(true)} disabled={loading}
                  style={{ padding: '7px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                  Check out
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>Who is taking this?</p>

                  {/* Staff picker: datalist for suggestions + free text */}
                  <div>
                    <input
                      list={`staff-list-${equipmentId}`}
                      value={assignTo}
                      onChange={e => setAssignTo(e.target.value)}
                      placeholder="Name or pick from staff…"
                      autoFocus
                      style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--text)' }}
                    />
                    <datalist id={`staff-list-${equipmentId}`}>
                      {staffList.map(s => (
                        <option key={s.staff_id} value={s.full_name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Optional notes */}
                  <input
                    value={coNotes}
                    onChange={e => setCoNotes(e.target.value)}
                    placeholder="Notes (optional, e.g. for which shoot)"
                    style={{ width: '100%', padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', boxSizing: 'border-box', background: 'var(--bg)', color: 'var(--text)' }}
                  />

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={handleCheckout} disabled={loading}
                      style={{ padding: '7px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}>
                      Confirm checkout
                    </button>
                    <button onClick={() => { setShowCheckout(false); setAssignTo(''); setCoNotes('') }}
                      style={{ padding: '7px 12px', fontSize: '13px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Status buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 4px 0 0' }}>Status:</p>
        {(['available', 'maintenance', 'retired'] as const).map(s => (
          <button key={s} onClick={() => handleStatus(s)} disabled={loading || s === currentStatus}
            style={{
              padding: '5px 12px', fontSize: '12px', borderRadius: '20px', cursor: s === currentStatus ? 'default' : 'pointer',
              background: s === currentStatus ? 'var(--text)' : 'transparent',
              color:      s === currentStatus ? 'var(--bg)'   : 'var(--text-3)',
              border: `1px solid ${s === currentStatus ? 'var(--text)' : 'var(--line)'}`,
            }}>
            {s.replace('_', ' ')}
          </button>
        ))}
        <button onClick={handleDelete} disabled={loading}
          style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: '12px', borderRadius: '20px', background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', cursor: 'pointer' }}>
          Delete
        </button>
      </div>
    </div>
  )
}
