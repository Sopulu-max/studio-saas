import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStudioContext } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import TodayActions from './today-actions'

type DashboardInvoiceRow = { invoice_id: string; total?: number | string | null }
type DashboardPaymentRow = { amount?: number | string | null }
type DashboardSessionRow = {
  booking_id: string
  session_date?: string | null
  session_type?: string | null
  status: string
  clients?: { full_name?: string | null } | null
  packages?: { name?: string | null } | null
}

function fmt(n: number) {
  return '₦' + n.toLocaleString('en-NG')
}

export default async function DashboardPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { data: studio } = await context.admin
    .from('studios')
    .select('*')
    .eq('studio_id', context.studioId)
    .single()

  const studioId = studio?.studio_id
  const config   = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  // Active pipeline = non-terminal, non-cancellation statuses after the first two (pending + confirmed)
  const activePipelineStatuses = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)
    .slice(2)           // skip the first two (pending → confirmed)
    .map(s => s.value)

  // Pending status value (first non-terminal, non-cancellation by order)
  const pendingStatus = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)[0]?.value ?? 'pending_confirmation'

  // Date helpers
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayStr = todayDate.toISOString().split('T')[0]
  const in7Days  = new Date(todayDate.getTime() + 7 * 864e5).toISOString().split('T')[0]

  // Booking IDs for this studio (needed to scope invoice queries)
  const { data: allBookings } = await context.admin
    .from('bookings')
    .select('booking_id')
    .eq('studio_id', studioId)
  const bookingIds = allBookings?.map(b => b.booking_id) ?? []

  // Parallel data fetches
  const [
    { count: totalSessions },
    { count: totalClients },
    { count: pendingCount },
    { data: upcomingSessions },
    { data: activeSessions },
    { data: unpaidInvoices },
  ] = await Promise.all([
    context.admin.from('bookings').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
    context.admin.from('clients').select('*',  { count: 'exact', head: true }).eq('studio_id', studioId),

    // Pending booking requests
    context.admin.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId).eq('status', pendingStatus),

    // Upcoming sessions — next 7 days
    context.admin.from('bookings')
      .select('booking_id, session_date, session_type, status, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gt('session_date', todayStr + 'T23:59:59')
      .lte('session_date', in7Days)
      .not('status', 'in', `(${config.bookingStatuses.filter(s => s.is_cancellation).map(s => `"${s.value}"`).join(',') || '"__none__"'})`)
      .order('session_date', { ascending: true })
      .limit(8),

    // Active pipeline sessions
    activePipelineStatuses.length
      ? context.admin.from('bookings')
          .select('booking_id, session_date, session_type, status, clients(full_name)')
          .eq('studio_id', studioId)
          .in('status', activePipelineStatuses)
          .order('session_date', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),

    // Unpaid invoices for outstanding balance
    bookingIds.length
      ? context.admin.from('invoices').select('invoice_id, total')
          .in('booking_id', bookingIds).in('status', ['draft', 'sent', 'overdue'])
      : Promise.resolve({ data: [] }),
  ])

  // Today's sessions — separate focused query
  const cancellationValues = config.bookingStatuses.filter(s => s.is_cancellation || s.is_terminal).map(s => `"${s.value}"`).join(',') || '"__none__"'
  const { data: todaySessions } = await context.admin
    .from('bookings')
    .select('booking_id, session_date, session_type, status, clients(full_name), packages(name)')
    .eq('studio_id', studioId)
    .gte('session_date', todayStr)
    .lte('session_date', todayStr + 'T23:59:59')
    .not('status', 'in', `(${cancellationValues})`)
    .order('session_date', { ascending: true })

  // Outstanding balance
  const unpaidIds = ((unpaidInvoices ?? []) as DashboardInvoiceRow[]).map(i => i.invoice_id)
  const { data: paymentsOnUnpaid } = unpaidIds.length
    ? await context.admin.from('payments').select('amount').in('invoice_id', unpaidIds)
    : { data: [] }

  const invoiceTotal    = ((unpaidInvoices    ?? []) as DashboardInvoiceRow[]).reduce((s, i) => s + Number(i.total),  0)
  const paidAgainstThem = ((paymentsOnUnpaid  ?? []) as DashboardPaymentRow[]).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding     = Math.max(0, invoiceTotal - paidAgainstThem)

  const todayLabel = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Pending status badge style for the banner
  const pendingCfg = getStatusConfig(config, pendingStatus)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '500', margin: '0 0 2px' }}>Welcome back</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>{studio?.name}</p>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0, paddingTop: '4px' }}>{todayLabel}</p>
      </div>

      {/* Pending requests banner */}
      {(pendingCount ?? 0) > 0 && (
        <Link href={`/dashboard/sessions?status=${pendingStatus}`} style={{ textDecoration: 'none' }}>
          <div style={{ background: pendingCfg.color_bg, border: `0.5px solid ${pendingCfg.color_fg}40`, borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: pendingCfg.color_fg }}>
              🔔 {pendingCount} pending booking request{pendingCount !== 1 ? 's' : ''} — needs your response
            </span>
            <span style={{ fontSize: '13px', color: pendingCfg.color_fg }}>Review →</span>
          </div>
        </Link>
      )}

      {/* Today's sessions */}
      {(todaySessions?.length ?? 0) > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>TODAY</p>
            <span style={{ fontSize: '12px', color: 'var(--text-4)' }}>{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <div>
            {(todaySessions as DashboardSessionRow[]).map((s, i) => {
              const statusCfg = getStatusConfig(config, s.status)
              const typeCfg   = getSessionTypeConfig(config, s.session_type)
              return (
                <div key={s.booking_id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: i < (todaySessions?.length ?? 0) - 1 ? '1px solid var(--line-inner)' : 'none',
                }}>
                  <Link href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px' }}>{s.clients?.full_name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                          {s.session_date ? new Date(s.session_date).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) : ''}
                          {s.packages?.name ? ` · ${s.packages.name}` : ''}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: typeCfg.color_bg, color: typeCfg.color_fg }}>
                      {typeCfg.label}
                    </span>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500' }}>
                      {statusCfg.label}
                    </span>
                    <TodayActions sessionId={s.booking_id} status={s.status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total sessions',     value: totalSessions ?? 0,  href: '/dashboard/sessions', sub: null },
          { label: 'Total clients',      value: totalClients  ?? 0,  href: '/dashboard/clients',  sub: null },
          { label: 'Active in pipeline', value: activeSessions?.length ?? 0, href: '/dashboard/sessions', sub: activeSessions?.length ? 'in progress / editing' : 'none right now' },
          { label: 'Outstanding balance', value: fmt(outstanding), href: '/dashboard/invoices', sub: outstanding === 0 ? 'all clear' : `${unpaidInvoices?.length ?? 0} unpaid invoice${(unpaidInvoices?.length ?? 0) !== 1 ? 's' : ''}`, money: true },
        ].map(stat => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem', transition: 'border-color .15s' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: '0 0 8px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '.04em' }}>{stat.label}</p>
              <p style={{ fontSize: (stat as any).money ? '22px' : '30px', fontWeight: '600', margin: '0 0 4px', color: 'var(--text)', letterSpacing: (stat as any).money ? '-.02em' : '-.01em' }}>
                {stat.value}
              </p>
              {stat.sub && <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>{stat.sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      {/* Main content — two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>

        {/* Upcoming this week */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>UPCOMING THIS WEEK</p>
            <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All →</Link>
          </div>

          {!upcomingSessions?.length ? (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 12px' }}>No sessions in the next 7 days</p>
              <Link href="/dashboard/sessions/new" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none' }}>+ New session</Link>
            </>
          ) : (
            <div>
              {(upcomingSessions as DashboardSessionRow[]).map((s, i) => {
                const statusCfg = getStatusConfig(config, s.status)
                const typeCfg   = getSessionTypeConfig(config, s.session_type)
                return (
                  <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '9px 0',
                      borderBottom: i < upcomingSessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: '500', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {s.clients?.full_name}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--text-4)', margin: 0 }}>
                          {s.session_date ? new Date(s.session_date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                          {s.packages?.name ? ` · ${s.packages.name}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0, marginLeft: '8px' }}>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: typeCfg.color_bg, color: typeCfg.color_fg, fontWeight: '500' }}>
                          {typeCfg.label}
                        </span>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500' }}>
                          {statusCfg.label}
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Active pipeline */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: 0 }}>ACTIVE PIPELINE</p>
            <Link href="/dashboard/sessions" style={{ fontSize: '12px', color: 'var(--link)', textDecoration: 'none' }}>All →</Link>
          </div>

          {!activeSessions?.length ? (
            <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: 0 }}>Nothing in progress right now</p>
          ) : (
            <div>
              {(activeSessions as DashboardSessionRow[]).map((s, i) => {
                const statusCfg = getStatusConfig(config, s.status)
                return (
                  <Link key={s.booking_id} href={`/dashboard/sessions/${s.booking_id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < activeSessions.length - 1 ? '1px solid var(--line-inner)' : 'none',
                    }}>
                      <p style={{ fontSize: '14px', fontWeight: '500', margin: 0 }}>{s.clients?.full_name}</p>
                      <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: statusCfg.color_bg, color: statusCfg.color_fg, fontWeight: '500' }}>
                        {statusCfg.label}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions + booking link */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 12px' }}>QUICK ACTIONS</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'New session', href: '/dashboard/sessions/new' },
              { label: 'New invoice', href: '/dashboard/invoices/new' },
              { label: 'Add client',  href: '/dashboard/clients/new' },
              { label: 'Print order', href: '/dashboard/print-orders/new' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--line)', color: 'var(--text)', textDecoration: 'none', background: 'var(--surface)' }}>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', padding: '1.25rem' }}>
          <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-3)', margin: '0 0 4px' }}>YOUR BOOKING LINK</p>
          {!studio?.slug ? (
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px', lineHeight: '1.5' }}>
                Set a URL slug in Settings to get your public booking link.
              </p>
              <Link href="/dashboard/settings" style={{ fontSize: '13px', color: 'var(--link)', textDecoration: 'none', fontWeight: '500' }}>
                Go to Settings →
              </Link>
            </div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--text-4)', margin: '0 0 10px' }}>Share with clients to receive booking requests.</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <code style={{ fontSize: '12px', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: '8px', border: '1px solid var(--line)', flex: 1, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {siteUrl}/book/{studio.slug}
                </code>
                <Link href={`/book/${studio.slug}`} target="_blank" rel="noreferrer"
                  style={{ padding: '6px 12px', fontSize: '12px', background: 'var(--btn)', color: 'var(--btn-fg)', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                  Open ↗
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
