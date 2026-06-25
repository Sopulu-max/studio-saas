import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'
import { AnimatedList, AnimatedItem } from '@/components/animated-list'

const DAY_NAMES         = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES       = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_NAMES_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

type CalendarSessionRow = {
  session_id:    string
  session_date?: string | null
  session_type?: string | null
  shoot_type?:   string | null
  bookings: {
    booking_id:    string
    booking_ref?:  number | null
    status:        string
    clients?: { full_name?: string | null }[] | { full_name?: string | null } | null
  } | null
}

type CalendarOccasionRow = {
  session_id:   string
  event_date:   string
  event_name?:  string | null
  bookings: {
    booking_id:   string
    booking_ref?: number | null
    clients?: { full_name?: string | null }[] | { full_name?: string | null } | null
  } | null
}

function occasionEmoji(name: string | null | undefined): string {
  const n = (name ?? '').toLowerCase()
  if (n.includes('birthday'))                        return '🎂'
  if (n.includes('wedding') || n.includes('nuptial')) return '💍'
  if (n.includes('anniversary'))                      return '💞'
  if (n.includes('graduation'))                       return '🎓'
  if (n.includes('engagement'))                       return '💒'
  if (n.includes('naming') || n.includes('christening') || n.includes('dedication')) return '👶'
  return '📅'
}

function monthUrl(year: number, month: number) {
  return `/dashboard/calendar?year=${year}&month=${month}`
}

function weekUrl(date: Date) {
  return `/dashboard/calendar?view=week&date=${date.toISOString().slice(0, 10)}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; view?: string; date?: string }>
}) {
  const params = await searchParams
  const view   = params.view === 'week' ? 'week' : 'month'

  const now      = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studioRow = await fetchStudio(context.admin, context.studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const cancellationValues = config.bookingStatuses
    .filter(s => s.is_cancellation)
    .map(s => s.value)

  const legendStatuses = config.bookingStatuses.filter(s => !s.is_cancellation)

  // ─── WEEK VIEW ─────────────────────────────────────────────────────────────
  if (view === 'week') {
    const dateStr = params.date ?? todayStr
    const anchor  = new Date(dateStr + 'T12:00:00') // noon avoids DST edge cases

    // Find Monday of this week (ISO weeks start Monday)
    const dow         = anchor.getDay()             // 0 = Sun … 6 = Sat
    const daysFromMon = dow === 0 ? 6 : dow - 1
    const monday      = addDays(anchor, -daysFromMon)
    const sunday      = addDays(monday, 6)

    const fromStr = monday.toISOString().slice(0, 10)
    const toStr   = sunday.toISOString().slice(0, 10)

    let weekQuery = context.admin
      .from('sessions')
      .select('session_id, session_date, session_type, shoot_type, bookings!inner(booking_id, booking_ref, status, clients(full_name))')
      .eq('studio_id', context.studioId)
      .gte('session_date', fromStr)
      .lte('session_date', toStr + 'T23:59:59')
      .order('session_date', { ascending: true })

    for (const val of cancellationValues) {
      weekQuery = weekQuery.neq('bookings.status', val)
    }

    const [{ data: weekSessionsRaw }, { data: weekOccasionsRaw }] = await Promise.all([
      weekQuery,
      context.admin
        .from('sessions')
        .select('session_id, event_date, event_name, bookings!inner(booking_id, booking_ref, clients(full_name))')
        .eq('studio_id', context.studioId)
        .not('event_date', 'is', null)
        .gte('event_date', fromStr)
        .lte('event_date', toStr),
    ])

    const weekSessions  = (weekSessionsRaw  ?? []) as unknown as CalendarSessionRow[]
    const weekOccasions = (weekOccasionsRaw ?? []) as unknown as CalendarOccasionRow[]

    const byDate: Record<string, CalendarSessionRow[]> = {}
    for (const s of weekSessions) {
      if (!s.session_date) continue
      const key = s.session_date.slice(0, 10)
      byDate[key] = byDate[key] ?? []
      byDate[key]!.push(s)
    }

    const weekEventByDate: Record<string, CalendarOccasionRow[]> = {}
    for (const o of weekOccasions) {
      if (!o.event_date) continue
      const key = o.event_date.slice(0, 10)
      weekEventByDate[key] = weekEventByDate[key] ?? []
      weekEventByDate[key]!.push(o)
    }

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

    // Header label e.g. "May 4–10, 2026" or "Apr 28 – May 4, 2026"
    const sameMonth  = monday.getMonth() === sunday.getMonth()
    const sameYear   = monday.getFullYear() === sunday.getFullYear()
    const rangeLabel = sameMonth
      ? `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()}–${sunday.getDate()}, ${monday.getFullYear()}`
      : sameYear
        ? `${MONTH_NAMES_SHORT[monday.getMonth()]} ${monday.getDate()} – ${MONTH_NAMES_SHORT[sunday.getMonth()]} ${sunday.getDate()}, ${monday.getFullYear()}`
        : `${MONTH_NAMES_SHORT[monday.getMonth()]} ${monday.getDate()}, ${monday.getFullYear()} – ${MONTH_NAMES_SHORT[sunday.getMonth()]} ${sunday.getDate()}, ${sunday.getFullYear()}`

    const prevWeekUrl  = weekUrl(addDays(monday, -7))
    const nextWeekUrl  = weekUrl(addDays(monday,  7))
    const todayWeekUrl = weekUrl(now)

    return (
      <div>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>{rangeLabel}</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>
              {weekSessions.length} session{weekSessions.length !== 1 ? 's' : ''} this week
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
              <Link href={monthUrl(monday.getFullYear(), monday.getMonth() + 1)}
                style={{ padding: '7px 14px', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none' }}>
                Month
              </Link>
              <span style={{ padding: '7px 14px', background: 'var(--btn)', color: 'var(--btn-fg)', borderLeft: '1px solid var(--line)' }}>
                Week
              </span>
            </div>
            <Link href={prevWeekUrl}  style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>←</Link>
            <Link href={todayWeekUrl} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '13px', background: 'var(--surface)' }}>Today</Link>
            <Link href={nextWeekUrl}  style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>→</Link>
            <Link href="/dashboard/bookings/new" style={{ padding: '7px 16px', borderRadius: '8px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>New session</Link>
          </div>
        </div>

        {/* Week grid */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>

            {/* Day column headers */}
            {weekDays.map((day, i) => {
              const isToday   = day.toISOString().slice(0, 10) === todayStr
              const isWeekend = day.getDay() === 0 || day.getDay() === 6
              return (
                <div key={`hd-${i}`} style={{
                  padding: '10px 8px',
                  borderRight:  i < 6 ? '1px solid var(--line-inner)' : 'none',
                  borderBottom: '1px solid var(--line-inner)',
                  background:   isToday ? 'var(--hover)' : 'transparent',
                  textAlign:    'center',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', margin: '0 0 4px', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                    {DAY_NAMES[day.getDay()]}
                  </p>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', borderRadius: '50%',
                    fontSize: '18px', fontWeight: isToday ? '700' : '400',
                    background: isToday ? 'var(--btn)'    : 'transparent',
                    color:      isToday ? 'var(--btn-fg)' : isWeekend ? 'var(--text-3)' : 'var(--text)',
                  }}>
                    {day.getDate()}
                  </span>
                  <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: '4px 0 0', letterSpacing: '0.01em' }}>
                    {MONTH_NAMES_SHORT[day.getMonth()]}
                  </p>
                </div>
              )
            })}

            {/* Session cells */}
            {weekDays.map((day, i) => {
              const dayStr      = day.toISOString().slice(0, 10)
              const daySessions = byDate[dayStr] ?? []
              const isToday     = dayStr === todayStr
              return (
                <div key={`cell-${i}`} style={{
                  padding:     '8px',
                  borderRight: i < 6 ? '1px solid var(--line-inner)' : 'none',
                  minHeight:   '160px',
                  background:  isToday ? 'var(--hover)' : 'transparent',
                  display:     'flex', flexDirection: 'column', gap: '5px',
                }}>
                  {daySessions.length === 0 && (weekEventByDate[dayStr] ?? []).length === 0
                    ? <span style={{ fontSize: '11px', color: 'var(--text-4)', margin: 'auto', textAlign: 'center', opacity: 0.4 }}>—</span>
                    : <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {daySessions.map((s: CalendarSessionRow, idx) => {
                          const status     = s.bookings?.status || 'draft'
                          const sc         = getStatusConfig(config, status)
                          const typeCfg    = getSessionTypeConfig(config, s.session_type)
                          const clientsArr = s.bookings?.clients
                          const clientName = (Array.isArray(clientsArr) ? clientsArr[0]?.full_name : clientsArr?.full_name) ?? null
                          const sName      = sessionName(clientName, s.bookings?.booking_ref, s.bookings?.booking_id, s.session_date)
                          return (
                            <AnimatedItem key={s.session_id} delay={idx * 0.05}>
                              <Link href={`/dashboard/bookings/${s.bookings?.booking_id}`}
                                style={{ display: 'block', padding: '6px 8px', borderRadius: '7px', background: sc.color_bg, textDecoration: 'none', border: `1px solid ${sc.color_fg}22` }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: sc.color_fg, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {clientName ?? sName}
                                </p>
                                <p style={{ fontSize: '10px', color: sc.color_fg, opacity: 0.65, margin: '0 0 5px', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sName}
                                </p>
                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const }}>
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: typeCfg.color_bg, color: typeCfg.color_fg, fontWeight: '500', border: `1px solid ${typeCfg.color_fg}22`, whiteSpace: 'nowrap' as const }}>
                                    {typeCfg.label}
                                  </span>
                                  {s.shoot_type && (
                                    <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: 'var(--surface)', color: 'var(--text-3)', border: '1px solid var(--line-inner)', whiteSpace: 'nowrap' as const }}>
                                      {s.shoot_type}
                                    </span>
                                  )}
                                  <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: sc.color_bg, color: sc.color_fg, border: `1px solid ${sc.color_fg}33`, whiteSpace: 'nowrap' as const, marginLeft: 'auto' }}>
                                    {sc.label}
                                  </span>
                                </div>
                              </Link>
                            </AnimatedItem>
                          )
                        })}
                        {(weekEventByDate[dayStr] ?? []).map((o: CalendarOccasionRow, idx) => {
                          const clientsArr = o.bookings?.clients
                          const clientName = (Array.isArray(clientsArr) ? clientsArr[0]?.full_name : clientsArr?.full_name) ?? null
                          const emoji = occasionEmoji(o.event_name)
                          return (
                            <AnimatedItem key={`occ-${o.session_id}`} delay={(daySessions.length + idx) * 0.05}>
                              <Link href={`/dashboard/bookings/${o.bookings?.booking_id}`}
                                style={{ display: 'block', padding: '6px 8px', borderRadius: '7px', background: '#fff8e6', textDecoration: 'none', border: '1px dashed #c9980055' }}>
                                <p style={{ fontSize: '12px', fontWeight: '600', color: '#8a6a00', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {emoji} {clientName ?? '—'}
                                </p>
                                <p style={{ fontSize: '10px', color: '#8a6a00', opacity: 0.75, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {o.event_name ?? 'Occasion'}
                                </p>
                              </Link>
                            </AnimatedItem>
                          )
                        })}
                      </AnimatedList>
                  }
                </div>
              )
            })}

          </div>
        </div>

        {/* Status legend */}
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

  // ─── MONTH VIEW ────────────────────────────────────────────────────────────
  const year  = parseInt(params.year  ?? '') || now.getFullYear()
  const month = parseInt(params.month ?? '') || (now.getMonth() + 1)  // 1-based

  const monthEnd = new Date(year, month, 0)
  const fromStr  = `${year}-${String(month).padStart(2, '0')}-01`
  const toStr    = `${year}-${String(month).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`

  let query = context.admin
    .from('sessions')
    .select('session_id, session_date, session_type, shoot_type, bookings!inner(booking_id, booking_ref, status, clients(full_name))')
    .eq('studio_id', context.studioId)
    .gte('session_date', fromStr)
    .lte('session_date', toStr + 'T23:59:59')
    .order('session_date', { ascending: true })

  for (const val of cancellationValues) {
    query = query.neq('bookings.status', val)
  }

  const [{ data: sessionsRaw }, { data: occasionsRaw }] = await Promise.all([
    query,
    context.admin
      .from('sessions')
      .select('session_id, event_date, event_name, bookings!inner(booking_id, booking_ref, clients(full_name))')
      .eq('studio_id', context.studioId)
      .not('event_date', 'is', null)
      .gte('event_date', fromStr)
      .lte('event_date', toStr),
  ])

  const sessions  = (sessionsRaw  ?? []) as unknown as CalendarSessionRow[]
  const occasions = (occasionsRaw ?? []) as unknown as CalendarOccasionRow[]

  const byDate: Record<string, CalendarSessionRow[]> = {}
  for (const s of sessions ?? []) {
    if (!s.session_date) continue
    const dateKey = s.session_date.slice(0, 10)
    byDate[dateKey] = byDate[dateKey] ?? []
    byDate[dateKey]!.push(s)
  }

  const eventByDate: Record<string, CalendarOccasionRow[]> = {}
  for (const o of occasions) {
    if (!o.event_date) continue
    const key = o.event_date.slice(0, 10)
    eventByDate[key] = eventByDate[key] ?? []
    eventByDate[key]!.push(o)
  }

  const firstDayOfMonth = new Date(year, month - 1, 1).getDay()
  const daysInMonth     = new Date(year, month, 0).getDate()

  const prevDate = new Date(year, month - 2, 1)
  const nextDate = new Date(year, month,     1)
  const prevUrl  = monthUrl(prevDate.getFullYear(), prevDate.getMonth() + 1)
  const nextUrl  = monthUrl(nextDate.getFullYear(), nextDate.getMonth() + 1)

  const totalThisMonth = (sessions ?? []).length

  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

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
          {/* View toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: '8px', overflow: 'hidden', fontSize: '13px' }}>
            <span style={{ padding: '7px 14px', background: 'var(--btn)', color: 'var(--btn-fg)' }}>Month</span>
            <Link href={weekUrl(now)}
              style={{ padding: '7px 14px', background: 'transparent', color: 'var(--text-2)', textDecoration: 'none', borderLeft: '1px solid var(--line)' }}>
              Week
            </Link>
          </div>
          <Link href={prevUrl} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>←</Link>
          <Link href={monthUrl(now.getFullYear(), now.getMonth() + 1)} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '13px', background: 'var(--surface)' }}>Today</Link>
          <Link href={nextUrl} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--line)', color: 'var(--text-2)', textDecoration: 'none', fontSize: '14px', background: 'var(--surface)' }}>→</Link>
          <Link href="/dashboard/bookings/new" style={{ padding: '7px 16px', borderRadius: '8px', background: 'var(--btn)', color: 'var(--btn-fg)', textDecoration: 'none', fontSize: '13px', fontWeight: '500' }}>New session</Link>
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
                <div key={di} style={{
                  minHeight:   '100px',
                  padding:     '8px',
                  borderRight: di < 6 ? '1px solid var(--line-inner)' : 'none',
                  background:  isToday ? 'var(--hover)' : 'transparent',
                  verticalAlign: 'top',
                }}>
                  {day && (
                    <>
                      <p style={{
                        fontSize: '13px', fontWeight: isToday ? '700' : '400', margin: '0 0 6px',
                        width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '50%',
                        background: isToday ? 'var(--btn)'    : 'transparent',
                        color:      isToday ? 'var(--btn-fg)' : isWeekend ? 'var(--text-3)' : 'var(--text-2)',
                      }}>
                        {day}
                      </p>
                      <AnimatedList style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {daySessions.slice(0, 3).map((s: CalendarSessionRow, idx) => {
                          const status     = s.bookings?.status || 'draft'
                          const sc         = getStatusConfig(config, status)
                          const clientsArr = s.bookings?.clients
                          const clientName = (Array.isArray(clientsArr) ? clientsArr[0]?.full_name : clientsArr?.full_name) ?? null
                          const sName      = sessionName(clientName, s.bookings?.booking_ref, s.bookings?.booking_id, s.session_date)
                          return (
                            <AnimatedItem key={s.session_id} delay={idx * 0.05}>
                              <Link
                                href={`/dashboard/bookings/${s.bookings?.booking_id}`}
                                title={`${sName} · ${clientName ?? 'Unknown'}${s.shoot_type ? ` · ${s.shoot_type}` : ''} — ${sc.label}`}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: '5px',
                                  padding: '3px 6px', borderRadius: '5px',
                                  background: sc.color_bg, textDecoration: 'none',
                                  overflow: 'hidden',
                                }}
                              >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.color_fg, flexShrink: 0, opacity: 0.75, marginTop: '3px' }} />
                                <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                  <span style={{ fontSize: '11px', color: sc.color_fg, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {clientName ?? sName}
                                  </span>
                                  <span style={{ fontSize: '10px', color: sc.color_fg, opacity: 0.65, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                                    {sName}{s.shoot_type ? ` · ${s.shoot_type}` : ''}
                                  </span>
                                </span>
                              </Link>
                            </AnimatedItem>
                          )
                        })}
                        {daySessions.length > 3 && (
                          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: '2px 0 0 6px' }}>
                            +{daySessions.length - 3} more
                          </p>
                        )}
                        {(dateKey ? (eventByDate[dateKey] ?? []) : []).map((o: CalendarOccasionRow, idx) => {
                          const clientsArr = o.bookings?.clients
                          const clientName = (Array.isArray(clientsArr) ? clientsArr[0]?.full_name : clientsArr?.full_name) ?? null
                          const emoji = occasionEmoji(o.event_name)
                          return (
                            <AnimatedItem key={`occ-${o.session_id}`} delay={(Math.min(3, daySessions.length) + idx) * 0.05}>
                              <Link
                                href={`/dashboard/bookings/${o.bookings?.booking_id}`}
                                title={`${clientName ?? '—'} — ${o.event_name ?? 'Occasion'}`}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: '4px',
                                  padding: '2px 5px', borderRadius: '5px',
                                  background: '#fff8e6', textDecoration: 'none',
                                  border: '1px dashed #c9980055', overflow: 'hidden',
                                }}
                              >
                                <span style={{ fontSize: '10px', flexShrink: 0 }}>{emoji}</span>
                                <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
                                  <span style={{ fontSize: '11px', color: '#8a6a00', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {clientName ?? '—'}
                                  </span>
                                  <span style={{ fontSize: '9px', color: '#8a6a00', opacity: 0.75, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {o.event_name ?? 'Occasion'}
                                  </span>
                                </span>
                              </Link>
                            </AnimatedItem>
                          )
                        })}
                      </AnimatedList>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Status legend */}
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

