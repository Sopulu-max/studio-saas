import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAttendanceRecords } from '@/app/actions/attendance'
import { getStudioContext } from '@/lib/studio'
import RecordsTable from './records-table'
import type { AttendanceRecord, StaffOption } from './records-table'

// ─── Helpers ────────────────────────────────────────────────────────────────

function nDaysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function tabUrl(view: string, from: string, to: string) {
  return `/dashboard/attendance/records?view=${view}&from=${from}&to=${to}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })
}

const LATE_H = 8, LATE_M = 30
function isLate(iso: string) {
  const d = new Date(iso)
  return d.getHours() > LATE_H || (d.getHours() === LATE_H && d.getMinutes() > LATE_M)
}

// ─── Component helpers ──────────────────────────────────────────────────────

function TabNav({ active, from, to }: { active: string; from: string; to: string }) {
  const tabs = [
    { key: 'records',   label: 'Records' },
    { key: 'by-person', label: 'By person' },
  ]
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '1.25rem', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '10px', padding: '3px', width: 'fit-content' }}>
      {tabs.map(t => (
        <Link key={t.key} href={tabUrl(t.key, from, to)} style={{
          padding: '6px 16px', borderRadius: '7px', fontSize: '13px', fontWeight: '500',
          textDecoration: 'none', whiteSpace: 'nowrap',
          background: active === t.key ? 'var(--btn)' : 'transparent',
          color: active === t.key ? 'var(--btn-fg)' : 'var(--text-3)',
        }}>{t.label}</Link>
      ))}
    </div>
  )
}

function StatsStrip({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '12px', marginBottom: '1.5rem' }}>
      {items.map(item => (
        <div key={item.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 6px', fontWeight: '500' }}>{item.label}</p>
          <p style={{ fontSize: '26px', fontWeight: '500', margin: 0, lineHeight: 1.1 }}>{item.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function AttendanceRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; from?: string; to?: string; staff?: string }>
}) {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const params  = await searchParams
  const view    = params.view ?? 'records'
  const from    = params.from ?? nDaysAgo(30)
  const to      = params.to   ?? todayStr()
  const staffId = params.staff ?? ''

  // ── Staff list (used in both views) ──────────────────────────────
  const { data: staffList } = await context.admin
    .from('staff')
    .select('staff_id, full_name')
    .eq('studio_id', context.studioId)
    .order('full_name')

  const staff: StaffOption[] = ((staffList ?? []) as unknown as StaffOption[]).map(m => ({
    staff_id:  m.staff_id,
    full_name: m.full_name,
  }))

  // ── All records in range (no staff filter) — used for stats + by-person ──
  const { data: allRaw } = await getAttendanceRecords({ from, to, staffId: null })

  type RawRecord = Omit<AttendanceRecord, 'staff'> & {
    staff: AttendanceRecord['staff'] | AttendanceRecord['staff'][] | null
  }

  const allRecords: AttendanceRecord[] = ((allRaw ?? []) as unknown as RawRecord[]).map(r => ({
    ...r,
    staff: Array.isArray(r.staff) ? (r.staff[0] ?? null) : (r.staff ?? null),
  }))

  // ── Stats ────────────────────────────────────────────────────────
  const uniqueStaffIds = new Set(allRecords.map(r => r.staff_id))
  const lateCount      = allRecords.filter(r => isLate(r.checked_in_at)).length

  const statsItems = [
    { label: 'Check-ins in range', value: allRecords.length },
    { label: 'Unique staff',       value: uniqueStaffIds.size },
    { label: 'Late arrivals',      value: lateCount },
  ]

  // ── Date labels ──────────────────────────────────────────────────
  const fromLabel = new Date(`${from}T00:00:00`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const toLabel   = new Date(`${to}T00:00:00`).toLocaleDateString('en-NG',   { day: 'numeric', month: 'short', year: 'numeric' })

  // ── Header ───────────────────────────────────────────────────────
  const header = (
    <div style={{ marginBottom: '1.5rem' }}>
      <Link href="/dashboard/attendance" style={{ fontSize: '13px', color: 'var(--text-4)', textDecoration: 'none', display: 'inline-block', marginBottom: '4px' }}>
        ← Today&apos;s board
      </Link>
      <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Attendance records</h1>
      <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
        {fromLabel} – {toLabel}
        {staffId && staff.length ? ` · ${staff.find(m => m.staff_id === staffId)?.full_name ?? ''}` : ''}
      </p>
    </div>
  )

  // ── By person view ───────────────────────────────────────────────
  if (view === 'by-person') {
    // Group records by staff_id
    type PersonSummary = {
      staff_id:  string
      full_name: string
      days:      number
      late:      number
      firstIn:   string | null   // earliest check-in ISO (for avg calc)
      inTimes:   string[]
    }

    const personMap: Record<string, PersonSummary> = {}
    for (const r of allRecords) {
      if (!personMap[r.staff_id]) {
        personMap[r.staff_id] = {
          staff_id:  r.staff_id,
          full_name: r.staff?.full_name ?? '—',
          days:      0,
          late:      0,
          firstIn:   null,
          inTimes:   [],
        }
      }
      const p = personMap[r.staff_id]
      p.days += 1
      if (isLate(r.checked_in_at)) p.late += 1
      p.inTimes.push(r.checked_in_at)
    }

    const people = Object.values(personMap).sort((a, b) => b.days - a.days)

    function avgInTime(inTimes: string[]): string {
      if (!inTimes.length) return '—'
      const avg = inTimes.reduce((s, t) => s + new Date(t).getTime(), 0) / inTimes.length
      return fmtTime(new Date(avg).toISOString())
    }

    return (
      <div style={{ maxWidth: '900px' }}>
        {header}
        <StatsStrip items={statsItems} />
        <TabNav active="by-person" from={from} to={to} />

        {!people.length ? (
          <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed var(--line)', borderRadius: '12px', color: 'var(--text-3)' }}>
            <p style={{ fontSize: '15px', margin: '0 0 4px' }}>No attendance records in this range</p>
            <p style={{ fontSize: '13px', margin: 0 }}>Adjust the date range in the Records tab to widen the window</p>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '10px 1.25rem', borderBottom: '1px solid var(--line-inner)', fontSize: '12px', color: 'var(--text-3)', fontWeight: '500' }}>
              <span>Staff member</span>
              <span>Days in range</span>
              <span>Late arrivals</span>
              <span>Avg check-in</span>
            </div>

            {people.map((p, i) => (
              <Link
                key={p.staff_id}
                href={tabUrl('records', from, to) + `&staff=${p.staff_id}`}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', alignItems: 'center',
                  borderBottom: i < people.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: '600', margin: 0 }}>{p.full_name}</p>
                <p style={{ fontSize: '13px', margin: 0 }}>{p.days}</p>
                <p style={{ fontSize: '13px', margin: 0, color: p.late > 0 ? '#a32d2d' : 'var(--text-3)', fontWeight: p.late > 0 ? '600' : '400' }}>
                  {p.late > 0 ? `${p.late} late` : '—'}
                </p>
                <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: 0 }}>{avgInTime(p.inTimes)}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Records view (default) — preserved exactly ───────────────────
  const { data: filteredRaw } = await getAttendanceRecords({ from, to, staffId: staffId || null })
  const records: AttendanceRecord[] = ((filteredRaw ?? []) as unknown as RawRecord[]).map(r => ({
    ...r,
    staff: Array.isArray(r.staff) ? (r.staff[0] ?? null) : (r.staff ?? null),
  }))

  return (
    <div style={{ maxWidth: '900px' }}>
      {header}
      <StatsStrip items={statsItems} />
      <TabNav active="records" from={from} to={to} />

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
