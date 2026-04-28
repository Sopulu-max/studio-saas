import { redirect } from 'next/navigation'
import { getStudioContext, fetchStudio } from '@/lib/studio'
import { buildStudioConfig } from '@/lib/studio-config'
import DashboardWidgets from './dashboard-widgets'
import type { DashboardProps } from './dashboard-widgets'

const DAY_NAMES = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']

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
  const in3DaysEnd = `${new Date(now.getTime() + 3 * 86_400_000).toISOString().slice(0, 10)}T23:59:59`
  const todayLabel = now.toLocaleDateString('en-NG', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const todayDay   = DAY_NAMES[now.getDay()]

  // ── Status configuration ──────────────────────────────────────────────────────
  const activeStatuses = config.bookingStatuses
    .filter(s => !s.is_terminal && !s.is_cancellation)
    .sort((a, b) => a.order - b.order)

  const pendingStatus = activeStatuses[0]?.value ?? 'pending_confirmation'

  // Build the SQL NOT IN list for terminal + cancelled statuses
  const excludeIn = config.bookingStatuses
    .filter(s => s.is_cancellation || s.is_terminal)
    .map(s => `"${s.value}"`).join(',') || '"__none__"'

  // ── All queries in parallel ───────────────────────────────────────────────────
  const [
    { count: pendingCount },
    { count: overdueCount },
    { data: todayRaw },
    { data: next3Raw },
    { data: pipelineRaw },
    { data: allStaff },
    { data: todayCheckins },
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

    // Today's sessions
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, session_type, shoot_type, status, clients(full_name), packages(name)')
      .eq('studio_id', studioId)
      .gte('session_date', todayStr)
      .lte('session_date', todayEnd)
      .not('status', 'in', `(${excludeIn})`)
      .order('session_date', { ascending: true }),

    // Next 3 days (tomorrow → +3)
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, session_type, shoot_type, status, clients(full_name)')
      .eq('studio_id', studioId)
      .gt('session_date', todayEnd)
      .lte('session_date', in3DaysEnd)
      .not('status', 'in', `(${excludeIn})`)
      .order('session_date', { ascending: true }),

    // Full active pipeline — all non-terminal, non-cancelled (no date cap)
    admin.from('bookings')
      .select('booking_id, booking_ref, session_date, session_type, status, clients(full_name)')
      .eq('studio_id', studioId)
      .not('status', 'in', `(${excludeIn})`)
      .order('session_date', { ascending: false })
      .limit(80),

    // Staff list
    admin.from('staff')
      .select('staff_id, full_name, role, roles, working_days')
      .eq('studio_id', studioId)
      .order('full_name'),

    // Today's check-ins
    admin.from('staff_checkins')
      .select('staff_id, checked_in_at, checked_out_at')
      .eq('studio_id', studioId)
      .eq('date', todayStr),
  ])

  // ── Types ─────────────────────────────────────────────────────────────────────
  type SessionRow = {
    booking_id: string; booking_ref?: number | null
    session_date?: string | null; session_type?: string | null
    shoot_type?: string | null; status: string
    clients?: { full_name?: string | null } | null
    packages?: { name?: string | null } | null
  }
  type StaffRow    = { staff_id: string; full_name: string; role: string | null; roles: string[] | null; working_days: string[] | null }
  type CheckinRow  = { staff_id: string; checked_in_at: string; checked_out_at: string | null }

  const todaySessions    = (todayRaw      ?? []) as unknown as SessionRow[]
  const next3Sessions    = (next3Raw      ?? []) as unknown as SessionRow[]
  const pipelineSessions = (pipelineRaw   ?? []) as unknown as SessionRow[]
  const typedStaff       = (allStaff      ?? []) as unknown as StaffRow[]
  const typedCheckins    = (todayCheckins ?? []) as unknown as CheckinRow[]

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
    statusStyles,
    sessionTypeStyles,
  }

  return <DashboardWidgets {...props} />
}
