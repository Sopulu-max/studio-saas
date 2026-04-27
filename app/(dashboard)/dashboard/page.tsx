import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig, getStatusConfig, getSessionTypeConfig } from '@/lib/studio-config'
import DashboardWidgets from './dashboard-widgets'
import type { DashboardProps } from './dashboard-widgets'

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

export default async function DashboardPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const studio = await fetchStudio(context.admin, context.studioId)
  const studioId = studio?.studio_id ?? context.studioId
  const config   = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  // Date helpers
  const todayDate = new Date()
  todayDate.setHours(0, 0, 0, 0)
  const todayStr  = todayDate.toISOString().split('T')[0]
  const in7Days   = new Date(todayDate.getTime() + 7 * 864e5).toISOString().split('T')[0]
  const todayDay  = DAY_NAMES[new Date().getDay()]
  const todayLabel = new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const pendingStatus = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)[0]?.value ?? 'pending_confirmation'

  const activePipelineStatuses = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)
    .slice(2)
    .map(s => s.value)

  const cancellationIn = config.bookingStatuses
    .filter(s => s.is_cancellation || s.is_terminal)
    .map(s => `"${s.value}"`).join(',') || '"__none__"'

  // Booking IDs for invoice scoping
  const { data: allBookings } = await context.admin
    .from('bookings').select('booking_id').eq('studio_id', studioId)
  const bookingIds = allBookings?.map(b => b.booking_id) ?? []

  const [
    { count: totalSessions },
    { count: totalClients },
    { count: pendingCount },
    { data: upcomingSessions },
    { data: activeSessions },
    { data: unpaidInvoices },
    { data: allStaff },
    { data: todayCheckins },
  ] = await Promise.all([
    context.admin.from('bookings').select('*', { count: 'exact', head: true }).eq('studio_id', studioId),
    context.admin.from('clients').select('*',  { count: 'exact', head: true }).eq('studio_id', studioId),
    context.admin.from('bookings').select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId).eq('status', pendingStatus),

    context.admin.from('bookings')
      .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gt('session_date',  todayStr + 'T23:59:59')
      .lte('session_date', in7Days)
      .not('status', 'in', `(${cancellationIn})`)
      .order('session_date', { ascending: true })
      .limit(8),

    activePipelineStatuses.length
      ? context.admin.from('bookings')
          .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name)')
          .eq('studio_id', studioId)
          .in('status', activePipelineStatuses)
          .order('session_date', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),

    bookingIds.length
      ? context.admin.from('invoices').select('invoice_id, total')
          .in('booking_id', bookingIds).in('status', ['draft', 'sent', 'overdue'])
      : Promise.resolve({ data: [] }),

    context.admin.from('staff')
      .select('staff_id, full_name, role, roles, working_days')
      .eq('studio_id', studioId)
      .order('full_name'),

    context.admin.from('staff_checkins')
      .select('staff_id, checked_in_at, checked_out_at')
      .eq('studio_id', studioId)
      .eq('date', todayStr),
  ])

  // Today's sessions
  const { data: todaySessions } = await context.admin
    .from('bookings')
    .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name), packages(name)')
    .eq('studio_id', studioId)
    .gte('session_date', todayStr)
    .lte('session_date', todayStr + 'T23:59:59')
    .not('status', 'in', `(${cancellationIn})`)
    .order('session_date', { ascending: true })

  // Outstanding balance
  type InvRow = { invoice_id: string; total?: number | string | null }
  type PayRow = { amount?: number | string | null }
  const unpaidIds = ((unpaidInvoices ?? []) as InvRow[]).map(i => i.invoice_id)
  const { data: paymentsData } = unpaidIds.length
    ? await context.admin.from('payments').select('amount').in('invoice_id', unpaidIds)
    : { data: [] }
  const invoiceTotal = ((unpaidInvoices ?? []) as InvRow[]).reduce((s, i) => s + Number(i.total), 0)
  const paidTotal    = ((paymentsData  ?? []) as PayRow[]).reduce((s, p) => s + Number(p.amount), 0)
  const outstanding  = Math.max(0, invoiceTotal - paidTotal)
  const fmt = (n: number) => '₦' + n.toLocaleString('en-NG')

  // Explicit types for tables not in generated Supabase definitions
  type DashStaffRow   = { staff_id: string; full_name: string; role: string | null; roles: string[] | null; working_days: string[] | null }
  type DashCheckinRow = { staff_id: string; checked_in_at: string; checked_out_at: string | null }
  const typedStaff    = (allStaff       ?? []) as unknown as DashStaffRow[]
  const typedCheckins = (todayCheckins  ?? []) as unknown as DashCheckinRow[]

  // Today's staff map
  const checkinMap: Record<string, DashCheckinRow> = {}
  for (const c of typedCheckins) checkinMap[c.staff_id] = c
  const staffToday = typedStaff
    .filter(m => !m.working_days?.length || m.working_days.includes(todayDay))
    .map(m => ({ ...m, checkin: checkinMap[m.staff_id] ?? null }))

  // Style lookup maps for client component
  const statusStyles: Record<string, { label: string; color_bg: string; color_fg: string }> = {}
  for (const s of config.bookingStatuses) {
    statusStyles[s.value] = { label: s.label, color_bg: s.color_bg, color_fg: s.color_fg }
  }
  const sessionTypeStyles: Record<string, { label: string; color_bg: string; color_fg: string }> = {}
  for (const t of config.sessionTypes) {
    sessionTypeStyles[t.value] = { label: t.label, color_bg: t.color_bg, color_fg: t.color_fg }
  }

  const pendingCfg = getStatusConfig(config, pendingStatus)

  const stats: DashboardProps['stats'] = [
    { label: 'Total sessions',     value: totalSessions ?? 0,  href: '/dashboard/sessions', sub: null },
    { label: 'Total clients',      value: totalClients  ?? 0,  href: '/dashboard/clients',  sub: null },
    { label: 'Active in pipeline', value: activeSessions?.length ?? 0, href: '/dashboard/sessions',
      sub: activeSessions?.length ? 'in progress / editing' : 'none right now' },
    { label: 'Outstanding balance', value: fmt(outstanding), href: '/dashboard/invoices', money: true,
      sub: outstanding === 0 ? 'all clear' : `${unpaidInvoices?.length ?? 0} unpaid invoice${(unpaidInvoices?.length ?? 0) !== 1 ? 's' : ''}` },
  ]

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  const props: DashboardProps = {
    studioName:        studio?.name ?? 'My Studio',
    studioSlug:        studio?.slug ?? null,
    siteUrl,
    todayLabel,
    pendingCount:      pendingCount ?? 0,
    pendingStatus,
    pendingStyle:      { label: pendingCfg.label, color_bg: pendingCfg.color_bg, color_fg: pendingCfg.color_fg },
    todaySessions:     (todaySessions ?? []) as DashboardProps['todaySessions'],
    upcomingSessions:  (upcomingSessions ?? []) as DashboardProps['upcomingSessions'],
    activeSessions:    (activeSessions  ?? []) as DashboardProps['activeSessions'],
    staffToday:        staffToday as DashboardProps['staffToday'],
    stats,
    statusStyles,
    sessionTypeStyles,
  }

  return <DashboardWidgets {...props} />
}
