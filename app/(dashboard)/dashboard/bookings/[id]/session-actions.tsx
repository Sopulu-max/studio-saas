'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStudioConfig } from '@/components/studio-config-provider'
import { getCancellationStatus, getStatusConfig } from '@/lib/studio-config'
import {
  changeBookingStatus,
  updateSessionDriveLink,
  recordSelections,
} from '@/app/actions/bookings'
import {
  assignSessionStaff,
  removeSessionStaff,
} from '@/app/actions/fulfillment'
import { addExtraCharge } from '@/app/actions/invoices'
import type { SessionDetailDTO } from '@/lib/domains/bookings/types'

// --- Types --------------------------------------------------------------------

type StaffMember   = { staff_id: string; full_name: string; role?: string }
type AssignedStaff = { staff_id: string; full_name: string; role: string }

interface SessionActionsProps {
  sessionId:      string
  currentStatus:  string
  serviceType:    string
  outfitsCount:   number | null
  invoiceId:      string | null
  sessions:       SessionDetailDTO[]
  availableStaff: StaffMember[]
  driveLink:      string
}

// --- Helpers ------------------------------------------------------------------

function btnStyle(primary: boolean, danger?: boolean): React.CSSProperties {
  if (danger)  return { background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
  if (primary) return { background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
  return { background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
}

// --- Sub-components -----------------------------------------------------------

function DriveLinkForm({ value, onChange, onSave, loading }: {
  value: string; onChange: (v: string) => void; onSave: () => void; loading: boolean
}) {
  return (
    <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 8px' }}>
        Paste the Google Drive folder link for this session&apos;s files.
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input type="url" value={value} onChange={e => onChange(e.target.value)}
          placeholder="https://drive.google.com/..."
          style={{ flex: 1, boxSizing: 'border-box' as const }} />
        <button onClick={onSave} disabled={loading}
          style={{ padding: '8px 16px', fontSize: '13px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {loading ? '...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function StaffRoleRow({ roleValue, roleLabel, assigned, availableStaff, onAssign, onRemove, loading }: {
  roleValue:      string
  roleLabel:      string
  assigned:       AssignedStaff[]
  availableStaff: StaffMember[]
  onAssign:       (staffId: string, role: string) => Promise<void>
  onRemove:       (staffId: string) => Promise<void>
  loading:        boolean
}) {
  const [selected, setSelected] = useState('')
  const assignedForRole = assigned.filter(s => s.role === roleValue)

  return (
    <div style={{ marginBottom: '14px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '600', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
        {roleLabel}
      </p>

      {assignedForRole.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px', marginBottom: '6px' }}>
          {assignedForRole.map(s => (
            <div key={s.staff_id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-1)' }}>? {s.full_name}</span>
              <button
                onClick={() => onRemove(s.staff_id)}
                disabled={loading}
                style={{ fontSize: '11px', color: '#e24b4a', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0', textDecoration: 'underline' }}
              >
                remove
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 6px', fontStyle: 'italic' }}>Not assigned</p>
      )}

      {availableStaff.length === 0 ? (
        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
          <Link href="/dashboard/staff/new" style={{ color: 'var(--link)' }}>Add staff first</Link>
        </p>
      ) : (
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <select value={selected} onChange={e => setSelected(e.target.value)}
            style={{ flex: 1, fontSize: '13px', boxSizing: 'border-box' as const }}>
            <option value="">Assign {roleLabel}�</option>
            {availableStaff.map(s => (
              <option key={s.staff_id} value={s.staff_id}>{s.full_name}</option>
            ))}
          </select>
          <button
            onClick={() => { if (selected) { onAssign(selected, roleValue); setSelected('') } }}
            disabled={!selected || loading}
            style={{ padding: '7px 12px', fontSize: '12px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}
          >
            {loading ? '�' : 'Assign'}
          </button>
        </div>
      )}
    </div>
  )
}

function StaffPanel({ sessionName, assigned, availableStaff, onAssign, onRemove, loading, serviceType }: {
  sessionName:    string
  assigned:       AssignedStaff[]
  availableStaff: StaffMember[]
  onAssign:       (staffId: string, role: string) => Promise<void>
  onRemove:       (staffId: string) => Promise<void>
  loading:        boolean
  serviceType:    string
}) {
  // Build role rows based on service type
  type RoleRow = { roleValue: string; roleLabel: string }
  let rows: RoleRow[]

  if (serviceType === 'photo_video') {
    rows = [
      { roleValue: 'photographer', roleLabel: 'Photographer' },
      { roleValue: 'videographer', roleLabel: 'Videographer' },
      { roleValue: 'colour_grader', roleLabel: 'Colour grader' },
      { roleValue: 'editor',       roleLabel: 'Photo editor' },
      { roleValue: 'video_editor', roleLabel: 'Video editor' },
    ]
  } else if (serviceType === 'video') {
    // Use photographer/editor slots for backward compat with existing assignments
    rows = [
      { roleValue: 'photographer', roleLabel: 'Videographer' },
      { roleValue: 'colour_grader', roleLabel: 'Colour grader' },
      { roleValue: 'editor',       roleLabel: 'Video editor' },
    ]
  } else {
    rows = [
      { roleValue: 'photographer', roleLabel: 'Photographer' },
      { roleValue: 'colour_grader', roleLabel: 'Colour grader' },
      { roleValue: 'editor',       roleLabel: 'Editor / retoucher' },
    ]
  }

  return (
    <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '16px' }}>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)', margin: '0 0 12px' }}>Staff: {sessionName}</p>
      {rows.map(row => (
        <StaffRoleRow
          key={row.roleValue}
          roleValue={row.roleValue} roleLabel={row.roleLabel}
          assigned={assigned} availableStaff={availableStaff}
          onAssign={onAssign} onRemove={onRemove} loading={loading}
        />
      ))}
    </div>
  )
}

// --- Status picker ------------------------------------------------------------

function StatusPicker({ current, statuses, onUpdate, loading }: {
  current: string
  statuses: { value: string; label: string }[]
  onUpdate: (val: string) => void
  loading: boolean
}) {
  const [selected, setSelected] = useState(current)
  const unchanged = selected === current

  return (
    <div>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 10px' }}>UPDATE STATUS</p>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' as const }}>
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          style={{ flex: 1, minWidth: '160px', fontSize: '13px', boxSizing: 'border-box' as const }}
        >
          {statuses.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button
          onClick={() => onUpdate(selected)}
          disabled={loading || unchanged}
          style={{
            ...btnStyle(true),
            opacity: unchanged ? 0.45 : 1,
            cursor: unchanged ? 'default' : 'pointer',
          }}
        >
          {loading ? '...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// --- Main component -----------------------------------------------------------

export default function SessionActions({
  sessionId, currentStatus, serviceType,
  outfitsCount, invoiceId, sessions, availableStaff, driveLink,
}: SessionActionsProps) {
  const router  = useRouter()
  const config  = useStudioConfig()
  const [loading, setLoading]               = useState(false)
  const [showDriveForm, setShowDriveForm]   = useState(false)
  const [driveLinkValue, setDriveLinkValue] = useState(driveLink)
  const [selectionCount, setSelectionCount] = useState('')
  const [extraAmount, setExtraAmount]       = useState('')
  const [showExtra, setShowExtra]           = useState(false)

  const bookingId = sessionId;

  const currentStatusCfg = getStatusConfig(config, currentStatus)
  const cancelStatusCfg  = getCancellationStatus(config)
  const isCancellation   = !!currentStatusCfg.is_cancellation
  const isTerminal       = !!currentStatusCfg.is_terminal
  const isSelectionStage = !!currentStatusCfg.requires_selection_count

  // All non-cancellation statuses available for the status picker
  const selectableStatuses = config.bookingStatuses
    .filter(s => !s.is_cancellation)
    .map(s => ({ value: s.value, label: s.label }))

  const baseImages     = (outfitsCount ?? 0) * 2
  const selCount       = parseInt(selectionCount) || 0
  const extraImages    = Math.max(0, selCount - baseImages)
  const hasExtraImages = outfitsCount != null && baseImages > 0 && selCount > baseImages

  // Show drive link btn for any non-early stage
  const firstTwoStatuses = config.bookingStatuses.filter(s => !s.is_cancellation).slice(0, 2).map(s => s.value)
  const showDriveBtn     = !firstTwoStatuses.includes(currentStatus) && !isCancellation

  async function handleStatus(next: string) {
    setLoading(true)
    const { error } = await changeBookingStatus(bookingId, next)
    if (error) toast.error(error)
    else toast.success('Status updated')
    router.refresh()
    setLoading(false)
  }

  async function handleSaveDriveLink() {
    setLoading(true)
    const { error } = await updateSessionDriveLink(bookingId, driveLinkValue)
    if (error) toast.error(error)
    else { toast.success('Drive link saved'); setShowDriveForm(false); router.refresh() }
    setLoading(false)
  }

  async function handleAssignStaff(specificSessionId: string, staffId: string, role: string) {
    setLoading(true)
    const { error } = await assignSessionStaff(specificSessionId, bookingId, staffId, role) 
    if (error) toast.error(error)
    else { toast.success('Staff assigned'); router.refresh() }
    setLoading(false)
  }

  async function handleRemoveStaff(specificSessionId: string, staffId: string) {
    setLoading(true)
    const { error } = await removeSessionStaff(specificSessionId, bookingId, staffId)
    if (error) toast.error(error)
    else { toast.success('Staff removed'); router.refresh() }
    setLoading(false)
  }

  async function handleRecordSelections() {
    if (!selCount || selCount <= 0) { toast.error('Enter a valid selection count'); return }
    setLoading(true)
    if (showExtra && extraAmount && invoiceId) {
      const extra = parseFloat(extraAmount)
      if (extra > 0) {
        const { error: chargeErr } = await addExtraCharge(invoiceId, extra)
        if (chargeErr) { toast.error(chargeErr); setLoading(false); return }
      }
    }
    const { error } = await recordSelections(bookingId, selCount)
    if (error) toast.error(error)
    else { toast.success('Selections recorded'); router.refresh() }
    setLoading(false)
  }

  return (
    <div className="glass-panel animate-enter" style={{ padding: '1.5rem', animationDelay: '0.4s', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {!isCancellation && !isTerminal && (
        <StatusPicker current={currentStatus} statuses={selectableStatuses} onUpdate={handleStatus} loading={loading} />
      )}

      {isSelectionStage && (
        <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 10px' }}>RECORD SELECTIONS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input type="number" value={selectionCount} onChange={e => setSelectionCount(e.target.value)}
              placeholder={`Client selected... (Base: ${baseImages})`}
              style={{ width: '100%', boxSizing: 'border-box' }} className="input-field" />
            
            {hasExtraImages && (
              <div style={{ background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line-inner)' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: '0 0 8px' }}>
                  Client selected <strong style={{ color: '#e24b4a' }}>{extraImages}</strong> extra images!
                </p>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showExtra} onChange={e => setShowExtra(e.target.checked)} />
                  Add extra charge to invoice?
                </label>
                {showExtra && (
                  <div style={{ marginTop: '8px' }}>
                    <input type="number" value={extraAmount} onChange={e => setExtraAmount(e.target.value)}
                      placeholder="Amount (?)"
                      className="input-field" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
            )}
            <button onClick={handleRecordSelections} disabled={loading || !selectionCount} style={btnStyle(false)}>
              {loading ? '...' : 'Save & Notify Editors'}
            </button>
          </div>
        </div>
      )}

      {showDriveBtn && (
        <>
          {!showDriveForm && !driveLink ? (
            <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px' }}>
              <button onClick={() => setShowDriveForm(true)} style={{ ...btnStyle(false), width: '100%' }}>
                + Add Drive Link
              </button>
            </div>
          ) : (
            <DriveLinkForm value={driveLinkValue} onChange={setDriveLinkValue} onSave={handleSaveDriveLink} loading={loading} />
          )}
        </>
      )}

      {/* Map over sessions to allow assigning staff to specific sessions */}
      {sessions.map(sess => (
        <StaffPanel 
          key={sess.session_id}
          sessionName={sess.shoot_type || sess.session_type || 'Session'}
          assigned={(sess.staff ?? []).map(s => ({ staff_id: s.staff_id || '', full_name: s.staff_name || '', role: s.role || '' }))}
          availableStaff={availableStaff}
          onAssign={(staffId, role) => handleAssignStaff(sess.session_id, staffId, role)}
          onRemove={(staffId) => handleRemoveStaff(sess.session_id, staffId)}
          loading={loading}
          serviceType={serviceType}
        />
      ))}

    </div>
  )
}
