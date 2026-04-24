'use client'

import { useState, useTransition } from 'react'
import { checkIn, checkOut } from '@/app/actions/attendance'

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

type StaffRow = {
  staff_id:     string
  full_name:    string
  role:         string | null
  roles:        string[] | null
  working_days: string[] | null
  checkin: {
    checkin_id:      string
    checked_in_at:   string
    checked_out_at:  string | null
  } | null
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

function WorkingDayPips({ days, todayDay }: { days: string[]; todayDay: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
      {ALL_DAYS.map(d => {
        const active = days.includes(d)
        const isToday = d === todayDay
        return (
          <span key={d} title={d.charAt(0).toUpperCase() + d.slice(1)} style={{
            fontSize: '9px',
            fontWeight: '600',
            padding: '2px 4px',
            borderRadius: '4px',
            letterSpacing: '.02em',
            background: active
              ? isToday ? '#111' : 'var(--active)'
              : 'var(--line)',
            color: active
              ? isToday ? '#fff' : 'var(--text-2)'
              : 'var(--text-4)',
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
  const [err, setErr] = useState('')

  const workingDays = member.working_days ?? []
  const worksToday  = workingDays.length === 0 || workingDays.includes(todayDay)
  const checkin     = member.checkin
  const checkedIn   = !!checkin
  const checkedOut  = !!checkin?.checked_out_at

  const effectiveRoles =
    member.roles && member.roles.length > 0
      ? member.roles
      : member.role ? [member.role] : ['—']

  function handleCheckIn() {
    setErr('')
    startTransition(async () => {
      const res = await checkIn(member.staff_id)
      if (res.error) setErr(res.error)
      else onUpdate()
    })
  }

  function handleCheckOut() {
    setErr('')
    startTransition(async () => {
      const res = await checkOut(member.staff_id)
      if (res.error) setErr(res.error)
      else onUpdate()
    })
  }

  // status pill
  let statusBg    = 'var(--line)'
  let statusColor = 'var(--text-4)'
  let statusLabel = 'Off today'

  if (!worksToday) {
    statusLabel = 'Day off'
  } else if (checkedOut) {
    statusBg    = '#eaf3de'
    statusColor = '#3b6d11'
    statusLabel = 'Checked out'
  } else if (checkedIn) {
    statusBg    = '#e6f1fb'
    statusColor = '#185fa5'
    statusLabel = 'Checked in'
  } else {
    statusBg    = '#faeeda'
    statusColor = '#854f0b'
    statusLabel = 'Not in yet'
  }

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
    }}>
      {/* Avatar circle */}
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
        background: 'var(--active)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '16px', fontWeight: '600', color: 'var(--text-2)',
      }}>
        {member.full_name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{member.full_name}</p>
          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusBg, color: statusColor, fontWeight: '500' }}>
            {statusLabel}
          </span>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>
          {effectiveRoles.map(r => r.replace(/_/g, ' ')).join(', ')}
        </p>

        {workingDays.length > 0 && (
          <WorkingDayPips days={workingDays} todayDay={todayDay} />
        )}

        {/* Times */}
        {checkedIn && (
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '6px 0 0' }}>
            In: <strong style={{ color: 'var(--text-2)' }}>{fmt(checkin!.checked_in_at)}</strong>
            {checkedOut && (
              <> &nbsp;·&nbsp; Out: <strong style={{ color: 'var(--text-2)' }}>{fmt(checkin!.checked_out_at!)}</strong></>
            )}
          </p>
        )}

        {err && <p style={{ fontSize: '12px', color: '#e24b4a', margin: '4px 0 0' }}>{err}</p>}
      </div>

      {/* Action button */}
      <div style={{ flexShrink: 0 }}>
        {worksToday && !checkedOut && (
          <button
            onClick={checkedIn ? handleCheckOut : handleCheckIn}
            disabled={pending}
            style={{
              padding: '7px 14px', fontSize: '13px', borderRadius: '8px', cursor: 'pointer',
              background: checkedIn ? 'var(--surface)' : '#111',
              color: checkedIn ? 'var(--text-2)' : '#fff',
              border: checkedIn ? '1px solid var(--line)' : '1px solid #111',
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? '…' : checkedIn ? 'Check out' : 'Check in'}
          </button>
        )}
      </div>
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
  // We use a counter to force a re-render after optimistic updates
  const [, setRefreshKey] = useState(0)
  function onUpdate() { setRefreshKey(k => k + 1) }

  const working  = staff.filter(m => !m.working_days?.length || m.working_days.includes(todayDay))
  const offToday = staff.filter(m => m.working_days?.length && !m.working_days.includes(todayDay))

  const checkedIn = working.filter(m => m.checkin && !m.checkin.checked_out_at).length
  const checkedOut = working.filter(m => m.checkin?.checked_out_at).length
  const notIn     = working.filter(m => !m.checkin).length

  return (
    <div>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { label: 'Expected in', value: working.length, bg: 'var(--surface)', color: 'var(--text)' },
          { label: 'Checked in',  value: checkedIn,      bg: '#e6f1fb',        color: '#185fa5' },
          { label: 'Checked out', value: checkedOut,     bg: '#eaf3de',        color: '#3b6d11' },
          { label: 'Not in yet',  value: notIn,          bg: '#faeeda',        color: '#854f0b' },
        ].map(s => (
          <div key={s.label} style={{
            flex: '1 1 120px', padding: '14px 16px', borderRadius: '10px',
            background: s.bg, border: '1px solid var(--line)',
          }}>
            <p style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 2px', color: s.color }}>{s.value}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Working today */}
      {working.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>
            Working today — {todayLabel}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {working.map(m => (
              <StaffCard key={m.staff_id} member={m} todayDay={todayDay} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {/* Off today */}
      {offToday.length > 0 && (
        <div>
          <p style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em', margin: '0 0 10px' }}>
            Day off today
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {offToday.map(m => (
              <StaffCard key={m.staff_id} member={m} todayDay={todayDay} onUpdate={onUpdate} />
            ))}
          </div>
        </div>
      )}

      {staff.length === 0 && (
        <p style={{ fontSize: '14px', color: 'var(--text-4)', padding: '2rem 0' }}>
          No staff members yet. <a href="/dashboard/staff/new" style={{ color: 'var(--btn)', textDecoration: 'none' }}>Add your first team member →</a>
        </p>
      )}
    </div>
  )
}
