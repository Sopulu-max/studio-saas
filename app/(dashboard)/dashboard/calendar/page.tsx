import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig } from '@/lib/studio-config'

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

function calUrl(year: number, month: number) {
  return `/dashboard/calendar?year=${year}&month=${month}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams

  const now   = new Date()
  const year  = parseInt(yearStr  ?? '') || now.getFullYear()
  const month = parseInt(monthStr ?? '') || (now.getMonth() + 1)  // 1-based

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  // Load studio config for dynamic status colours/labels
  const { data: studioRow } = await context.admin
    .from('studios')
    .select('session_types, booking_statuses, service_types')
    .eq('studio_id', context.studioId)
    .single()

  const config = buildStudioConfig(
    studioRow?.session_types,
    studioRow?.booking_statuses,
    studioRow?.service_types,
  )

  // Fetch all sessions for this month
  const monthEnd = new Date(year, month, 0)
  const fromStr  = `${year}-${String(month).padStart(2, '0')}-01`
  const toStr    = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

  const cancellationValues = config.bookingStatuses
    .filter(s => s.is_cancellation)
    .map(s => s.value)

  let query = context.admin
    .from('bookings')
    .select('booking_id, session_date, status, session_type, clients(full_name), packages(name)')
    .eq('studio_id', context.studioId)
    .gte('session_date', fromStr)
    .lte('session_date', toStr + 'T23:59:59')
    .order('session_date', { ascending: true })

  // Exclude cancelled statuses dynamically
  for (const val of cancellationValues) {
    query = query.neq('status', val)
  }

  const { data: sessions } = await query

  // Group sessions by date string YYYY-MM-DD
  const byDate: Record<string, typeof sessions> = {}
  for (const s of sessions ?? []) {
    if (!s.session_date) continue
    const dateKey = s.session_date.slice(0, 10)
    byDate[dateKey] = byDate[dateKey] ?? []
    byDate[dateKey]!.push(s)
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth     = new Date(year, month, 0).getDate()
  const todayStr        = now.toISOString().slice(0, 10)

  // Prev/next month
  const prevDate = new Date(year, month - 2, 1)
  const nextDate = new Date(year, month,     1)
  const prevUrl  = calUrl(prevDate.getFullYear(), prevDate.getMonth() + 1)
  const nextUrl  = calUrl(nextDate.getFullYear(), nextDate.getMonth() + 1)

  const totalThisMonth = (sessions ?? []).length

  // Build week rows
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  // Non-cancellation statuses for the legend
  const legendStatuses = config.bookingStatuses.filter(s => !s.is_cancellation)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>
            {MONTH_NAMES[month - 1]} {year}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
            {totalThisMonth} session{totalThisMonth !== 1 ? 's' : ''} this month
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href={prevUrl} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>←</Link>
          <Link href={calUrl(now.getFullYear(), now.getMonth() + 1)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '13px', background: 'var(--surface)' }}>Today</Link>
          <Link href={nextUrl} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>→</Link>
          <Link href="/dashboard/sessions/new" style={{ padding: '7px 16px', borderRadius: '8px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>New session</Link>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Day name headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--line-inner)' }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{ padding: '10px 12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-4)', textAlign: 'center', letterSpacing: '0.04em' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid var(--line-inner)' : 'none' }}>
            {week.map((day, di) => {
              const dateKey     = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
              const daySessions = dateKey ? (byDate[dateKey] ?? []) : []
              const isToday     = dateKey === todayStr
              const isWeekend   = di === 0 || di === 6

              return (
                <div
                  key={di}
                  style={{
                    minHeight: '100px',
                    padding: '8px',
                    borderRight: di < 6 ? '1px solid var(--line-inner)' : 'none',
                    background: isToday ? 'var(--hover)' : 'transparent',
                    verticalAlign: 'top',
                  }}
                >
                  {day && (
                    <>
                      <p style={{
                        fontSize: '13px',
                        fontWeight: isToday ? '700' : '400',
                        margin: '0 0 6px',
                        width: '24px', height: '24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        background:  isToday ? 'var(--btn)'    : 'transparent',
                        color:       isToday ? 'var(--btn-fg)' : isWeekend ? 'var(--text-3)' : 'var(--text-2)',
                      }}>
                        {day}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {daySessions.slice(0, 3).map((s: any) => {
                          const sc = getStatusConfig(config, s.status)
                          return (
                            <Link
                              key={s.booking_id}
                              href={`/dashboard/sessions/${s.booking_id}`}
                              title={`${(s.clients as any)?.full_name} — ${sc.label}`}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '3px 6px', borderRadius: '5px',
                                background: sc.color_bg, textDecoration: 'none',
                                overflow: 'hidden',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.color_fg, flexShrink: 0, opacity: 0.75 }} />
                              <span style={{ fontSize: '11px', color: sc.color_fg, fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {(s.clients as any)?.full_name ?? '—'}
                              </span>
                            </Link>
                          )
                        })}
                        {daySessions.length > 3 && (
                          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '2px 0 0 6px' }}>
                            +{daySessions.length - 3} more
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Status legend — dynamically from config */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '14px' }}>
        {legendStatuses.map(s => (
          <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color_fg, flexShrink: 0, opacity: 0.75 }} />
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
