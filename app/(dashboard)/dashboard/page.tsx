import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import DashboardWidgets from './dashboard-widgets'
import type { DashboardProps } from './dashboard-widgets'
import { unwrapRow } from "@/lib/utils";

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

type DashboardInvoiceIdRow = { invoice_id: string }
type DashboardPaymentBooking = {
  booking_ref?: number | null
  clients?: { full_name?: string | null } | null
}
type DashboardRecentPayment = {
  amount: number | string
  paid_at: string
  method?: string | null
  invoices?: { bookings?: DashboardPaymentBooking | null } | null
}

export default async function DashboardPage() {
  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const studio  = await fetchStudio(admin, studioId)
  const config  = buildStudioConfig(studio?.session_types, studio?.booking_statuses, studio?.service_types)

  // ── Date helpers ──────────────────────────────────────────────────────────────
  const now        = new Date()
  const todayStr   = now.toISOString().slice(0, 10)         // "2026-04-28"
  const todayEnd   = `${todayStr}T23:59:59`
  const in3DaysEnd  = `${new Date(now.getTime() +  3 * 86_400_000).toISOString().slice(0, 10)}T23:59:59`
  const in14DaysEnd = `${new Date(now.getTime() + 14 * 86_400_000).toISOString().slice(0, 10)}T23:59:59`
  const todayLabel = now.toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayDay   = DAY_NAMES[now.getDay()]

  const year           = now.getFullYear()
  const month          = now.getMonth() + 1
  const thisMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const dayOfWeek      = now.getDay()
  const daysBack       = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday         = new Date(now.getTime() - daysBack * 86_400_000)
  const mondayISO      = monday.toISOString().slice(0, 10)
  // Fetch payments from the earlier of week-start or month-start
  const paymentFrom    = mondayISO < thisMonthStart ? mondayISO : thisMonthStart

  // ── Status configuration ──────────────────────────────────────────────────────
  const activeStatuses = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)

  const pendingStatus = activeStatuses[0]?.value ?? 'pending_confirmation'

  // excludeIn       — terminal + cancelled: used for active/forward-looking queries
  //                   (pipeline, next 3 days, occasions)
  // excludeCancelIn — cancelled only: used for historical counts
  //                   (today's sessions, sessions this week) so that
  //                   delivered/completed sessions are still counted as real work
  const excludeIn = config.bookingStatuses
    .filter(s => s.is_cancellation || s.is_terminal)
    .map(s => `"${s.value}"`).join(',') || '"__none__"'

  const excludeCancelIn = config.bookingStatuses
    .filter(s => s.is_cancellation)
    .map(s => `"${s.value}"`).join(',') || '"__none__"'

  // ── Phase 1: invoice IDs needed to scope payment queries to this studio ────────
  const { data: invoiceIdRows } = await admin
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('bookings.studio_id', studioId)
  const invoiceIds = ((invoiceIdRows ?? []) as DashboardInvoiceIdRow[]).map((row) => row.invoice_id)

  // ── All queries in parallel ───────────────────────────────────────────────────
  const [
    { count: pendingCount },
    { count: overdueCount },
    { data: todayRaw },
    { data: next3Raw },
    { data: pipelineRaw },
    { data: allStaff },
    { data: todayCheckins },
    { data: weekBookingsRaw },
    { data: recentPaymentsRaw },
    { data: outstandingRaw },
    { data: upcomingOccasionsRaw },
  ] = await Promise.all([
    // Pending booking requests
    admin.from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('studio_id', studioId)
      .eq('status', pendingStatus),

    // Overdue invoices — join through bookings (no direct studio_id on invoices)
    admin.from('invoices')
      .select('invoice_id, bookings!inner(studio_id)', { count: 'exact', head: true })
      .eq('bookings.studio_id', studioId)
      .eq('status', 'overdue'),

    // Today's sessions — include terminal (delivered) so completed jobs are still shown
    admin.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, event_date, event_name, bookings!inner(booking_id, booking_ref, status, clients(full_name), packages(name))')
      .eq('studio_id', studioId)
      .gte('session_date', todayStr)
      .lte('session_date', todayEnd)
      .not('bookings.status', 'in', `(${excludeCancelIn})`)
      .order('session_date', { ascending: true }),

    // Next 3 days (tomorrow → +3)
    admin.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, event_date, event_name, bookings!inner(booking_id, booking_ref, status, clients(full_name))')
      .eq('studio_id', studioId)
      .gt('session_date', todayEnd)
      .lte('session_date', in3DaysEnd)
      .not('bookings.status', 'in', `(${excludeIn})`)
      .order('session_date', { ascending: true }),

    // Full active pipeline — all non-terminal, non-cancelled (no date cap)
    admin.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, event_date, event_name, bookings!inner(booking_id, booking_ref, status, clients(full_name))')
      .eq('studio_id', studioId)
      .not('bookings.status', 'in', `(${excludeIn})`)
      .order('session_date', { ascending: false })
      .limit(80),

    // Staff list
    admin.from('staff')
      .select('staff_id, full_name, roles, working_days')
      .eq('studio_id', studioId)
      .order('full_name'),

    // Today's check-ins
    admin.from('staff_checkins')
      .select('staff_id, checked_in_at, checked_out_at')
      .eq('studio_id', studioId)
      .eq('date', todayStr),

    // Sessions this week (Mon → today) — include terminal (delivered) for accurate counts
    admin.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, bookings!inner(booking_id, status, clients(client_id, full_name))')
      .eq('studio_id', studioId)
      .gte('session_date', mondayISO)
      .lte('session_date', todayEnd)
      .not('bookings.status', 'in', `(${excludeCancelIn})`),

    // Payments this week / this month window — with method + client info for today's breakdown
    invoiceIds.length > 0
      ? admin.from('payments')
          .select('amount, paid_at, method, invoices(bookings(booking_ref, clients(full_name)))')
          .in('invoice_id', invoiceIds)
          .gte('paid_at', paymentFrom)
          .lte('paid_at', todayEnd)
      : Promise.resolve({ data: [] as DashboardRecentPayment[] }),

    // Outstanding invoices (draft / sent / overdue) with session + client + payments detail
    admin.from('invoices')
      .select('invoice_id, total, status, due_date, issued_at, payments(amount), bookings!inner(studio_id, booking_ref, clients(full_name), sessions(session_date))')
      .eq('bookings.studio_id', studioId)
      .in('status', ['draft', 'sent', 'overdue'])
      .limit(20),

    // Upcoming category dates — sessions where the actual birthday/wedding/etc.
    // falls in the next 14 days.  Include delivered sessions: the shoot is done
    // but the date still matters — you may want to send wishes or confirm delivery.
    // Only exclude cancellations.
    admin.from('sessions')
      .select('session_id, session_date, session_type, shoot_type, event_date, event_name, bookings!inner(booking_id, booking_ref, status, clients(full_name))')
      .eq('studio_id', studioId)
      .gte('event_date', todayStr)
      .lte('event_date', in14DaysEnd)
      .not('bookings.status', 'in', `(${excludeCancelIn})`)
      .not('shoot_type', 'is', null)
      .order('event_date', { ascending: true })
      .limit(20),
  ])

  // ── Types ─────────────────────────────────────────────────────────────────────
  type SessionRow = {
    session_id: string
    session_date?: string | null; session_type?: string | null
    shoot_type?: string | null; event_date?: string | null; event_name?: string | null
    bookings: {
      booking_id: string; booking_ref?: number | null
      status: string
      clients?: { full_name?: string | null } | null
      packages?: { name?: string | null } | null
    } | null
  }
  type OccasionRow = {
    session_id: string
    event_date: string; event_name?: string | null
    shoot_type?: string | null; session_type?: string | null
    session_date?: string | null
    bookings: {
      booking_id: string; booking_ref?: number | null
      status: string
      clients?: { full_name?: string | null } | null
    } | null
  }
  type StaffRow    = { staff_id: string; full_name: string; role: string | null; roles: string[] | null; working_days: string[] | null }
  type CheckinRow  = { staff_id: string; checked_in_at: string; checked_out_at: string | null }
  type WeekBooking = {
    session_id: string
    session_date: string | null
    session_type: string | null
    shoot_type: string | null
    bookings: {
      booking_id: string
      clients: { client_id: string; full_name: string | null } | null
    } | null
  }
  type RecentPayment = {
    amount:   number | string
    paid_at:  string
    method?:  string | null
    invoices?: { bookings?: { booking_ref?: number | null; clients?: { full_name?: string | null } | null } | null } | null
  }
  type OutstandingInvoiceRow = {
    invoice_id: string; total: number | string | null; status: string
    due_date: string | null; issued_at: string | null
    payments: { amount: number | string }[] | null
    bookings: { booking_ref: number | null; clients: { full_name: string | null } | null; sessions: { session_date: string | null }[] | null } | null
  }

  const todaySessions    = (todayRaw      ?? []) as unknown as SessionRow[]
  const next3Sessions    = (next3Raw      ?? []) as unknown as SessionRow[]
  const pipelineSessions = (pipelineRaw   ?? []) as unknown as SessionRow[]
  const typedStaff       = (allStaff      ?? []) as unknown as StaffRow[]
  const typedCheckins    = (todayCheckins ?? []) as unknown as CheckinRow[]
  const weekBookingsList = (weekBookingsRaw  ?? []) as unknown as WeekBooking[]
  const recentPayments   = (recentPaymentsRaw ?? []) as DashboardRecentPayment[]
  const outstandingInvoices  = (outstandingRaw        ?? []) as unknown as OutstandingInvoiceRow[]
  const upcomingOccasions    = (upcomingOccasionsRaw  ?? []) as unknown as OccasionRow[]

  // ── Staff today ───────────────────────────────────────────────────────────────
  const checkinMap: Record<string, CheckinRow> = {}
  for (const c of typedCheckins) checkinMap[c.staff_id] = c
  const staffToday = typedStaff
    .filter(m => !m.working_days?.length || m.working_days.includes(todayDay))
    .map(m => ({ ...m, checkin: checkinMap[m.staff_id] ?? null }))

  // ── Style lookup maps ─────────────────────────────────────────────────────────
  const statusStyles: Record<string, { label: string; color_bg: string; color_fg: string }> = {}
  for (const s of config.bookingStatuses) {
    statusStyles[s.value] = { label: s.label, color_bg: s.color_bg, color_fg: s.color_fg }
  }
  const sessionTypeStyles: Record<string, { label: string; color_bg: string; color_fg: string }> = {}
  for (const t of config.sessionTypes) {
    sessionTypeStyles[t.value] = { label: t.label, color_bg: t.color_bg, color_fg: t.color_fg }
  }

  // ── Revenue figures ───────────────────────────────────────────────────────────
  const revenueToday = recentPayments
    .filter(p => p.paid_at?.startsWith(todayStr))
    .reduce((s, p) => s + Number(p.amount), 0)
  const revenueWeek  = recentPayments
    .filter(p => p.paid_at && p.paid_at >= mondayISO)
    .reduce((s, p) => s + Number(p.amount), 0)
  const sessionsThisWeek = weekBookingsList.length

  // ── Today's payment breakdown (per-payment + by method) ──────────────────────
  const todayPaymentsList = recentPayments
    .filter(p => p.paid_at?.startsWith(todayStr))
    .map(p => ({
      amount:     Number(p.amount),
      method:     p.method ?? 'other',
      clientName: unwrapRow(unwrapRow(p.invoices?.bookings)?.clients)?.full_name ?? null,
      bookingRef: unwrapRow(p.invoices?.bookings)?.booking_ref ?? null,
      paid_at:    p.paid_at,
    }))

  const todayByMethod: Record<string, number> = {}
  for (const p of todayPaymentsList) {
    todayByMethod[p.method] = (todayByMethod[p.method] ?? 0) + p.amount
  }

  // ── Weekly day strip (Mon → today) ────────────────────────────────────────────
  const weekDays: {
    iso: string; label: string; isToday: boolean
    sessions: number; revenue: number
    byType: Record<string, number>; uniqueClients: number
  }[] = []
  for (
    let d = new Date(monday);
    d.toISOString().slice(0, 10) <= todayStr;
    d = new Date(d.getTime() + 86_400_000)
  ) {
    const iso      = d.toISOString().slice(0, 10)
    const dayBooks = weekBookingsList.filter(b => b.session_date?.startsWith(iso))
    const byType: Record<string, number> = {}
    for (const b of dayBooks) {
      const t = b.session_type ?? 'other'
      byType[t] = (byType[t] ?? 0) + 1
    }
    const clientIds = new Set(dayBooks.map(b => unwrapRow(unwrapRow(b.bookings)?.clients)?.client_id).filter(Boolean))
    weekDays.push({
      iso,
      label:         d.toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday:       iso === todayStr,
      sessions:      dayBooks.length,
      revenue:       recentPayments.filter(p => p.paid_at?.startsWith(iso)).reduce((s, p) => s + Number(p.amount), 0),
      byType,
      uniqueClients: clientIds.size,
    })
  }

  // ── Client list for today ─────────────────────────────────────────────────────
  const todayClientList = weekBookingsList
    .filter(b => b.session_date?.startsWith(todayStr) && unwrapRow(unwrapRow(b.bookings)?.clients)?.full_name)
    .map(b => ({
      clientId:    b.bookings!.clients!.client_id,
      clientName:  b.bookings!.clients!.full_name!,
      sessionType: b.session_type ?? null,
      shootType:   b.shoot_type   ?? null,
      sessionDate: b.session_date ?? null,
    }))

  // ── Week-level shoot category breakdown ───────────────────────────────────────
  const weekByCategory: Record<string, number> = {}
  for (const b of weekBookingsList) {
    if (b.shoot_type) weekByCategory[b.shoot_type] = (weekByCategory[b.shoot_type] ?? 0) + 1
  }

  const draftCount = outstandingInvoices.filter(i => i.status === 'draft').length

  const pendingCfg = config.bookingStatuses.find(s => s.value === pendingStatus)

  const props: DashboardProps = {
    studioName:     studio?.name ?? 'My Studio',
    studioSlug:     studio?.slug ?? null,
    siteUrl:        process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    todayLabel,
    pendingCount:   pendingCount ?? 0,
    pendingStatus,
    pendingStyle: {
      label:    pendingCfg?.label    ?? 'Pending',
      color_bg: pendingCfg?.color_bg ?? '#fdf3e4',
      color_fg: pendingCfg?.color_fg ?? '#854f0b',
    },
    overdueCount:   overdueCount ?? 0,
    todaySessions,
    next3Sessions,
    pipelineSessions,
    activeStatuses: activeStatuses.map(s => ({
      value: s.value, label: s.label, color_bg: s.color_bg, color_fg: s.color_fg,
    })),
    staffToday:     staffToday as DashboardProps['staffToday'],
    sessionTypeStyles,
    sessionTypeValues: config.sessionTypes.map(t => ({
      value: t.value, label: t.label, color_bg: t.color_bg, color_fg: t.color_fg,
    })),
    revenueToday,
    revenueWeek,
    sessionsThisWeek,
    todayPaymentsList,
    todayByMethod,
    weekDays,
    weekByCategory,
    todayClientList,
    upcomingOccasions,
    outstandingInvoices: outstandingInvoices as DashboardProps['outstandingInvoices'],
    draftCount,
  }

  return <DashboardWidgets {...props} />
}
