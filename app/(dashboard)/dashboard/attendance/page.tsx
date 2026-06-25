import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import AttendanceBoard from './attendance-board'
import { getTodayAttendanceBoard } from '@/lib/domains/attendance/repository'

export default async function AttendancePage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { staff, todayDay, todayLabel } = await getTodayAttendanceBoard(context.admin, context.studioId)

  return (
    <div style={{ maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Attendance</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {todayLabel}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link
            href="/dashboard/attendance/records"
            style={{ fontSize: '13px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
          >
            View records
          </Link>
          <Link
            href="/dashboard/staff"
            style={{ fontSize: '13px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', background: 'var(--surface)' }}
          >
            Manage staff
          </Link>
        </div>
      </div>

      <AttendanceBoard staff={staff} todayLabel={todayLabel} todayDay={todayDay} />
    </div>
  )
}
