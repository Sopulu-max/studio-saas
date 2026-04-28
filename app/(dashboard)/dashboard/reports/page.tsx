import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import { sessionName } from '@/lib/session-title'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}
function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingRow = {
  booking_id:    string
  booking_ref?:  number | null
  session_date?: string | null
  status:        string
  session_type?: string | null
  shoot_type?:   string | null
  clients?:      { full_name?: string | null } | null
  packages?:     { name?: string | null } | null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}) {
  const { range = 'this_month', from: fromParam, to: toParam } = await searchParams

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const studioRow = await fetchStudio(admin, studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const now       = new Date()
  const year      = now.getFullYear()
  const month     = now.getMonth() + 1
  const todayISO  = now.toISOString().slice(0, 10)           // "2026-04-28"
  const tomorrow  = new Date(now.getTime() + 86_400_000)
  const tomorrowISO = tomorrow.toISOString().slice(0, 10)
  const next30ISO   = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)

  // Month boundaries (used for bar chart)
  const thisMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastMonthDate  = new Date(year, month - 2, 1)
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  // ── Financial date range ─────────────────────────────────────────────────────
  // Presets: this_month | last_3_months | this_year | all_time | custom
  type RangePreset = 'this_month' | 'last_3_months' | 'this_year' | 'all_time' | 'custom'
  const activeRange = (fromParam || toParam) ? 'custom' : (range as RangePreset)

  let finFrom: string | null = null
  let finTo:   string | null = null
  if (activeRange === 'custom') {
    finFrom = fromParam ?? null
    finTo   = toParam   ?? null
  } else if (activeRange === 'this_month') {
    finFrom = thisMonthStart
    finTo   = null
  } else if (activeRange === 'last_3_months') {
    const d3 = new Date(year, month - 4, 1)
    finFrom = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-01`
    finTo   = null
  } else if (activeRange === 'this_year') {
    finFrom = `${year}-01-01`
    finTo   = null
  }
  // all_time → no date filter (finFrom = finTo = null)

  const PRESETS: { value: string; label: string }[] = [
    { value: 'this_month',    label: 'This month' },
    { value: 'last_3_months', label: 'Last 3 months' },
    { value: 'this_year',     label: 'This year' },
    { value: 'all_time',      label: 'All time' },
  ]

  // Cancellation status values — exclude from pipeline
  const cancelValues = config.bookingStatuses
    .filter(s => s.is_cancellation)
    .map(s => s.value)

  // End-of-day markers (match the pattern used across the rest of the app)
  const todayEnd   = `${todayISO}T23:59:59`
  const next30End  = `${next30ISO}T23:59:59`

  // Week calculations — Monday of current week through today
  const dayOfWeek  = now.getDay()                            // 0=Sun, 1=Mon, …
  const daysBack   = dayOfWeek === 0 ? 6 : dayOfWeek - 1    // steps back to Monday
  const monday     = new Date(now.getTime() - daysBack * 86_400_000)
  const mondayISO  = monday.toISOString().slice(0, 10)

  // Build ordered list of days Mon → today
  const weekDays: { iso: string; label: string; isToday: boolean }[] = []
  for (
    let d = new Date(monday);
    d.toISOString().slice(0, 10) <= todayISO;
    d = new Date(d.getTime() + 86_400_000)
  ) {
    const iso = d.toISOString().slice(0, 10)
    weekDays.push({
      iso,
      label:   d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: iso === todayISO,
    })
  }

  // ── Phase 1: get invoice IDs so we can filter payments by studio ───────────
  // Invoices have no direct studio_id — must join through bookings
  const { data: invoiceIdRows } = await admin
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('bookings.studio_id', studioId)
  const invoiceIds = (invoiceIdRows ?? []).map((r: any) => r.invoice_id as string)

  // ── Phase 2: all remaining queries in parallel ─────────────────────────────
  // Helper — build a bookings base query and apply cancellation exclusion safely
  function bookingsBase() {
    let q = admin
      .from('bookings')
      .select('booking_id, booking_ref, session_date, status, session_type, shoot_type, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
    if (cancelValues.length > 0) {
      q = q.not('status', 'in', `(${cancelValues.join(',')})`)
    }
    return q
  }

  const [
    { data: allBookingsRaw },
    { data: todayBookingsRaw },
    { data: upcomingBookingsRaw },
    { data: allInvoicesRaw },
    { data: todayPaymentsRaw },
    { data: todayInvoicesRaw },
    { data: weekBookingsRaw },
    { data: weekPaymentsRaw },
    { data: allPaymentsRaw },
  ] = await Promise.all([
    // All active sessions (pipeline)
    bookingsBase().order('session_date', { ascending: true }),

    // Today's sessions
    admin
      .from('bookings')
      .select('booking_id, booking_ref, session_date, status, session_type, shoot_type, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gte('session_date', todayISO)
      .lte('session_date', todayEnd)
      .order('session_date', { ascending: true }),

    // Upcoming sessions — tomorrow to +30 days
    bookingsBase()
      .gte('session_date', tomorrowISO)
      .lte('session_date', next30End)
      .order('session_date', { ascending: true }),

    // All invoices (join through bookings — invoices have no direct studio_id)
    // Still needed for outstanding + overdue amounts
    admin
      .from('invoices')
      .select('total, status, issued_at, bookings!inner(studio_id)')
      .eq('bookings.studio_id', studioId),

    // Payments received today — filtered via invoice IDs (avoids broken join)
    invoiceIds.length > 0
      ? admin
          .from('payments')
          .select('amount, method')
          .in('invoice_id', invoiceIds)
          .gte('paid_at', todayISO)
          .lte('paid_at', todayEnd)
      : Promise.resolve({ data: [] }),

    // Invoices issued today
    admin
      .from('invoices')
      .select('total, status, bookings!inner(studio_id)')
      .eq('bookings.studio_id', studioId)
      .gte('issued_at', todayISO)
      .lte('issued_at', todayEnd),

    // Sessions this week (Mon → today)
    bookingsBase()
      .gte('session_date', mondayISO)
      .lte('session_date', todayEnd)
      .order('session_date', { ascending: true }),

    // Payments this week
    invoiceIds.length > 0
      ? admin
          .from('payments')
          .select('amount, paid_at')
          .in('invoice_id', invoiceIds)
          .gte('paid_at', mondayISO)
          .lte('paid_at', todayEnd)
      : Promise.resolve({ data: [] }),

    // All-time payments — for accurate revenue figures (use paid_at not issued_at)
    invoiceIds.length > 0
      ? admin
          .from('payments')
          .select('amount, paid_at')
          .in('invoice_id', invoiceIds)
      : Promise.resolve({ data: [] }),
  ])

  const allBookings     = (allBookingsRaw     ?? []) as unknown as BookingRow[]
  const todayBookings   = (todayBookingsRaw   ?? []) as unknown as BookingRow[]
  const upcomingBookings= (upcomingBookingsRaw?? []) as unknown as BookingRow[]
  const allInvoices     = (allInvoicesRaw     ?? []) as { total: number | string; status: string; issued_at: string }[]
  const todayPayments   = (todayPaymentsRaw   ?? []) as { amount: number | string; method: string }[]
  const todayInvoices   = (todayInvoicesRaw   ?? []) as { total: number | string; status: string }[]
  const weekBookings    = (weekBookingsRaw    ?? []) as unknown as BookingRow[]
  const weekPayments    = (weekPaymentsRaw    ?? []) as { amount: number | string; paid_at: string }[]
  const allPayments     = (allPaymentsRaw     ?? []) as { amount: number | string; paid_at: string }[]

  // Per-day stats for the week strip
  const dayStats = weekDays.map(day => {
    const sessions = weekBookings.filter(b => b.session_date?.startsWith(day.iso)).length
    const revenue  = weekPayments
      .filter(p => p.paid_at?.startsWith(day.iso))
      .reduce((s, p) => s + Number(p.amount), 0)
    return { ...day, sessions, revenue }
  })

  // ── Status helpers ─────────────────────────────────────────────────────────
  function statusStyle(v: string) {
    const s = getStatusConfig(config, v)
    return { bg: s.color_bg, color: s.color_fg, label: s.label }
  }
  function typeStyle(v: string | null | undefined) {
    const t = getSessionTypeConfig(config, v ?? '')
    return { bg: t.color_bg, color: t.color_fg, label: t.label }
  }

  // ── Today's status breakdown ───────────────────────────────────────────────
  const todayByStatus: Record<string, number> = {}
  for (const b of todayBookings) {
    todayByStatus[b.status] = (todayByStatus[b.status] ?? 0) + 1
  }

  // ── Active pipeline by status (all, not just today) ───────────────────────
  const pipelineByStatus: Record<string, BookingRow[]> = {}
  for (const b of allBookings) {
    if (!pipelineByStatus[b.status]) pipelineByStatus[b.status] = []
    pipelineByStatus[b.status].push(b)
  }

  // ── Upcoming grouped by session_type ──────────────────────────────────────
  const upcomingByType: Record<string, BookingRow[]> = {}
  for (const b of upcomingBookings) {
    const t = b.session_type ?? 'other'
    if (!upcomingByType[t]) upcomingByType[t] = []
    upcomingByType[t].push(b)
  }

  // ── Financial — use payment receipt dates (paid_at), not invoice issue dates ──
  // Filter payments by the selected date range
  function filterPaymentsByRange(payments: { amount: number | string; paid_at: string }[]) {
    return payments.filter(p => {
      if (finFrom && p.paid_at < finFrom) return false
      if (finTo   && p.paid_at > finTo + 'T23:59:59') return false
      return true
    })
  }

  const rangePayments       = filterPaymentsByRange(allPayments)
  const revenueInRange      = rangePayments.reduce((s, p) => s + Number(p.amount), 0)

  // For MoM comparison: always compare this month vs last month (independent of range)
  const thisMonthPayments   = allPayments.filter(p => p.paid_at >= thisMonthStart)
  const lastMonthPayments   = allPayments.filter(p => p.paid_at >= lastMonthStart && p.paid_at < thisMonthStart)
  const revenueThisMonth    = thisMonthPayments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueLastMonth    = lastMonthPayments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueTotal        = allPayments.reduce((s, p) => s + Number(p.amount), 0)

  const outstanding         = allInvoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + Number(i.total), 0)
  const overdue             = allInvoices.filter(i => i.status === 'overdue').reduce((s, i) => s + Number(i.total), 0)

  // MoM shown only for "this month" range
  const showMoM    = activeRange === 'this_month'
  const momDiff    = revenueThisMonth - revenueLastMonth
  const momPercent = revenueLastMonth > 0 ? Math.round((momDiff / revenueLastMonth) * 100) : null

  const todayPaymentsTotal  = todayPayments.reduce((s, p) => s + Number(p.amount), 0)
  const todayInvoicesTotal  = todayInvoices.reduce((s, i) => s + Number(i.total), 0)

  // ── Revenue bar chart (last 6 months, always uses payment dates) ──────────
  const monthlyRevenue: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d    = new Date(year, month - 1 - i, 1)
    const y    = d.getFullYear()
    const m    = d.getMonth() + 1
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const toD  = new Date(y, m, 1)
    const to   = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}-01`
    const amt  = allPayments.filter(p => p.paid_at >= from && p.paid_at < to).reduce((s, p) => s + Number(p.amount), 0)
    monthlyRevenue.push({ label: monthLabel(y, m), amount: amt })
  }
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.amount), 1)

  // ── UI helpers ────────────────────────────────────────────────────────────
  const card   = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' } as const
  const cardPad= { ...card, padding: 0, overflow: 'hidden' } as const
  const lbl    = { fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' } as const
  const val    = { fontSize: '22px', fontWeight: '600', margin: 0 } as const
  const sxn    = { fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' } as const

  const todayLabel = now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  // ── Ordered statuses for pipeline (non-cancellation) ─────────────────────
  const orderedStatuses = config.bookingStatuses.filter(s => !s.is_cancellation).sort((a, b) => a.order - b.order)

  return (
    <div style={{ maxWidth: '860px' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Reports</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{todayLabel}</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — TODAY'S SNAPSHOT
      ════════════════════════════════════════════════════════════════════ */}
      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Today</p>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <div style={card}>
          <p style={lbl}>Sessions today</p>
          <p style={val}>{todayBookings.length}</p>
        </div>
        <div style={card}>
          <p style={lbl}>Payments received</p>
          <p style={{ ...val, fontSize: todayPaymentsTotal > 0 ? '18px' : '22px', color: todayPaymentsTotal > 0 ? '#3b6d11' : 'var(--text)' }}>
            {todayPaymentsTotal > 0 ? fmt(todayPaymentsTotal) : '—'}
          </p>
          {todayPayments.length > 0 && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>{todayPayments.length} payment{todayPayments.length !== 1 ? 's' : ''}</p>}
        </div>
        <div style={card}>
          <p style={lbl}>Invoices raised today</p>
          <p style={{ ...val, fontSize: todayInvoicesTotal > 0 ? '18px' : '22px' }}>
            {todayInvoicesTotal > 0 ? fmt(todayInvoicesTotal) : '—'}
          </p>
          {todayInvoices.length > 0 && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>{todayInvoices.length} invoice{todayInvoices.length !== 1 ? 's' : ''}</p>}
        </div>
        {overdue > 0 && (
          <div style={card}>
            <p style={lbl}>Overdue invoices</p>
            <p style={{ ...val, fontSize: '18px', color: '#a32d2d' }}>{fmt(overdue)}</p>
          </div>
        )}
      </div>

      {/* Today's status breakdown */}
      {todayBookings.length > 0 && (
        <div style={{ ...card, marginBottom: '10px' }}>
          <p style={sxn}>TODAY BY STATUS</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {orderedStatuses.map(s => {
              const count = todayByStatus[s.value] ?? 0
              if (!count) return null
              return (
                <div key={s.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: s.color_bg, borderRadius: '20px', padding: '5px 12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: s.color_fg }}>{count}</span>
                  <span style={{ fontSize: '12px', color: s.color_fg }}>{s.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Today's session list */}
      {todayBookings.length > 0 ? (
        <div style={{ ...cardPad, marginBottom: '28px' }}>
          {todayBookings.map((s, i) => {
            const st = statusStyle(s.status)
            const ty = typeStyle(s.session_type)
            return (
              <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.875rem 1.25rem',
                  borderBottom: i < todayBookings.length - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{s.clients?.full_name ?? '—'}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                      {sessionName(s.clients?.full_name, s.booking_ref, s.booking_id, s.session_date)}
                      {s.packages?.name ? ` · ${s.packages.name}` : ''}
                      {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginLeft: '12px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: ty.bg, color: ty.color, fontWeight: '500' }}>{ty.label}</span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500' }}>{st.label}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div style={{ ...card, textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions scheduled for today</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1.5 — THIS WEEK
      ════════════════════════════════════════════════════════════════════ */}
      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>This week</p>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${weekDays.length}, 1fr)`, gap: '8px', marginBottom: '28px' }}>
        {dayStats.map(day => (
          <div key={day.iso} style={{
            background: day.isToday ? 'var(--btn)' : 'var(--surface)',
            border: `1px solid ${day.isToday ? 'var(--btn)' : 'var(--line)'}`,
            borderRadius: '10px', padding: '0.875rem', textAlign: 'center',
          }}>
            <p style={{ fontSize: '11px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: '0 0 6px', fontWeight: '500' }}>
              {day.label}
            </p>
            <p style={{ fontSize: '20px', fontWeight: '700', margin: '0 0 2px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text)' }}>
              {day.sessions}
            </p>
            <p style={{ fontSize: '11px', color: day.isToday ? 'var(--btn-fg)' : 'var(--text-4)', margin: 0, opacity: 0.85 }}>
              {day.sessions === 1 ? 'session' : 'sessions'}
            </p>
            {day.revenue > 0 && (
              <p style={{ fontSize: '11px', fontWeight: '600', margin: '6px 0 0', color: day.isToday ? 'var(--btn-fg)' : '#3b6d11' }}>
                {fmt(day.revenue)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — UPCOMING BY CATEGORY (next 30 days)
      ════════════════════════════════════════════════════════════════════ */}
      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Upcoming — next 30 days
      </p>

      {upcomingBookings.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions in the next 30 days</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {config.sessionTypes.map(type => {
            const sessions = upcomingByType[type.value] ?? []
            return (
              <div key={type.value} style={cardPad}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ ...sxn, margin: 0 }}>{type.label.toUpperCase()}</p>
                  <span style={{ fontSize: '12px', fontWeight: '600', background: type.color_bg, color: type.color_fg, padding: '2px 10px', borderRadius: '20px' }}>
                    {sessions.length}
                  </span>
                </div>
                {sessions.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '0.875rem 1.25rem' }}>None scheduled</p>
                ) : (
                  sessions.slice(0, 6).map((s, i) => {
                    const st = statusStyle(s.status)
                    return (
                      <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{
                          padding: '0.75rem 1.25rem',
                          borderBottom: i < Math.min(sessions.length, 6) - 1 ? '1px solid var(--line-inner)' : 'none',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
                        }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {s.clients?.full_name ?? '—'}
                            </p>
                            <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>
                              {s.session_date ? new Date(s.session_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                              {s.shoot_type ? ` · ${s.shoot_type}` : ''}
                            </p>
                          </div>
                          <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500', flexShrink: 0 }}>
                            {st.label}
                          </span>
                        </div>
                      </Link>
                    )
                  })
                )}
                {sessions.length > 6 && (
                  <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
                    <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                      +{sessions.length - 6} more →
                    </Link>
                  </div>
                )}
              </div>
            )
          })}

          {/* Any session types not in config (edge case) */}
          {Object.entries(upcomingByType)
            .filter(([k]) => !config.sessionTypes.find(t => t.value === k))
            .map(([type, sessions]) => (
              <div key={type} style={cardPad}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ ...sxn, margin: 0 }}>{type.toUpperCase()}</p>
                  <span style={{ fontSize: '12px', fontWeight: '600', background: 'var(--line)', color: 'var(--text-2)', padding: '2px 10px', borderRadius: '20px' }}>
                    {sessions.length}
                  </span>
                </div>
                {sessions.slice(0, 6).map((s, i) => {
                  const st = statusStyle(s.status)
                  return (
                    <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ padding: '0.75rem 1.25rem', borderBottom: i < Math.min(sessions.length, 6) - 1 ? '1px solid var(--line-inner)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px' }}>{s.clients?.full_name ?? '—'}</p>
                          <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0 }}>
                            {s.session_date ? new Date(s.session_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                          </p>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: st.bg, color: st.color, fontWeight: '500', flexShrink: 0 }}>{st.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — ACTIVE PIPELINE BY STATUS
      ════════════════════════════════════════════════════════════════════ */}
      <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Active pipeline</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {orderedStatuses.map(s => {
          const sessions = pipelineByStatus[s.value] ?? []
          if (!sessions.length) return null
          return (
            <div key={s.value} style={cardPad}>
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid var(--line-inner)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', background: s.color_bg, color: s.color_fg, padding: '3px 12px', borderRadius: '20px' }}>{s.label}</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-2)' }}>{sessions.length}</span>
              </div>
              {sessions.slice(0, 5).map((b, i) => (
                <Link key={b.booking_id} href={`/dashboard/sessions/${b.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ padding: '0.75rem 1.25rem', borderBottom: i < Math.min(sessions.length, 5) - 1 ? '1px solid var(--line-inner)' : 'none' }}>
                    <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.clients?.full_name ?? '—'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', margin: 0, fontFamily: 'monospace' }}>
                      {sessionName(b.clients?.full_name, b.booking_ref, b.booking_id, b.session_date)}
                    </p>
                  </div>
                </Link>
              ))}
              {sessions.length > 5 && (
                <div style={{ padding: '0.75rem 1.25rem', borderTop: '1px solid var(--line-inner)' }}>
                  <Link href={`/dashboard/sessions?status=${s.value}`} style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>
                    +{sessions.length - 5} more →
                  </Link>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — FINANCIAL OVERVIEW
      ════════════════════════════════════════════════════════════════════ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
        <p style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-4)', letterSpacing: '.08em', textTransform: 'uppercase', margin: 0 }}>Financial overview</p>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {PRESETS.map(p => (
            <Link
              key={p.value}
              href={`/dashboard/reports?range=${p.value}`}
              style={{
                fontSize: '12px', padding: '4px 10px', borderRadius: '20px', textDecoration: 'none',
                border: `1px solid ${activeRange === p.value ? 'var(--btn)' : 'var(--line)'}`,
                background: activeRange === p.value ? 'var(--btn)' : 'var(--surface)',
                color:      activeRange === p.value ? 'var(--btn-fg)' : 'var(--text-3)',
                fontWeight: activeRange === p.value ? '600' : '400',
              }}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
        <div style={card}>
          <p style={lbl}>
            {activeRange === 'this_month' ? 'Revenue this month' :
             activeRange === 'last_3_months' ? 'Revenue (3 months)' :
             activeRange === 'this_year' ? `Revenue ${year}` :
             'All-time paid'}
          </p>
          <p style={val}>{fmt(activeRange === 'all_time' ? revenueTotal : revenueInRange)}</p>
          {showMoM && momPercent !== null && (
            <p style={{ fontSize: '12px', margin: '4px 0 0', color: momDiff >= 0 ? '#3b6d11' : '#a32d2d' }}>
              {momDiff >= 0 ? '↑' : '↓'} {Math.abs(momPercent)}% vs last month
            </p>
          )}
        </div>
        {activeRange !== 'all_time' && (
          <div style={card}>
            <p style={lbl}>All-time paid</p>
            <p style={val}>{fmt(revenueTotal)}</p>
          </div>
        )}
        <div style={card}>
          <p style={lbl}>Outstanding</p>
          <p style={{ ...val, color: outstanding > 0 ? '#854f0b' : 'var(--text)' }}>{fmt(outstanding)}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>unpaid invoices</p>
        </div>
        {overdue > 0 && (
          <div style={card}>
            <p style={lbl}>Overdue</p>
            <p style={{ ...val, color: '#a32d2d' }}>{fmt(overdue)}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>chasing needed</p>
          </div>
        )}
      </div>

      {/* Revenue bar chart */}
      <div style={{ ...card, marginBottom: '12px' }}>
        <p style={sxn}>REVENUE — LAST 6 MONTHS</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
          {monthlyRevenue.map(({ label, amount }) => {
            const heightPct    = maxMonthly > 0 ? (amount / maxMonthly) * 100 : 0
            const isCurrent    = label === monthLabel(year, month)
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: 0, whiteSpace: 'nowrap' }}>
                  {amount > 0 ? fmt(amount) : ''}
                </p>
                <div style={{
                  width: '100%',
                  height: `${Math.max(heightPct, amount > 0 ? 4 : 0)}%`,
                  background: isCurrent ? 'var(--btn)' : 'var(--line)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: amount > 0 ? '4px' : '0',
                }} />
                <p style={{ fontSize: '10px', color: isCurrent ? 'var(--text)' : 'var(--text-4)', margin: 0, fontWeight: isCurrent ? '600' : '400' }}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
