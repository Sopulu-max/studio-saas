'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { saveCheckin, deleteCheckin } from '@/app/actions/attendance'

// ─── Types ────────────────────────────────────────────────────────────────────

import { AttendanceRecordDTO } from '@/lib/domains/attendance/types'

export type StaffOption = { staff_id: string; full_name: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}
function duration(inIso: string, outIso: string) {
  const mins = Math.round((new Date(outIso).getTime() - new Date(inIso).getTime()) / 60000)
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
function toHHMM(iso: string) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function nowHHMM() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function todayISO() { return new Date().toISOString().slice(0,10) }

// ─── Add/Edit modal ───────────────────────────────────────────────────────────

function RecordModal({
  staff,
  initial,
  onClose,
}: {
  staff:   StaffOption[]
  initial: Partial<AttendanceRecordDTO> | null   // null = new record
  onClose: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err,  setErr]   = useState('')
  const [form, setForm]  = useState({
    staffId:      initial?.staff_id       ?? '',
    date:         initial?.date           ?? todayISO(),
    checkedInAt:  initial?.checked_in_at  ? toHHMM(initial.checked_in_at)  : nowHHMM(),
    checkedOutAt: initial?.checked_out_at ? toHHMM(initial.checked_out_at) : '',
  })

  function upd(k: keyof typeof form, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function handleSave() {
    if (!form.staffId) { setErr('Select a staff member'); return }
    if (!form.date)    { setErr('Date is required'); return }
    if (!form.checkedInAt) { setErr('Check-in time is required'); return }
    setErr('')
    start(async () => {
      const res = await saveCheckin({
        staffId:      form.staffId,
        date:         form.date,
        checkedInAt:  form.checkedInAt,
        checkedOutAt: form.checkedOutAt || undefined,
      })
      if (res.error) { setErr(res.error); return }
      router.refresh()
      onClose()
    })
  }

  const labelStyle = { fontSize: '13px', color: 'var(--text-2)', display: 'block', marginBottom: '5px' }
  const inputStyle = { width: '100%', boxSizing: 'border-box' as const }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
    }}>
      <div className="glass-panel" style={{
        padding: '1.5rem', width: '100%', maxWidth: '400px',
        boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      }}>
        <h2 style={{ fontSize: '17px', fontWeight: '600', margin: '0 0 1.25rem' }}>
          {initial ? 'Edit record' : 'Add record'}
        </h2>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Staff member <span style={{ color: '#e24b4a' }}>*</span></label>
          <select value={form.staffId} onChange={e => upd('staffId', e.target.value)} style={inputStyle} disabled={!!initial}>
            <option value="">Select staff…</option>
            {staff.map(s => <option key={s.staff_id} value={s.staff_id}>{s.full_name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={labelStyle}>Date <span style={{ color: '#e24b4a' }}>*</span></label>
          <input type="date" value={form.date} onChange={e => upd('date', e.target.value)}
            max={todayISO()} style={inputStyle} disabled={!!initial} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
          <div>
            <label style={labelStyle}>Check-in time <span style={{ color: '#e24b4a' }}>*</span></label>
            <input type="time" value={form.checkedInAt} onChange={e => upd('checkedInAt', e.target.value)} style={inputStyle} />
            {form.checkedInAt && isLate(new Date(form.date + 'T' + form.checkedInAt).toISOString()) && (
              <p style={{ fontSize: '11px', color: '#a32d2d', margin: '4px 0 0', fontWeight: '600' }}>LATE (after 08:30)</p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Check-out time</label>
            <input type="time" value={form.checkedOutAt} onChange={e => upd('checkedOutAt', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {err && <p style={{ fontSize: '13px', color: '#e24b4a', margin: '0 0 12px' }}>{err}</p>}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleSave} disabled={pending}
            style={{ flex: 1, padding: '10px', background: '#111', color: '#fff', border: '1px solid #111', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', opacity: pending ? 0.6 : 1 }}>
            {pending ? 'Saving…' : 'Save record'}
          </button>
          <button onClick={onClose}
            style={{ padding: '10px 16px', background: 'transparent', color: 'var(--text-2)', border: '1px solid var(--line)', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main table ───────────────────────────────────────────────────────────────

export default function RecordsTable({
  records,
  staff,
  initialFrom,
  initialTo,
  initialStaffId,
}: {
  records:        AttendanceRecordDTO[]
  staff:          StaffOption[]
  initialFrom:    string
  initialTo:      string
  initialStaffId: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()

  // Filters (changes reload the page via router)
  const [from,    setFrom]    = useState(initialFrom)
  const [to,      setTo]      = useState(initialTo)
  const [staffId, setStaffId] = useState(initialStaffId)

  // Modal state
  const [modal, setModal] = useState<'add' | AttendanceRecordDTO | null>(null)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function applyFilters() {
    const p = new URLSearchParams()
    if (from)    p.set('from', from)
    if (to)      p.set('to', to)
    if (staffId) p.set('staff', staffId)
    router.push(`/dashboard/attendance/records?${p.toString()}`)
  }

  function handleDelete(checkinId: string) {
    start(async () => {
      const res = await deleteCheckin(checkinId)
      if (!res.error) {
        router.refresh()
        setConfirmDelete(null)
      }
    })
  }

  // Stats
  const total   = records.length
  const late    = records.filter(r => isLate(r.checked_in_at)).length
  const onTime  = total - late
  const withOut = records.filter(r => r.checked_out_at)
  const avgMins = withOut.length
    ? Math.round(withOut.reduce((s, r) => {
        const d = new Date(r.checked_in_at)
        return s + d.getHours() * 60 + d.getMinutes()
      }, 0) / withOut.length)
    : null
  const avgArrival = avgMins != null
    ? `${String(Math.floor(avgMins / 60)).padStart(2,'0')}:${String(avgMins % 60).padStart(2,'0')}`
    : null

  const inputStyle = { padding: '7px 10px', fontSize: '13px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)' }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} max={todayISO()} style={inputStyle} />
        </div>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Staff member</label>
          <select value={staffId} onChange={e => setStaffId(e.target.value)} style={inputStyle}>
            <option value="">All staff</option>
            {staff.map(s => <option key={s.staff_id} value={s.staff_id}>{s.full_name}</option>)}
          </select>
        </div>
        <button onClick={applyFilters}
          style={{ padding: '7px 16px', fontSize: '13px', background: '#111', color: '#fff', border: '1px solid #111', borderRadius: '8px', cursor: 'pointer' }}>
          Apply
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal('add')}
          className="glass-panel" style={{ padding: '7px 16px', fontSize: '13px', color: 'var(--text-2)', cursor: 'pointer' }}>
          + Add record
        </button>
      </div>

      {/* Summary tiles */}
      {total > 0 && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {[
            { label: 'Total records', value: total,                    bg: 'var(--surface)', color: 'var(--text)' },
            { label: 'On time',       value: onTime,                   bg: '#eaf3de',        color: '#3b6d11' },
            { label: 'Late arrivals', value: late,                     bg: '#fcebeb',        color: '#a32d2d' },
            { label: 'Avg arrival',   value: avgArrival ?? '—',        bg: 'var(--surface)', color: 'var(--text-2)' },
          ].map(s => (
            <div key={s.label} style={{ flex: '1 1 100px', padding: '12px 14px', borderRadius: '10px', background: s.bg, border: '1px solid var(--line)' }}>
              <p style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 2px', color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {total === 0 ? (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-4)', margin: 0 }}>No records found for this period.</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr 0.7fr 0.8fr 80px', gap: '0', borderBottom: '1px solid var(--line)', padding: '10px 16px' }} className="att-row">
            {['Staff', 'Date', 'Check-in', 'Check-out', 'Duration', 'Status', ''].map(h => (
              <p key={h} style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', margin: 0, textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</p>
            ))}
          </div>

          {records.map((r, i) => {
            const late   = isLate(r.checked_in_at)
            const dur    = r.checked_out_at ? duration(r.checked_in_at, r.checked_out_at) : null
            const roles: string[] = r.staff?.roles ?? []
            return (
              <div
                key={r.checkin_id}
                style={{
                  display: 'grid', gridTemplateColumns: '1.6fr 1.2fr 1fr 1fr 0.7fr 0.8fr 80px',
                  gap: '0', alignItems: 'center', padding: '11px 16px',
                  borderBottom: i < records.length - 1 ? '1px solid var(--line-inner)' : 'none',
                  background: confirmDelete === r.checkin_id ? '#fcebeb' : 'transparent',
                }}
                className="att-row"
              >
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '500', margin: '0 0 1px' }}>{r.staff?.full_name ?? '—'}</p>
                  {roles.length > 0 && <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>{roles[0].replace(/_/g, ' ')}</p>}
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>{fmtDate(r.date)}</p>
                <p style={{ fontSize: '13px', margin: 0, color: late ? '#a32d2d' : 'var(--text)', fontWeight: late ? '600' : '400' }}>
                  {fmtTime(r.checked_in_at)}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-2)', margin: 0 }}>
                  {r.checked_out_at ? fmtTime(r.checked_out_at) : <span style={{ color: 'var(--text-4)' }}>—</span>}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{dur ?? '—'}</p>
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500',
                  background: late ? '#fcebeb' : '#eaf3de',
                  color:      late ? '#a32d2d' : '#3b6d11',
                  width: 'fit-content',
                }}>
                  {late ? 'Late' : 'On time'}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                  {confirmDelete === r.checkin_id ? (
                    <>
                      <button onClick={() => handleDelete(r.checkin_id)} disabled={pending}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: '#a32d2d', color: '#fff', border: 'none', cursor: 'pointer', opacity: pending ? 0.6 : 1 }}>
                        {pending ? '…' : 'Yes'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                        No
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setModal(r)} title="Edit"
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)', cursor: 'pointer' }}>
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete(r.checkin_id)} title="Delete"
                        style={{ padding: '4px 8px', fontSize: '11px', borderRadius: '6px', background: 'transparent', color: '#a32d2d', border: '1px solid #f0c0c0', cursor: 'pointer' }}>
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Style override for smaller screens */}
      <style>{`
        @media (max-width: 700px) {
          .att-row { grid-template-columns: 1fr 1fr 0.8fr 0.8fr 60px !important; }
          .att-row :nth-child(5),
          .att-row :nth-child(6) { display: none !important; }
        }
      `}</style>

      {/* Modal */}
      {modal && (
        <RecordModal
          staff={staff}
          initial={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}
