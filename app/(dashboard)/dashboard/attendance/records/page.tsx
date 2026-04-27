import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStudioContext } from '@/lib/studio'
import { getAttendanceRecords } from '@/app/actions/attendance'
import RecordsTable from './records-table'
import type { AttendanceRecord, StaffOption } from './records-table'

function nDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
function todayStr() { return new Date().toISOString().slice(0, 10) }

export default async function AttendanceRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; staff?: string }>
}) {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const params     = await searchParams
  const from       = params.from    ?? nDaysAgo(30)
  const to         = params.to      ?? todayStr()
  const staffId    = params.staff   ?? ''

  // Fetch all staff for the filter dropdown
  const { data: staffList } = await context.admin
    .from('staff')
    .select('staff_id, full_name')
    .eq('studio_id', context.studioId)
    .order('full_name')

  // Fetch records
  const { data: rawRecords } = await getAttendanceRecords({
    from,
    to,
    staffId: staffId || null,
  })

  // rawRecords is typed as never[] because staff_checkins isn't in the generated
  // Supabase types — cast to a shape that matches AttendanceRecord before mapping.
  type RawRecord = Omit<AttendanceRecord, 'staff'> & {
    staff: AttendanceRecord['staff'] | AttendanceRecord['staff'][] | null
  }
  // Normalise: Supabase join can return array or object for `staff`
  const records: AttendanceRecord[] = ((rawRecords ?? []) as unknown as RawRecord[]).map(r => ({
    ...r,
    staff: Array.isArray(r.staff) ? (r.staff[0] ?? null) : (r.staff ?? null),
  }))

  const staff: StaffOption[] = ((staffList ?? []) as unknown as StaffOption[]).map(s => ({
    staff_id:  s.staff_id,
    full_name: s.full_name,
  }))

  const fromLabel = new Date(from + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const toLabel   = new Date(to   + 'T00:00:00').toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link href="/dashboard/attendance"
              style={{ fontSize: '13px', color: 'var(--text-4)', textDecoration: 'none' }}>
              ← Today's board
            </Link>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Attendance records</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {fromLabel} — {toLabel}
            {staffId && staffList ? ` · ${staffList.find(s => s.staff_id === staffId)?.full_name ?? ''}` : ''}
          </p>
        </div>
      </div>

      <RecordsTable
        records={records}
        staff={staff}
        initialFrom={from}
        initialTo={to}
        initialStaffId={staffId}
      />
    </div>
  )
}
