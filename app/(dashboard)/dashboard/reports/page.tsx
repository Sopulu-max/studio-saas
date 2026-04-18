import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

export default async function ReportsPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: studioRow } = await context.admin
    .from('studios')
    .select('session_types, service_types, booking_statuses')
    .eq('studio_id', context.studioId)
    .single()
  const config = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1  // 1-based

  // Month boundaries
  const thisMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastMonthDate  = new Date(year, month - 2, 1)
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`

  const [
    { data: allInvoices },
    { data: allBookings },
    { data: recentSessions },
  ] = await Promise.all([
    context.admin
      .from('invoices')
      .select('total, status, issued_at')
      .eq('studio_id', context.studioId),
    context.admin
      .from('bookings')
      .select('booking_id, session_date, status, session_type, outfits_count, clients(full_name), packages(name, base_price)')
      .eq('studio_id', context.studioId)
      .not('status', 'eq', 'cancelled'),
    context.admin
      .from('bookings')
      .select('booking_id, session_date, status, session_type, clients(full_name), packages(name)')
      .eq('studio_id', context.studioId)
      .order('session_date', { ascending: false })
      .limit(8),
  ])

  const invoices  = allInvoices  ?? []
  const bookings  = allBookings  ?? []

  // ── Revenue stats ──────────────────────────────────────────────────────────
  const paidInvoices = invoices.filter(i => i.status === 'paid')

  const revenueTotal     = paidInvoices.reduce((s, i) => s + Number(i.total), 0)
  const revenueThisMonth = paidInvoices
    .filter(i => i.issued_at >= thisMonthStart)
    .reduce((s, i) => s + Number(i.total), 0)
  const revenueLastMonth = paidInvoices
    .filter(i => i.issued_at >= lastMonthStart && i.issued_at < thisMonthStart)
    .reduce((s, i) => s + Number(i.total), 0)

  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'draft')
    .reduce((s, i) => s + Number(i.total), 0)

  // Month-over-month trend
  const momDiff    = revenueThisMonth - revenueLastMonth
  const momPercent = revenueLastMonth > 0 ? Math.round((momDiff / revenueLastMonth) * 100) : null

  // ── Revenue by month (last 6 months) ──────────────────────────────────────
  const monthlyRevenue: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d    = new Date(year, month - 1 - i, 1)
    const y    = d.getFullYear()
    const m    = d.getMonth() + 1
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const toD  = new Date(y, m, 1)
    const to   = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}-01`
    const amt  = paidInvoices
      .filter(inv => inv.issued_at >= from && inv.issued_at < to)
      .reduce((s, inv) => s + Number(inv.total), 0)
    monthlyRevenue.push({ label: monthLabel(y, m), amount: amt })
  }

  // ── Sessions by status ────────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {}
  for (const b of bookings) {
    const st = b.status ?? 'unknown'
    statusCounts[st] = (statusCounts[st] ?? 0) + 1
  }

  // Dynamic — from studio config
  const getStatusStyle  = (v: string) => { const s = getStatusConfig(config, v);  return { bg: s.color_bg, color: s.color_fg } }
  const getStatusLabel  = (v: string) => getStatusConfig(config, v).label
  const getTypeStyle    = (v: string) => { const t = getSessionTypeConfig(config, v); return { bg: t.color_bg, color: t.color_fg } }
  const getTypeLabel    = (v: string) => getSessionTypeConfig(config, v).label

  // ── Sessions by type ──────────────────────────────────────────────────────
  const typeCounts: Record<string, number> = {}
  for (const b of bookings) {
    const t = b.session_type ?? 'studio'
    typeCounts[t] = (typeCounts[t] ?? 0) + 1
  }

  // ── Max value for bar chart ────────────────────────────────────────────────
  const maxMonthly = Math.max(...monthlyRevenue.map(m => m.amount), 1)

  const cardStyle = { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }
  const labelStyle = { fontSize: '12px', color: 'var(--text-4)', margin: '0 0 4px' }
  const valueStyle = { fontSize: '22px', fontWeight: '600', margin: 0 }

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 4px' }}>Reports</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>Studio overview</p>
      </div>

      {/* Top KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={cardStyle}>
          <p style={labelStyle}>Revenue this month</p>
          <p style={valueStyle}>{fmt(revenueThisMonth)}</p>
          {momPercent !== null && (
            <p style={{ fontSize: '12px', margin: '4px 0 0', color: momDiff >= 0 ? '#3b6d11' : '#a32d2d' }}>
              {momDiff >= 0 ? '↑' : '↓'} {Math.abs(momPercent)}% vs last month
            </p>
          )}
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Total paid revenue</p>
          <p style={valueStyle}>{fmt(revenueTotal)}</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Outstanding</p>
          <p style={{ ...valueStyle, color: outstanding > 0 ? '#854f0b' : 'var(--text)' }}>{fmt(outstanding)}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>unpaid invoices</p>
        </div>
        <div style={cardStyle}>
          <p style={labelStyle}>Total sessions</p>
          <p style={valueStyle}>{bookings.length}</p>
          <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '4px 0 0' }}>excluding cancelled</p>
        </div>
      </div>

      {/* Revenue bar chart */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 16px' }}>REVENUE — LAST 6 MONTHS</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '120px' }}>
          {monthlyRevenue.map(({ label, amount }) => {
            const heightPct = maxMonthly > 0 ? (amount / maxMonthly) * 100 : 0
            const isCurrentMonth = label === monthLabel(year, month)
            return (
              <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-4)', margin: 0, whiteSpace: 'nowrap' }}>
                  {amount > 0 ? fmt(amount) : ''}
                </p>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(heightPct, amount > 0 ? 4 : 0)}%`,
                    background: isCurrentMonth ? 'var(--btn)' : 'var(--line)',
                    borderRadius: '4px 4px 0 0',
                    minHeight: amount > 0 ? '4px' : '0',
                  }}
                />
                <p style={{ fontSize: '10px', color: isCurrentMonth ? 'var(--text)' : 'var(--text-4)', margin: 0, fontWeight: isCurrentMonth ? '600' : '400' }}>
                  {label}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        {/* Sessions by status */}
        <div style={cardStyle}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>SESSIONS BY STATUS</p>
          {Object.entries(statusCounts).length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions yet</p>
          ) : (
            Object.entries(statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => {
                const c = getStatusStyle(status)
                return (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '20px', background: c.bg, color: c.color, fontWeight: '500', width: 'fit-content' }}>
                      {getStatusLabel(status)}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>{count}</span>
                  </div>
                )
              })
          )}
        </div>

        {/* Sessions by type */}
        <div style={cardStyle}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>SESSIONS BY TYPE</p>
          {Object.entries(typeCounts).length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>No sessions yet</p>
          ) : (
            Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const c = getTypeStyle(type)
                const total = bookings.length
                const pct = total > 0 ? Math.round((count / total) * 100) : 0
                return (
                  <div key={type} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{getTypeLabel(type)}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-3)' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c.color, borderRadius: '3px' }} />
                    </div>
                  </div>
                )
              })
          )}
        </div>
      </div>

      {/* Recent sessions */}
      <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--line-inner)' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>RECENT SESSIONS</p>
        </div>
        {!recentSessions?.length ? (
          <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, padding: '1rem 1.25rem' }}>No sessions yet</p>
        ) : (
          recentSessions.map((s: any, i: number) => {
            const sc = getStatusStyle(s.status ?? '')
            return (
              <a key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit',
                borderBottom: i < recentSessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
              }}>
                <div>
                  <p style={{ fontSize: '14px', margin: '0 0 2px' }}>{(s.clients as any)?.full_name ?? '—'}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: 0 }}>
                    {s.session_date
                      ? new Date(s.session_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                    {(s.packages as any)?.name ? ` · ${(s.packages as any).name}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '20px', background: sc.bg, color: sc.color, fontWeight: '500', width: 'fit-content' }}>
                  {getStatusLabel(s.status ?? '')}
                </span>
              </a>
            )
          })
        )}
      </div>
    </div>
  )
}
