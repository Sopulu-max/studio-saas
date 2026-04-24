'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useStudioConfig } from '@/components/studio-config-provider'
import { getNextStatus, getCancellationStatus, getStatusConfig } from '@/lib/studio-config'
import {
  updateSessionStatus,
  updateSessionDriveLink,
  assignSessionStaff,
  removeSessionStaff,
  recordSelections,
} from '@/app/actions/sessions'
import { addExtraCharge } from '@/app/actions/invoices'

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffMember   = { staff_id: string; full_name: string; role?: string }
type AssignedStaff = { staff_id: string; full_name: string; role: string }

interface SessionActionsProps {
  sessionId:      string
  currentStatus:  string
  serviceType:    string
  outfitsCount:   number | null
  invoiceId:      string | null
  assignedStaff:  AssignedStaff[]
  availableStaff: StaffMember[]
  driveLink:      string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function btnStyle(primary: boolean, danger?: boolean): React.CSSProperties {
  if (danger)  return { background: 'transparent', color: '#e24b4a', border: '0.5px solid #f09595', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
  if (primary) return { background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
  return { background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', padding: '8px 18px', fontSize: '14px', borderRadius: '8px', cursor: 'pointer' }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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
              <span style={{ fontSize: '13px', color: 'var(--text-1)' }}>✓ {s.full_name}</span>
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
            <option value="">Assign {roleLabel}…</option>
            {availableStaff.map(s => (
              <option key={s.staff_id} value={s.staff_id}>{s.full_name}</option>
            ))}
          </select>
          <button
            onClick={() => { if (selected) { onAssign(selected, roleValue); setSelected('') } }}
            disabled={!selected || loading}
            style={{ padding: '7px 12px', fontSize: '12px', background: 'var(--btn)', color: 'var(--btn-fg)', border: 'none', borderRadius: '7px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}
          >
            {loading ? '…' : 'Assign'}
          </button>
        </div>
      )}
    </div>
  )
}

function StaffPanel({ assigned, availableStaff, onAssign, onRemove, loading, isVideoSession }: {
  assigned:       AssignedStaff[]
  availableStaff: StaffMember[]
  onAssign:       (staffId: string, role: string) => Promise<void>
  onRemove:       (staffId: string) => Promise<void>
  loading:        boolean
  isVideoSession: boolean
}) {
  const shooterLabel = isVideoSession ? 'Videographer' : 'Photographer'
  const editorLabel  = isVideoSession ? 'Video editor' : 'Editor / retoucher'

  return (
    <div style={{ borderTop: '1px solid var(--line-inner)', paddingTop: '16px', marginTop: '16px' }}>
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)', margin: '0 0 12px' }}>Staff</p>
      <StaffRoleRow
        roleValue="photographer" roleLabel={shooterLabel}
        assigned={assigned} availableStaff={availableStaff}
        onAssign={onAssign} onRemove={onRemove} loading={loading}
      />
      <StaffRoleRow
        roleValue="colour_grader" roleLabel="Colour grader"
        assigned={assigned} availableStaff={availableStaff}
        onAssign={onAssign} onRemove={onRemove} loading={loading}
      />
      <StaffRoleRow
        roleValue="editor" roleLabel={editorLabel}
        assigned={assigned} availableStaff={availableStaff}
        onAssign={onAssign} onRemove={onRemove} loading={loading}
      />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SessionActions({
  sessionId, currentStatus, serviceType,
  outfitsCount, invoiceId, assignedStaff, availableStaff, driveLink,
}: SessionActionsProps) {
  const router  = useRouter()
  const config  = useStudioConfig()
  const [loading, setLoading]               = useState(false)
  const [showDriveForm, setShowDriveForm]   = useState(false)
  const [driveLinkValue, setDriveLinkValue] = useState(driveLink)
  const [selectionCount, setSelectionCount] = useState('')
  const [extraAmount, setExtraAmount]       = useState('')
  const [showExtra, setShowExtra]           = useState(false)

  const currentStatusCfg = getStatusConfig(config, currentStatus)
  const nextStatusCfg    = getNextStatus(config, currentStatus)
  const cancelStatusCfg  = getCancellationStatus(config)
  const isVideoSession   = serviceType === 'video' || serviceType === 'photo_video'
  const isTerminal       = !!currentStatusCfg.is_terminal
  const isCancellation   = !!currentStatusCfg.is_cancellation
  const isSelectionStage = !!currentStatusCfg.requires_selection_count

  const baseImages     = (outfitsCount ?? 0) * 2
  const selCount       = parseInt(selectionCount) || 0
  const extraImages    = Math.max(0, selCount - baseImages)
  const hasExtraImages = outfitsCount != null && baseImages > 0 && selCount > baseImages

  // Show drive link btn for any non-early stage
  const firstTwoStatuses = config.bookingStatuses.filter(s => !s.is_cancellation).slice(0, 2).map(s => s.value)
  const showDriveBtn     = !firstTwoStatuses.includes(currentStatus) && !isCancellation

  async function handleStatus(next: string) {
    setLoading(true)
    const { error } = await updateSessionStatus(sessionId, next)
    if (error) toast.error(error)
    else toast.success('Status updated')
    router.refresh()
    setLoading(false)
  }

  async function handleSaveDriveLink() {
    setLoading(true)
    const { error } = await updateSessionDriveLink(sessionId, driveLinkValue)
    if (error) toast.error(error)
    else { toast.success('Drive link saved'); setShowDriveForm(false); router.refresh() }
    setLoading(false)
  }

  async function handleAssignStaff(staffId: string, role: string) {
    setLoading(true)
    const { error } = await assignSessionStaff(sessionId, staffId, role)
    if (error) toast.error(error)
    else { toast.success('Staff assigned'); router.refresh() }
    setLoading(false)
  }

  async function handleRemoveStaff(staffId: string) {
    setLoading(true)
    const { error } = await removeSessionStaff(sessionId, staffId)
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
    const { error } = await recordSelections(sessionId, selCount)
    if (error) toast.error(error)
    else { toast.success('Selections recorded'); router.refresh() }
    setLoading(false)
  }

  const staffPanelProps = {
    assigned: assignedStaff,
    availableStaff,
    onAssign: handleAssignStaff,
    onRemove: handleRemoveStaff,
    loading,
    isVideoSession,
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (isCancellation) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>This session has been cancelled.</p>
      </div>
    )
  }

  // ── Terminal success ───────────────────────────────────────────────────────
  if (isTerminal) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>
        <p style={{ fontSize: '13px', color: '#3b6d11', margin: '0 0 12px' }}>{currentStatusCfg.label} ✓</p>
        <button onClick={() => setShowDriveForm(v => !v)} style={btnStyle(false)}>
          {showDriveForm ? 'Cancel' : driveLink ? 'Update Drive link' : 'Add Drive link'}
        </button>
        {showDriveForm && (
          <DriveLinkForm value={driveLinkValue} onChange={setDriveLinkValue} onSave={handleSaveDriveLink} loading={loading} />
        )}
        <StaffPanel {...staffPanelProps} />
      </div>
    )
  }

  // ── Selection stage ────────────────────────────────────────────────────────
  if (isSelectionStage) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>RECORD SELECTIONS</p>
        {outfitsCount != null && (
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '0 0 12px' }}>
            {outfitsCount} outfit{outfitsCount !== 1 ? 's' : ''} → base of {baseImages} images included
          </p>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', color: 'var(--text-2)', display: 'block' as const, marginBottom: '5px' }}>
            How many images did the client select?
          </label>
          <input type="number" min="1" value={selectionCount}
            onChange={e => { setSelectionCount(e.target.value); setShowExtra(false); setExtraAmount('') }}
            placeholder="e.g. 24" style={{ width: '100%', boxSizing: 'border-box' as const }} />
        </div>
        {hasExtraImages && selCount > 0 && (
          <div style={{ background: '#faeeda', borderRadius: '8px', padding: '12px', marginBottom: '12px', fontSize: '13px' }}>
            <p style={{ margin: '0 0 6px', color: '#854f0b', fontWeight: '500' }}>
              {extraImages} extra image{extraImages !== 1 ? 's' : ''} above base
            </p>
            {invoiceId ? (
              !showExtra ? (
                <button onClick={() => setShowExtra(true)}
                  style={{ fontSize: '12px', color: '#854f0b', background: 'transparent', border: '0.5px solid #c9943a', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                  Add extra charge to invoice
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input type="number" min="0" value={extraAmount} onChange={e => setExtraAmount(e.target.value)}
                    placeholder="Extra amount (₦)" style={{ flex: 1, boxSizing: 'border-box' as const }} />
                  <button onClick={() => { setShowExtra(false); setExtraAmount('') }}
                    style={{ fontSize: '12px', color: 'var(--text-3)', background: 'transparent', border: '1px solid var(--line)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}>
                    Skip
                  </button>
                </div>
              )
            ) : (
              <p style={{ margin: 0, color: 'var(--text-3)' }}>Create an invoice first to add an extra charge.</p>
            )}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
          <button onClick={handleRecordSelections} disabled={loading || !selectionCount} style={btnStyle(true)}>
            {loading ? '...' : nextStatusCfg ? `Confirm & move to ${nextStatusCfg.label}` : 'Confirm selections'}
          </button>
          {showDriveBtn && (
            <button onClick={() => setShowDriveForm(v => !v)} style={btnStyle(false)}>
              {showDriveForm ? 'Cancel' : driveLink ? 'Update Drive link' : 'Add Drive link'}
            </button>
          )}
        </div>
        {showDriveForm && (
          <DriveLinkForm value={driveLinkValue} onChange={setDriveLinkValue} onSave={handleSaveDriveLink} loading={loading} />
        )}
        <StaffPanel {...staffPanelProps} />
      </div>
    )
  }

  // ── All other statuses ─────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.5rem' }}>
      <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>ACTIONS</p>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
        {nextStatusCfg && (
          <button onClick={() => handleStatus(nextStatusCfg.value)} disabled={loading} style={btnStyle(true)}>
            {loading ? '...' : `Move to ${nextStatusCfg.label}`}
          </button>
        )}
        {showDriveBtn && (
          <button onClick={() => setShowDriveForm(v => !v)} style={btnStyle(false)}>
            {showDriveForm ? 'Cancel' : driveLink ? 'Update Drive link' : 'Add Drive link'}
          </button>
        )}
        {cancelStatusCfg && (
          <button onClick={() => handleStatus(cancelStatusCfg.value)} disabled={loading}
            style={{ ...btnStyle(false), marginLeft: 'auto', color: '#e24b4a', borderColor: '#f09595' }}>
            Cancel session
          </button>
        )}
      </div>

      {showDriveForm && (
        <DriveLinkForm value={driveLinkValue} onChange={setDriveLinkValue} onSave={handleSaveDriveLink} loading={loading} />
      )}

      <StaffPanel {...staffPanelProps} />
    </div>
  )
}
