import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import AttendanceBoard from './attendance-board'

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export default async function AttendancePage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const today    = new Date()
  const todayDay = DAY_NAMES[today.getDay()]   // e.g. 'wednesday'
  const todayISO = today.toISOString().slice(0, 10)
  const todayLabel = today.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // Fetch all staff
  const { data: staffList } = await context.admin
    .from('staff')
    .select('staff_id, full_name, role, roles, working_days')
    .eq('studio_id', context.studioId)
    .order('full_name')

  // Fetch today's checkins for this studio
  const { data: checkins } = await context.admin
    .from('staff_checkins')
    .select('checkin_id, staff_id, checked_in_at, checked_out_at')
    .eq('studio_id', context.studioId)
    .eq('date', todayISO)

  const checkinMap: Record<string, NonNullable<typeof checkins>[number]> = {}
  for (const c of checkins ?? []) {
    checkinMap[c.staff_id] = c
  }

  const staff = (staffList ?? []).map(m => ({
    ...m,
    checkin: checkinMap[m.staff_id] ?? null,
  }))

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
