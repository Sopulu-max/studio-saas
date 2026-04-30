import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import ReportsView from './reports-view'
import type { ReportsViewProps } from './reports-view'

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' })
}

function isoToMonth(iso: string) {
  return iso.slice(0, 7) // "2026-04-29" → "2026-04"
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; tab?: string }>
}) {
  const { range = 'this_month', from: fromParam, to: toParam, tab = 'revenue' } = await searchParams

  const context = await getStudioContext()
  if ('error' in context) redirect('/login')

  const { admin, studioId } = context
  const studioRow = await fetchStudio(admin, studioId)
  const config    = buildStudioConfig(studioRow?.session_types, studioRow?.booking_statuses, studioRow?.service_types)

  // ── Date constants ─────────────────────────────────────────────────────────
  const now         = new Date()
  const year        = now.getFullYear()
  const month       = now.getMonth() + 1
  const todayISO    = now.toISOString().slice(0, 10)
  const todayEnd    = `${todayISO}T23:59:59`
  const tomorrow    = new Date(now.getTime() + 86_400_000).toISOString().slice(0, 10)
  const next30ISO   = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10)
  const next30End   = `${next30ISO}T23:59:59`
  const thisMonthStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastMonthDate  = new Date(year, month - 2, 1)
  const lastMonthStart = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}-01`
  const dayOfWeek   = now.getDay()
  const daysBack    = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday      = new Date(now.getTime() - daysBack * 86_400_000)
  const mondayISO   = monday.toISOString().slice(0, 10)

  // ── Date range resolution ─────────────────────────────────────────────────
  const activeRange = (fromParam || toParam) ? 'custom' : range
  let finFrom: string | null = null
  let finTo:   string | null = null
  if (activeRange === 'custom') {
    finFrom = fromParam ?? null
    finTo   = toParam   ?? null
  } else if (activeRange === 'this_month') {
    finFrom = thisMonthStart
  } else if (activeRange === 'last_3_months') {
    const d3 = new Date(year, month - 4, 1)
    finFrom = `${d3.getFullYear()}-${String(d3.getMonth() + 1).padStart(2, '0')}-01`
  } else if (activeRange === 'this_year') {
    finFrom = `${year}-01-01`
  }

  // Cancellation status values
  const cancelValues = config.bookingStatuses.filter(s => s.is_cancellation).map(s => s.value)
  const terminalValues = config.bookingStatuses.filter(s => s.is_terminal && !s.is_cancellation).map(s => s.value)
  const cancelIn = cancelValues.length > 0 ? `(${cancelValues.map(v => `"${v}"`).join(',')})` : '("__none__")'

  // ── Phase 1: Invoice IDs scoped to this studio ─────────────────────────────
  const { data: invoiceIdRows } = await admin
    .from('invoices')
    .select('invoice_id, bookings!inner(studio_id)')
    .eq('bookings.studio_id', studioId)
  const invoiceIds = ((invoiceIdRows ?? []) as { invoice_id: string }[]).map((row) => row.invoice_id)

  // ── Phase 2: All queries in parallel ──────────────────────────────────────
  const [
    { data: allBookingsRaw },
    { data: todayBookingsRaw },
    { data: upcomingBookingsRaw },
    { data: weekBookingsRaw },
    { data: allInvoicesRaw },
    { data: allPaymentsRaw },
    { data: weekPaymentsRaw },
    { data: allClientsRaw },
    { data: allStaffRaw },
    { data: bookingStaffRaw },
    { data: checkinsRaw },
    { data: allPackagesRaw },
    { data: contractsRaw },
  ] = await Promise.all([

    // All bookings (including cancelled for stats)
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, status, session_type, service_type, shoot_type, package_id, client_id, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .order('session_date', { ascending: true }),

    // Today
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, status, session_type, service_type, shoot_type, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gte('session_date', todayISO)
      .lte('session_date', todayEnd)
      .not('status', 'in', cancelIn)
      .order('session_date'),

    // Upcoming — tomorrow to +30 days
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, status, session_type, service_type, shoot_type, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gt('session_date', todayEnd)
      .lte('session_date', next30End)
      .not('status', 'in', cancelIn)
      .order('session_date'),

    // This week (Mon → today)
    admin.from('bookings')
      .select('booking_id, session_date, status')
      .eq('studio_id', studioId)
      .gte('session_date', mondayISO)
      .lte('session_date', todayEnd)
      .not('status', 'in', cancelIn),

    // All invoices with booking join for session context
    admin.from('invoices')
      .select('invoice_id, total, status, issued_at, due_date, booking_id, bookings!inner(studio_id, session_type, service_type, client_id)')
      .eq('bookings.studio_id', studioId),

    // All payments (all-time) with method
    invoiceIds.length > 0
      ? admin.from('payments')
          .select('amount, paid_at, method, invoice_id')
          .in('invoice_id', invoiceIds)
      : Promise.resolve({ data: [] }),

    // Payments this week
    invoiceIds.length > 0
      ? admin.from('payments')
          .select('amount, paid_at')
          .in('invoice_id', invoiceIds)
          .gte('paid_at', mondayISO)
          .lte('paid_at', todayEnd)
      : Promise.resolve({ data: [] }),

    // All clients
    admin.from('clients')
      .select('client_id, full_name, created_at')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false }),

    // All staff
    admin.from('staff')
      .select('staff_id, full_name, role, roles, working_days')
      .eq('studio_id', studioId)
      .order('full_name'),

    // Booking staff — join through bookings to scope to this studio
    admin.from('booking_staff')
      .select('staff_id, role, booking_id, bookings!inner(studio_id, session_date, status)')
      .eq('bookings.studio_id', studioId),

    // Staff check-ins in range (or last 90 days if no range)
    admin.from('staff_checkins')
      .select('staff_id, date, checked_in_at, checked_out_at')
      .eq('studio_id', studioId)
      .gte('date', finFrom ?? new Date(now.getTime() - 90 * 86_400_000).toISOString().slice(0, 10))
      .lte('date', finTo ?? todayISO),

    // All packages
    admin.from('packages')
      .select('package_id, name, base_price')
      .eq('studio_id', studioId)
      .order('name'),

    // Contracts — just booking_id to detect coverage
    admin.from('contracts')
      .select('booking_id, bookings!inner(studio_id)')
      .eq('bookings.studio_id', studioId),
  ])

  // ── Type assertions ────────────────────────────────────────────────────────
  type BRow = {
    booking_id: string; booking_ref?: number | null
    session_date?: string | null; status: string
    session_type?: string | null; service_type?: string | null
    shoot_type?: string | null; package_id?: string | null; client_id?: string | null
    clients?: { full_name?: string | null } | null
    packages?: { name?: string | null } | null
  }
  type InvoiceRow = {
    invoice_id: string; total: number | string; status: string
    issued_at?: string | null; due_date?: string | null; booking_id?: string | null
    bookings?: { studio_id: string; session_type?: string | null; service_type?: string | null; client_id?: string | null } | null
  }
  type PaymentRow = { amount: number | string; paid_at: string; method?: string; invoice_id?: string }
  type ClientRow  = { client_id: string; full_name: string; created_at?: string | null }
  type StaffRow   = { staff_id: string; full_name: string; role?: string | null; roles?: string[] | null; working_days?: string[] | null }
  type BStaffRow  = { staff_id: string; role: string; booking_id: string; bookings?: { studio_id: string; session_date?: string | null; status?: string } | null }
  type CheckinRow = { staff_id: string; date: string; checked_in_at: string; checked_out_at?: string | null }
  type PackageRow = { package_id: string; name: string; base_price?: number | string | null }

  const allBookings     = (allBookingsRaw     ?? []) as unknown as BRow[]
  const todayBookings   = (todayBookingsRaw   ?? []) as unknown as BRow[]
  const upcomingBookings= (upcomingBookingsRaw?? []) as unknown as BRow[]
  const weekBookings    = (weekBookingsRaw    ?? []) as unknown as { booking_id: string; session_date?: string | null; status: string }[]
  const allInvoices     = (allInvoicesRaw     ?? []) as unknown as InvoiceRow[]
  const allPayments     = (allPaymentsRaw     ?? []) as unknown as PaymentRow[]
  const weekPayments    = (weekPaymentsRaw    ?? []) as unknown as { amount: number | string; paid_at: string }[]
  const allClients      = (allClientsRaw      ?? []) as unknown as ClientRow[]
  const allStaff        = (allStaffRaw        ?? []) as unknown as StaffRow[]
  const bookingStaff    = (bookingStaffRaw    ?? []) as unknown as BStaffRow[]
  const checkins        = (checkinsRaw        ?? []) as unknown as CheckinRow[]
  const allPackages     = (allPackagesRaw     ?? []) as unknown as PackageRow[]
  const contracts       = (contractsRaw       ?? []) as unknown as { booking_id: string }[]

  // ── Payment range filter ───────────────────────────────────────────────────
  function payInRange(p: PaymentRow) {
    if (finFrom && p.paid_at < finFrom) return false
    if (finTo   && p.paid_at > finTo + 'T23:59:59') return false
    return true
  }
  const rangePayments = allPayments.filter(payInRange)

  // ── Booking range filter (by session_date) ────────────────────────────────
  function bookingInRange(b: BRow) {
    if (!b.session_date) return false
    const d = b.session_date.slice(0, 10)
    if (finFrom && d < finFrom) return false
    if (finTo   && d > finTo)   return false
    return true
  }
  const rangeBookings = allBookings.filter(bookingInRange)

  // ── REVENUE computations ───────────────────────────────────────────────────
  const revenueInRange   = rangePayments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueAllTime   = allPayments.reduce((s, p) => s + Number(p.amount), 0)
  const revenueThisMonth = allPayments.filter(p => p.paid_at >= thisMonthStart).reduce((s, p) => s + Number(p.amount), 0)
  const revenueLastMonth = allPayments.filter(p => p.paid_at >= lastMonthStart && p.paid_at < thisMonthStart).reduce((s, p) => s + Number(p.amount), 0)

  // Build a map of how much has already been paid against each invoice
  // so we can show the REMAINING balance, not the full invoice total.
  const invoicePaidMap: Record<string, number> = {}
  for (const p of allPayments) {
    if (p.invoice_id) invoicePaidMap[p.invoice_id] = (invoicePaidMap[p.invoice_id] ?? 0) + Number(p.amount)
  }
  function invoiceBalance(inv: InvoiceRow) {
    const paid = invoicePaidMap[inv.invoice_id] ?? 0
    return Math.max(Number(inv.total ?? 0) - paid, 0)
  }

  const outstanding = allInvoices
    .filter(i => i.status === 'sent' || i.status === 'draft')
    .reduce((s, i) => s + invoiceBalance(i), 0)
  const overdue = allInvoices
    .filter(i => i.status === 'overdue')
    .reduce((s, i) => s + invoiceBalance(i), 0)

  // Payment method breakdown (range payments)
  const methodMap: Record<string, { amount: number; count: number }> = {}
  for (const p of rangePayments) {
    const m = p.method ?? 'other'
    if (!methodMap[m]) methodMap[m] = { amount: 0, count: 0 }
    methodMap[m].amount += Number(p.amount)
    methodMap[m].count  += 1
  }
  const paymentsByMethod = Object.entries(methodMap)
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.amount - a.amount)

  // Invoice lookup maps (for joining payments → session type)
  const invoiceToBooking: Record<string, string> = {}
  const bookingToSessionType: Record<string, string> = {}
  const bookingToServiceType: Record<string, string> = {}
  for (const inv of allInvoices) {
    if (inv.invoice_id && inv.booking_id) invoiceToBooking[inv.invoice_id] = inv.booking_id
    if (inv.booking_id && inv.bookings?.session_type) bookingToSessionType[inv.booking_id] = inv.bookings.session_type
    if (inv.booking_id && inv.bookings?.service_type) bookingToServiceType[inv.booking_id] = inv.bookings.service_type
  }

  // Revenue by session type (range payments)
  const revByType: Record<string, number> = {}
  for (const p of rangePayments) {
    if (!p.invoice_id) continue
    const bId = invoiceToBooking[p.invoice_id]
    if (!bId) continue
    const t = bookingToSessionType[bId] ?? 'other'
    revByType[t] = (revByType[t] ?? 0) + Number(p.amount)
  }
  const revenueBySessionType = config.sessionTypes.map(t => ({
    type: t.value, label: t.label, color_bg: t.color_bg, color_fg: t.color_fg,
    amount: revByType[t.value] ?? 0,
    count: rangeBookings.filter(b => b.session_type === t.value && !cancelValues.includes(b.status)).length,
  })).filter(t => t.amount > 0 || t.count > 0)

  // Revenue by service type (range payments)
  const revByService: Record<string, number> = {}
  for (const p of rangePayments) {
    if (!p.invoice_id) continue
    const bId = invoiceToBooking[p.invoice_id]
    if (!bId) continue
    const t = bookingToServiceType[bId] ?? 'other'
    revByService[t] = (revByService[t] ?? 0) + Number(p.amount)
  }
  const revenueByServiceType = config.serviceTypes.map(t => ({
    type: t.value, label: t.label, color_bg: t.color_bg, color_fg: t.color_fg,
    amount: revByService[t.value] ?? 0,
    count: rangeBookings.filter(b => b.service_type === t.value && !cancelValues.includes(b.status)).length,
  })).filter(t => t.amount > 0 || t.count > 0)

  // Monthly revenue bar chart (last 6 months, always all-time payments)
  const monthlyRevenue: { label: string; amount: number; monthKey: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d    = new Date(year, month - 1 - i, 1)
    const y    = d.getFullYear()
    const m    = d.getMonth() + 1
    const from = `${y}-${String(m).padStart(2, '0')}-01`
    const toD  = new Date(y, m, 1)
    const to   = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}-01`
    const amt  = allPayments.filter(p => p.paid_at >= from && p.paid_at < to).reduce((s, p) => s + Number(p.amount), 0)
    monthlyRevenue.push({ label: monthLabel(y, m), amount: amt, monthKey: from.slice(0, 7) })
  }

  // ── SESSIONS computations ──────────────────────────────────────────────────
  const activeBookings   = allBookings.filter(b => !cancelValues.includes(b.status))
  const cancelledInRange = rangeBookings.filter(b => cancelValues.includes(b.status)).length
  const completedInRange = rangeBookings.filter(b => terminalValues.includes(b.status)).length

  // Breakdown by session type (in range, non-cancelled)
  const sessionsByType = config.sessionTypes.map(t => ({
    type: t.value, label: t.label, color_bg: t.color_bg, color_fg: t.color_fg,
    count: rangeBookings.filter(b => b.session_type === t.value && !cancelValues.includes(b.status)).length,
  })).filter(t => t.count > 0)

  // Breakdown by service type (in range, non-cancelled)
  const sessionsByService = config.serviceTypes.map(t => ({
    type: t.value, label: t.label, color_bg: t.color_bg, color_fg: t.color_fg,
    count: rangeBookings.filter(b => b.service_type === t.value && !cancelValues.includes(b.status)).length,
  })).filter(t => t.count > 0)

  // Breakdown by shoot category (in range, non-cancelled, non-empty)
  const categoryMap: Record<string, number> = {}
  for (const b of rangeBookings) {
    if (cancelValues.includes(b.status)) continue
    const cat = (b.shoot_type ?? '').trim()
    if (!cat) continue
    categoryMap[cat] = (categoryMap[cat] ?? 0) + 1
  }
  const sessionsByCategory = Object.entries(categoryMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // Monthly session counts (last 6 months)
  const monthlySessionCounts: { label: string; count: number; monthKey: string }[] = []
  for (let i = 5; i >= 0; i--) {
    const d    = new Date(year, month - 1 - i, 1)
    const y    = d.getFullYear()
    const m2   = d.getMonth() + 1
    const from = `${y}-${String(m2).padStart(2, '0')}-01`
    const toD  = new Date(y, m2, 1)
    const to   = `${toD.getFullYear()}-${String(toD.getMonth() + 1).padStart(2, '0')}-01`
    const cnt  = allBookings.filter(b => b.session_date && b.session_date >= from && b.session_date < to && !cancelValues.includes(b.status)).length
    monthlySessionCounts.push({ label: monthLabel(y, m2), count: cnt, monthKey: from.slice(0, 7) })
  }

  // Weekly strip (Mon → today)
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
  const weekStrip = weekDays.map(day => ({
    ...day,
    sessions: weekBookings.filter(b => b.session_date?.startsWith(day.iso)).length,
    revenue:  weekPayments.filter(p => p.paid_at?.startsWith(day.iso)).reduce((s, p) => s + Number(p.amount), 0),
  }))

  // ── PIPELINE computations ─────────────────────────────────────────────────
  // Active pipeline = non-cancelled AND non-terminal (excludes delivered).
  // Terminal sessions are completed work — they belong in history, not the pipeline.
  const activeStatuses = config.bookingStatuses
    .filter(s => !s.is_cancellation && !s.is_terminal)
    .sort((a, b) => a.order - b.order)
  const pipelineByStatus = activeStatuses.map(s => ({
    value: s.value, label: s.label, color_bg: s.color_bg, color_fg: s.color_fg,
    sessions: activeBookings
      .filter(b => b.status === s.value)
      .map(b => ({
        booking_id: b.booking_id, booking_ref: b.booking_ref ?? null,
        session_date: b.session_date ?? null, status: b.status,
        session_type: b.session_type ?? null, shoot_type: b.shoot_type ?? null,
        client_name: b.clients?.full_name ?? null,
      })),
  })).filter(s => s.sessions.length > 0)

  // Sessions missing invoice (active, non-terminal)
  const invoicedBookingIds = new Set(allInvoices.map(i => i.booking_id).filter(Boolean))
  const contractedBookingIds = new Set(contracts.map(c => c.booking_id))
  const activeNonTerminal = activeBookings.filter(b => !terminalValues.includes(b.status))
  const noInvoiceCount  = activeNonTerminal.filter(b => !invoicedBookingIds.has(b.booking_id)).length
  const noContractCount = activeNonTerminal.filter(b => !contractedBookingIds.has(b.booking_id)).length

  // ── CLIENTS computations ──────────────────────────────────────────────────
  const totalClients = allClients.length

  // New clients in range: clients whose first booking falls within the range
  const clientFirstBooking: Record<string, string> = {}
  for (const b of allBookings) {
    if (!b.client_id || !b.session_date) continue
    const d = b.session_date.slice(0, 10)
    if (!clientFirstBooking[b.client_id] || d < clientFirstBooking[b.client_id]) {
      clientFirstBooking[b.client_id] = d
    }
  }

  const clientsInRange = new Set(
    rangeBookings.filter(b => b.client_id && !cancelValues.includes(b.status)).map(b => b.client_id as string)
  )
  let newInRange = 0, returningInRange = 0
  for (const cid of clientsInRange) {
    const first = clientFirstBooking[cid]
    const isNew = first && (!finFrom || first >= finFrom)
    if (isNew) newInRange++; else returningInRange++
  }

  // Top clients by session count (in range)
  const clientSessionCount: Record<string, number> = {}
  const clientLastSession: Record<string, string>  = {}
  for (const b of rangeBookings) {
    if (!b.client_id || cancelValues.includes(b.status)) continue
    clientSessionCount[b.client_id] = (clientSessionCount[b.client_id] ?? 0) + 1
    const d = b.session_date?.slice(0, 10) ?? ''
    if (!clientLastSession[b.client_id] || d > clientLastSession[b.client_id]) clientLastSession[b.client_id] = d
  }
  const clientMap: Record<string, string> = {}
  for (const c of allClients) clientMap[c.client_id] = c.full_name
  const topClients = Object.entries(clientSessionCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cid, count]) => ({
      client_id: cid, name: clientMap[cid] ?? '—',
      sessions: count, lastSession: clientLastSession[cid] ?? null,
    }))

  // ── STAFF computations ────────────────────────────────────────────────────
  const staffMap: Record<string, { name: string; role: string | null }> = {}
  for (const s of allStaff) staffMap[s.staff_id] = { name: s.full_name, role: s.role ?? null }

  // Filter booking_staff to range (via booking session_date)
  const rangeBookingIds = new Set(rangeBookings.map(b => b.booking_id))
  const rangeBookingStaff = bookingStaff.filter(bs => rangeBookingIds.has(bs.booking_id))

  const staffSessionMap: Record<string, Record<string, number>> = {}
  for (const bs of rangeBookingStaff) {
    if (!staffSessionMap[bs.staff_id]) staffSessionMap[bs.staff_id] = {}
    staffSessionMap[bs.staff_id][bs.role] = (staffSessionMap[bs.staff_id][bs.role] ?? 0) + 1
  }
  const staffSessions = Object.entries(staffSessionMap).map(([staffId, roles]) => {
    const total = Object.values(roles).reduce((s, n) => s + n, 0)
    return {
      staff_id: staffId,
      name:     staffMap[staffId]?.name ?? '—',
      role:     staffMap[staffId]?.role ?? null,
      total,
      asPhotographer:  roles['photographer']   ?? 0,
      asEditor:        roles['editor']         ?? 0,
      asVideographer:  roles['videographer']   ?? 0,
      asVideoEditor:   roles['video_editor']   ?? 0,
      asColourGrader:  roles['colour_grader']  ?? 0,
    }
  }).sort((a, b) => b.total - a.total)

  // Attendance in range
  const staffAttendance = allStaff.map(s => {
    const myCheckins = checkins.filter(c => c.staff_id === s.staff_id)
    const daysPresent = myCheckins.length
    const totalMinutes = myCheckins.reduce((sum, c) => {
      if (!c.checked_out_at) return sum
      const inMs  = new Date(c.checked_in_at).getTime()
      const outMs = new Date(c.checked_out_at).getTime()
      return sum + (outMs - inMs) / 60000
    }, 0)
    return { staff_id: s.staff_id, name: s.full_name, daysPresent, totalHours: Math.round(totalMinutes / 60) }
  }).filter(s => s.daysPresent > 0).sort((a, b) => b.daysPresent - a.daysPresent)

  // ── PACKAGES computations ─────────────────────────────────────────────────
  const packageBookingCount: Record<string, number> = {}
  let noPackageCount = 0
  for (const b of rangeBookings) {
    if (cancelValues.includes(b.status)) continue
    if (!b.package_id) { noPackageCount++; continue }
    packageBookingCount[b.package_id] = (packageBookingCount[b.package_id] ?? 0) + 1
  }
  const packageStats = allPackages
    .map(p => ({ package_id: p.package_id, name: p.name, bookings: packageBookingCount[p.package_id] ?? 0 }))
    .sort((a, b) => b.bookings - a.bookings)

  // ── KPI summary ───────────────────────────────────────────────────────────
  const sessionsInRange = rangeBookings.filter(b => !cancelValues.includes(b.status)).length
  const todayLabel      = now.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const props: ReportsViewProps = {
    activeRange, activeTab: tab, finFrom, finTo, todayISO, todayLabel,
    config: {
      bookingStatuses: config.bookingStatuses,
      sessionTypes:    config.sessionTypes,
      serviceTypes:    config.serviceTypes,
    },
    // Revenue
    revenueInRange, revenueAllTime, revenueThisMonth, revenueLastMonth,
    outstanding, overdue,
    paymentsByMethod,
    revenueBySessionType,
    revenueByServiceType,
    monthlyRevenue,
    // Sessions
    sessionsInRange,
    todayBookings: todayBookings.map(b => ({
      booking_id: b.booking_id, booking_ref: b.booking_ref ?? null,
      session_date: b.session_date ?? null, status: b.status,
      session_type: b.session_type ?? null, shoot_type: b.shoot_type ?? null,
      service_type: b.service_type ?? null,
      client_name: b.clients?.full_name ?? null, package_name: b.packages?.name ?? null,
    })),
    sessionsThisWeek: weekBookings.length,
    cancelledInRange, completedInRange,
    sessionsByType, sessionsByService, sessionsByCategory,
    monthlySessionCounts,
    upcomingBookings: upcomingBookings.map(b => ({
      booking_id: b.booking_id, booking_ref: b.booking_ref ?? null,
      session_date: b.session_date ?? null, status: b.status,
      session_type: b.session_type ?? null, shoot_type: b.shoot_type ?? null,
      service_type: b.service_type ?? null,
      client_name: b.clients?.full_name ?? null, package_name: b.packages?.name ?? null,
    })),
    weekStrip,
    // Pipeline
    pipelineByStatus,
    noInvoiceCount, noContractCount,
    // Clients
    totalClients, newClientsInRange: newInRange, returningClientsInRange: returningInRange,
    topClients,
    // Staff
    staffSessions, staffAttendance,
    // Packages
    packageStats, noPackageCount,
  }

  return <ReportsView {...props} />
}
