'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { checkIn, checkOut } from '@/app/actions/attendance'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

const DAY_LABELS: Record<string, string> = {
  monday:    'Mon',
  tuesday:   'Tue',
  wednesday: 'Wed',
  thursday:  'Thu',
  friday:    'Fri',
  saturday:  'Sat',
  sunday:    'Sun',
}

const ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

// Studio opens at 08:30 — arrivals after this are flagged as late
const LATE_HOUR   = 8
const LATE_MINUTE = 30

type StaffRow = {
  staff_id:     string
  full_name:    string
  roles:        string[] | null
  working_days: string[] | null
  checkin: {
    checkin_id:      string
    checked_in_at:   string
    checked_out_at:  string | null
  } | null
}

/** Format an ISO timestamp to HH:MM local time */
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

/** Return "HH:MM" string for right now in local time — used to pre-fill time inputs */
function nowTimeString() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Convert a local "HH:MM" string + today's date to an ISO timestamp */
function localTimeToISO(hhmm: string): string {
  const [h, m]  = hhmm.split(':').map(Number)
  const d       = new Date()
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_HOUR || (d.getHours() === LATE_HOUR && d.getMinutes() > LATE_MINUTE)
}

function WorkingDayPips({ days, todayDay }: { days: string[]; todayDay: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
      {ALL_DAYS.map(d => {
        const active  = days.includes(d)
        const isToday = d === todayDay
        return (
          <span key={d} title={d.charAt(0).toUpperCase() + d.slice(1)} style={{
            fontSize: '9px', fontWeight: '600', padding: '2px 4px', borderRadius: '4px', letterSpacing: '.02em',
            background: active ? (isToday ? '#111' : 'var(--active)') : 'var(--line)',
            color:      active ? (isToday ? '#fff' : 'var(--text-2)') : 'var(--text-4)',
          }}>
            {DAY_LABELS[d]}
          </span>
        )
      })}
    </div>
  )
}

function StaffCard({ member, todayDay, onUpdate }: {
  member:   StaffRow
  todayDay: string
  onUpdate: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [err,     setErr]          = useState('')
  // 'idle' | 'entering-in' | 'entering-out'
  const [mode,    setMode]         = useState<'idle' | 'entering-in' | 'entering-out'>('idle')
  const [timeVal, setTimeVal]      = useState(nowTimeString)

  const workingDays = member.working_days ?? []
  const worksToday  = workingDays.length === 0 || workingDays.includes(todayDay)
  const checkin     = member.checkin
  const checkedIn   = !!checkin
  const checkedOut  = !!checkin?.checked_out_at
  const late        = checkedIn && isLate(checkin!.checked_in_at)

  const effectiveRoles =
    member.roles && member.roles.length > 0
      ? member.roles
      : ['—']

  function handleConfirmIn() {
    setErr('')
    startTransition(async () => {
      const res = await checkIn(member.staff_id, localTimeToISO(timeVal))
      if (res.error) { setErr(res.error); return }
      setMode('idle')
      onUpdate()
    })
  }

  function handleConfirmOut() {
    setErr('')
    startTransition(async () => {
      const res = await checkOut(member.staff_id, localTimeToISO(timeVal))
      if (res.error) { setErr(res.error); return }
      setMode('idle')
      onUpdate()
    })
  }

  // status pill
  let statusBg    = 'var(--line)'
  let statusColor = 'var(--text-4)'
  let statusLabel = 'Off today'

  if (!worksToday) {
    statusLabel = 'Day off'
  } else if (checkedOut) {
    statusBg = '#eaf3de'; statusColor = '#3b6d11'; statusLabel = 'Checked out'
  } else if (checkedIn) {
    statusBg = '#e6f1fb'; statusColor = '#185fa5'; statusLabel = 'Checked in'
  } else {
    statusBg = '#faeeda'; statusColor = '#854f0b'; statusLabel = 'Not in yet'
  }

  return (
    <div className="glass-panel" style={{
      padding: '16px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {/* Avatar */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
          background: 'var(--active)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '16px', fontWeight: '600', color: 'var(--text-2)',
        }}>
          {member.full_name.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{member.full_name}</p>
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusBg, color: statusColor, fontWeight: '500' }}>
              {statusLabel}
            </span>
            {late && !checkedOut && (
              <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#fcebeb', color: '#a32d2d', fontWeight: '600' }}>
                LATE
              </span>
            )}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
            {effectiveRoles.map(r => r.replace(/_/g, ' ')).join(', ')}
          </p>

          {workingDays.length > 0 && (
            <WorkingDayPips days={workingDays} todayDay={todayDay} />
          )}

          {/* Check-in / out times */}
          {checkedIn && (
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '6px 0 0' }}>
              In: <strong style={{ color: late ? '#a32d2d' : 'var(--text-2)' }}>{fmtTime(checkin!.checked_in_at)}</strong>
              {checkedOut && (
                <> &nbsp;·&nbsp; Out: <strong style={{ color: 'var(--text-2)' }}>{fmtTime(checkin!.checked_out_at!)}</strong></>
              )}
            </p>
          )}

          {err && <p style={{ fontSize: '12px', color: '#e24b4a', margin: '4px 0 0' }}>{err}</p>}
        </div>

        {/* Action button — only shown when not in time-entry mode */}
        {mode === 'idle' && worksToday && !checkedOut && (
          <button
            onClick={() => {
              setTimeVal(nowTimeString())
              setMode(checkedIn ? 'entering-out' : 'entering-in')
            }}
            style={{
              flexShrink: 0, padding: '7px 14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
              background: checkedIn ? 'var(--surface)' : '#111',
              color:      checkedIn ? 'var(--text-2)' : '#fff',
              border:     checkedIn ? '1px solid var(--line)' : '1px solid #111',
            }}
          >
            {checkedIn ? 'Check out' : 'Check in'}
          </button>
        )}
      </div>

      {/* Inline time-entry row */}
      {mode !== 'idle' && (
        <div style={{
          marginTop: '12px', paddingTop: '12px',
          borderTop: '1px solid var(--line-inner)',
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
        }}>
          <label style={{ fontSize: '13px', color: 'var(--text-3)' }}>
            {mode === 'entering-in' ? 'Check-in time' : 'Check-out time'}
          </label>
          <input
            type="time"
            value={timeVal}
            onChange={e => setTimeVal(e.target.value)}
            style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)', width: '120px' }}
          />
          {mode === 'entering-in' && isLate(localTimeToISO(timeVal)) && (
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#fcebeb', color: '#a32d2d', fontWeight: '600' }}>
              LATE (after 08:30)
            </span>
          )}
          <button
            onClick={mode === 'entering-in' ? handleConfirmIn : handleConfirmOut}
            disabled={pending}
            style={{
              padding: '7px 16px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
              background: '#111', color: '#fff', border: '1px solid #111',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? '…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setMode('idle'); setErr('') }}
            style={{ padding: '7px 12px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer', background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--line)' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export default function AttendanceBoard({
  staff,
  todayLabel,
  todayDay,
}: {
  staff:      StaffRow[]
  todayLabel: string
  todayDay:   string
}) {
  const [, setRefreshKey] = useState(0)
  function onUpdate() { setRefreshKey(k => k + 1) }

  const working  = staff.filter(m => !m.working_days?.length || m.working_days.includes(todayDay))
  const offToday = staff.filter(m => m.working_days?.length && !m.working_days.includes(todayDay))

  const checkedIn  = working.filter(m => m.checkin && !m.checkin.checked_out_at).length
  const checkedOut = working.filter(m => m.checkin?.checked_out_at).length
  const late       = working.filter(m => m.checkin && !m.checkin.checked_out_at && isLate(m.checkin.checked_in_at)).length
  const notIn      = working.filter(m => !m.checkin).length

  return (
    <div>
      {/* Summary tiles */}
      <AnimatedList style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Expected in', value: working.length, bg: 'var(--surface)',  color: 'var(--text)' },
          { label: 'Checked in',  value: checkedIn,      bg: '#e6f1fb',         color: '#185fa5' },
          { label: 'Checked out', value: checkedOut,     bg: '#eaf3de',         color: '#3b6d11' },
          { label: 'Late',        value: late,           bg: '#fcebeb',         color: '#a32d2d' },
          { label: 'Not in yet',  value: notIn,          bg: '#faeeda',         color: '#854f0b' },
        ].map((s, i) => (
          <AnimatedItem key={s.label} delay={i * 0.05} style={{ flex: '1 1 100px' }}>
            <div style={{
              padding: '12px 14px', borderRadius: '10px',
              background: s.bg, border: '1px solid var(--line)',
              height: '100%'
            }}>
              <p style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 2px', color: s.color }}>{s.value}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: 0 }}>{s.label}</p>
            </div>
          </AnimatedItem>
        ))}
      </AnimatedList>

      {/* Note about late threshold */}
      <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 20px' }}>
        Studio opens at <strong>08:30</strong> — arrivals after that are marked late.
      </p>

      {/* Working today */}
      {working.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>
            Working today — {todayLabel}
          </p>
          <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {working.map((m, i) => (
              <AnimatedItem key={m.staff_id} delay={i * 0.05}>
                <StaffCard member={m} todayDay={todayDay} onUpdate={onUpdate} />
              </AnimatedItem>
            ))}
          </AnimatedList>
        </div>
      )}

      {/* Off today */}
      {offToday.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>
            Day off today
          </p>
          <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {offToday.map((m, i) => (
              <AnimatedItem key={m.staff_id} delay={i * 0.05}>
                <StaffCard member={m} todayDay={todayDay} onUpdate={onUpdate} />
              </AnimatedItem>
            ))}
          </AnimatedList>
        </div>
      )}

      {staff.length === 0 && (
        <p style={{ fontSize: '14px', color: 'var(--text-4)', padding: '2rem 0' }}>
          No staff members yet.{' '}
          <Link href="/dashboard/staff/new" style={{ color: 'var(--btn)', textDecoration: 'none' }}>
            Add your first team member →
          </Link>
        </p>
      )}
    </div>
  )
}
